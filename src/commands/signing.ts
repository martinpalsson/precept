/**
 * Signing Commands - GPG signing and verification for requirements
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { IndexBuilder } from '../indexing/indexBuilder';
import { PreceptConfig, RequirementObject } from '../types';
import { computeContentHash } from '../signing/canonicalHash';
import { signData, verifySignature, listSecretKeys, isGpgAvailable, GpgKey } from '../signing/gpgWrapper';
import { parseRequirementAtLine } from '../indexing/rstParser';

/** Cached key selection for the current session */
let cachedKeyId: string | undefined;

/**
 * Prompt user to select a GPG key for signing.
 */
async function selectKey(config: PreceptConfig): Promise<string | undefined> {
  const gpgPath = config.signing?.gpgPath || 'gpg';

  // Use configured default if set
  if (config.signing?.defaultKeyId) {
    return config.signing.defaultKeyId;
  }

  // Use cached selection
  if (cachedKeyId) {
    return cachedKeyId;
  }

  let keys: GpgKey[];
  try {
    keys = await listSecretKeys(gpgPath);
  } catch {
    vscode.window.showErrorMessage(
      'Failed to list GPG keys. Make sure GPG is installed and configured.'
    );
    return undefined;
  }

  if (keys.length === 0) {
    vscode.window.showErrorMessage('No GPG secret keys found. Generate one with `gpg --gen-key`.');
    return undefined;
  }

  if (keys.length === 1) {
    cachedKeyId = keys[0].keyId;
    return cachedKeyId;
  }

  const items = keys.map(k => ({
    label: k.uid || k.keyId,
    description: k.keyId,
    keyId: k.keyId,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select GPG key for signing',
  });

  if (selected) {
    cachedKeyId = selected.keyId;
    return cachedKeyId;
  }

  return undefined;
}

/**
 * Strip PGP armor headers to produce a compact single-line signature.
 */
function compactSignature(armoredSig: string): string {
  const lines = armoredSig.split('\n');
  const sigLines: string[] = [];
  let inBody = false;

  for (const line of lines) {
    if (line.startsWith('-----BEGIN')) {
      inBody = true;
      continue;
    }
    if (line.startsWith('-----END')) {
      break;
    }
    if (inBody && line.trim() === '') {
      // Skip the blank line after headers
      continue;
    }
    if (inBody && !line.includes(':')) {
      // Skip armor header lines (e.g., "Hash: SHA256")
      sigLines.push(line.trim());
    }
  }

  return sigLines.join('');
}

/**
 * Reconstruct armored signature from compact form for GPG verification.
 */
function expandSignature(compact: string): string {
  // Split into 76-char lines (PGP standard)
  const lines: string[] = [];
  for (let i = 0; i < compact.length; i += 76) {
    lines.push(compact.substring(i, i + 76));
  }

  return [
    '-----BEGIN PGP SIGNATURE-----',
    '',
    ...lines,
    '-----END PGP SIGNATURE-----',
  ].join('\n');
}

/**
 * Write or update signature fields on a requirement in an RST file.
 */
async function writeSignatureToFile(
  filePath: string,
  reqId: string,
  signature: string,
  signedBy: string,
  signedDate: string,
  signedHash: string,
): Promise<boolean> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let inReq = false;
    let reqIndent = 0;
    let foundId = false;
    let lastOptionLine = -1;

    // Track which signature fields already exist (for update vs insert)
    const existingFields = new Map<string, number>(); // field name -> line index

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for directive start
      const directiveMatch = line.match(/^(\s*)\.\.\s+\w+::/);
      if (directiveMatch) {
        if (foundId) {
          // We've passed the target requirement, write the fields
          break;
        }
        inReq = true;
        reqIndent = directiveMatch[1].length;
        foundId = false;
        lastOptionLine = i;
        existingFields.clear();
        continue;
      }

      if (inReq) {
        const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;

        // Check if we've left the directive
        if (line.trim() && currentIndent <= reqIndent && !line.match(/^\s+:/)) {
          if (foundId) {
            break;
          }
          inReq = false;
          continue;
        }

        // Check for :id: option
        const idMatch = line.match(/:id:\s*(\S+)/);
        if (idMatch && idMatch[1] === reqId) {
          foundId = true;
          lastOptionLine = i;
        }

        // Track option lines
        if (line.match(/^\s+:\w+:/)) {
          lastOptionLine = i;

          if (foundId) {
            // Check for existing signature fields
            if (line.match(/^\s+:signature:/)) {
              existingFields.set('signature', i);
            } else if (line.match(/^\s+:signed_by:/)) {
              existingFields.set('signed_by', i);
            } else if (line.match(/^\s+:signed_date:/)) {
              existingFields.set('signed_date', i);
            } else if (line.match(/^\s+:signed_hash:/)) {
              existingFields.set('signed_hash', i);
            }
          }
        }
      }
    }

    if (!foundId) {
      return false;
    }

    const indent = ' '.repeat(reqIndent + 3);

    // Update existing fields or insert new ones
    // Process in reverse order to avoid index shifts
    const fieldsToWrite = [
      { name: 'signed_hash', value: signedHash },
      { name: 'signed_date', value: signedDate },
      { name: 'signed_by', value: signedBy },
      { name: 'signature', value: signature },
    ];

    for (const field of fieldsToWrite) {
      const existingLine = existingFields.get(field.name);
      if (existingLine !== undefined) {
        lines[existingLine] = `${indent}:${field.name}: ${field.value}`;
      }
    }

    // Insert any fields that don't exist yet (after the last option line)
    const newFields = fieldsToWrite.filter(f => !existingFields.has(f.name)).reverse();
    for (const field of newFields) {
      lines.splice(lastOptionLine + 1, 0, `${indent}:${field.name}: ${field.value}`);
    }

    await fs.promises.writeFile(filePath, lines.join('\n'), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing signature to ${filePath}:`, error);
    return false;
  }
}

/**
 * Sign a single requirement.
 */
async function signRequirement(
  req: RequirementObject,
  keyId: string,
  config: PreceptConfig,
): Promise<boolean> {
  const gpgPath = config.signing?.gpgPath || 'gpg';
  const contentHash = computeContentHash(req);

  let armoredSig: string;
  try {
    armoredSig = await signData(contentHash, keyId, gpgPath);
  } catch (error) {
    vscode.window.showErrorMessage(
      `GPG signing failed for ${req.id}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }

  const compact = compactSignature(armoredSig);
  const signedDate = new Date().toISOString().slice(0, 10);

  // Get signer info from GPG key: "Name <email> (key ID)"
  let signedBy = keyId;
  try {
    const keys = await listSecretKeys(gpgPath);
    const normalizedKeyId = keyId.replace(/^0x/i, '');
    const key = keys.find(k => k.keyId === normalizedKeyId || k.keyId.endsWith(normalizedKeyId));
    if (key) {
      const resolvedKeyId = key.keyId;
      signedBy = key.uid ? `${key.uid} (${resolvedKeyId})` : resolvedKeyId;
    }
  } catch {
    // Use keyId as fallback
  }

  return writeSignatureToFile(
    req.location.file,
    req.id,
    compact,
    signedBy,
    signedDate,
    contentHash,
  );
}

export interface SigningCommandManager {
  updateConfig(config: PreceptConfig): void;
}

/**
 * Register all signing commands.
 */
export function registerSigningCommands(
  context: vscode.ExtensionContext,
  indexBuilder: IndexBuilder,
  config: PreceptConfig,
): SigningCommandManager {
  let currentConfig = config;

  // Sign single requirement
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.signItem', async () => {
      if (!currentConfig.signing?.enabled) {
        vscode.window.showWarningMessage(
          'Signing is not enabled. Add `"signing": { "enabled": true }` to precept.json.'
        );
        return;
      }

      const gpgPath = currentConfig.signing.gpgPath || 'gpg';
      if (!await isGpgAvailable(gpgPath)) {
        vscode.window.showErrorMessage(`GPG not found at '${gpgPath}'. Install GPG or update signing.gpgPath in precept.json.`);
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'restructuredtext') {
        vscode.window.showWarningMessage('Open an RST file and place the cursor on a requirement.');
        return;
      }

      const lineNumber = editor.selection.active.line + 1;
      const req = parseRequirementAtLine(
        editor.document.getText(),
        editor.document.uri.fsPath,
        lineNumber,
        currentConfig,
      );

      if (!req) {
        vscode.window.showWarningMessage('No requirement found at cursor position.');
        return;
      }

      const keyId = await selectKey(currentConfig);
      if (!keyId) {
        return;
      }

      const success = await signRequirement(req, keyId, currentConfig);
      if (success) {
        vscode.window.showInformationMessage(`Signed requirement ${req.id}`);
        indexBuilder.scheduleFileUpdate(req.location.file);
      }
    })
  );

  // Sign batch of requirements
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.signBatch', async () => {
      if (!currentConfig.signing?.enabled) {
        vscode.window.showWarningMessage(
          'Signing is not enabled. Add `"signing": { "enabled": true }` to precept.json.'
        );
        return;
      }

      const gpgPath = currentConfig.signing.gpgPath || 'gpg';
      if (!await isGpgAvailable(gpgPath)) {
        vscode.window.showErrorMessage(`GPG not found at '${gpgPath}'.`);
        return;
      }

      const allReqs = indexBuilder.getAllRequirements();
      if (allReqs.length === 0) {
        vscode.window.showInformationMessage('No requirements found.');
        return;
      }

      // Filter options
      const filterChoice = await vscode.window.showQuickPick([
        { label: 'All requirements', value: 'all' },
        { label: 'Unsigned only', value: 'unsigned' },
        { label: 'By status...', value: 'status' },
      ], {
        placeHolder: 'Which requirements to sign?',
      });

      if (!filterChoice) {
        return;
      }

      let toSign: RequirementObject[];

      if (filterChoice.value === 'all') {
        toSign = allReqs;
      } else if (filterChoice.value === 'unsigned') {
        toSign = allReqs.filter(r => !r.signature);
      } else {
        const statuses = [...new Set(allReqs.map(r => r.status).filter(Boolean))] as string[];
        const statusChoice = await vscode.window.showQuickPick(statuses, {
          placeHolder: 'Select status to sign',
        });
        if (!statusChoice) {
          return;
        }
        toSign = allReqs.filter(r => r.status === statusChoice);
      }

      if (toSign.length === 0) {
        vscode.window.showInformationMessage('No requirements match the filter.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Sign ${toSign.length} requirement(s)?`,
        'Yes',
        'No',
      );
      if (confirm !== 'Yes') {
        return;
      }

      const keyId = await selectKey(currentConfig);
      if (!keyId) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Signing requirements...',
          cancellable: false,
        },
        async (progress) => {
          let signed = 0;
          const total = toSign.length;
          const affectedFiles = new Set<string>();

          for (const req of toSign) {
            const success = await signRequirement(req, keyId, currentConfig);
            if (success) {
              signed++;
              affectedFiles.add(req.location.file);
            }
            progress.report({
              message: `Signed ${signed}/${total}`,
              increment: (1 / total) * 100,
            });
          }

          // Trigger re-index for affected files
          for (const file of affectedFiles) {
            indexBuilder.scheduleFileUpdate(file);
          }

          vscode.window.showInformationMessage(`Signed ${signed} of ${total} requirements.`);
        }
      );
    })
  );

  // Verify single requirement
  context.subscriptions.push(
    vscode.commands.registerCommand('requirements.verifyItem', async () => {
      if (!currentConfig.signing?.enabled) {
        vscode.window.showWarningMessage(
          'Signing is not enabled. Add `"signing": { "enabled": true }` to precept.json.'
        );
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'restructuredtext') {
        vscode.window.showWarningMessage('Open an RST file and place the cursor on a requirement.');
        return;
      }

      const lineNumber = editor.selection.active.line + 1;
      const req = parseRequirementAtLine(
        editor.document.getText(),
        editor.document.uri.fsPath,
        lineNumber,
        currentConfig,
      );

      if (!req) {
        vscode.window.showWarningMessage('No requirement found at cursor position.');
        return;
      }

      if (!req.signature) {
        vscode.window.showInformationMessage(`Requirement ${req.id} is not signed.`);
        return;
      }

      // Quick staleness check via hash
      const currentHash = computeContentHash(req);
      if (req.signedHash && req.signedHash !== currentHash) {
        vscode.window.showWarningMessage(
          `Requirement ${req.id} has been modified since signing by ${req.signedBy || 'unknown'} on ${req.signedDate || 'unknown date'}.`
        );
        return;
      }

      // Full GPG verification
      const gpgPath = currentConfig.signing?.gpgPath || 'gpg';
      if (!await isGpgAvailable(gpgPath)) {
        // Fall back to hash-only check
        vscode.window.showInformationMessage(
          `Requirement ${req.id}: content hash matches signature (GPG not available for identity verification). Signed by ${req.signedBy || 'unknown'} on ${req.signedDate || 'unknown'}.`
        );
        return;
      }

      try {
        const armoredSig = expandSignature(req.signature);
        const result = await verifySignature(currentHash, armoredSig, gpgPath);

        if (result.valid) {
          vscode.window.showInformationMessage(
            `Requirement ${req.id}: valid signature by ${result.signedBy} (${result.keyId})`
          );
        } else {
          vscode.window.showWarningMessage(
            `Requirement ${req.id}: GPG signature verification failed.`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Verification failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  return {
    updateConfig(newConfig: PreceptConfig): void {
      currentConfig = newConfig;
      cachedKeyId = undefined;
    },
  };
}
