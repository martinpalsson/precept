/**
 * GPG CLI wrapper for signing and verification
 *
 * Uses execFile (not exec) to avoid shell injection.
 * GPG handles local keys and hardware tokens (YubiKey) transparently.
 */

import { execFile } from 'child_process';

export interface GpgVerifyResult {
  valid: boolean;
  signedBy: string;
  keyId: string;
}

export interface GpgKey {
  keyId: string;
  uid: string;
}

/**
 * Create a detached ASCII-armored GPG signature for the given data.
 *
 * @param data The data to sign (typically a content hash)
 * @param keyId Optional GPG key ID / fingerprint to use
 * @param gpgPath Path to the gpg binary (default: 'gpg')
 * @returns ASCII-armored detached signature
 */
export function signData(
  data: string,
  keyId?: string,
  gpgPath: string = 'gpg',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['--detach-sign', '--armor', '--batch', '--yes'];
    if (keyId) {
      args.push('--local-user', keyId);
    }
    args.push('-');

    const proc = execFile(gpgPath, args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`GPG sign failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout.trim());
    });

    proc.stdin?.write(data);
    proc.stdin?.end();
  });
}

/**
 * Verify a detached ASCII-armored GPG signature against data.
 *
 * @param data The original signed data
 * @param signature The ASCII-armored detached signature
 * @param gpgPath Path to the gpg binary (default: 'gpg')
 * @returns Verification result
 */
export function verifySignature(
  data: string,
  signature: string,
  gpgPath: string = 'gpg',
): Promise<GpgVerifyResult> {
  return new Promise((resolve, reject) => {
    // GPG --verify needs the signature as a file and data on stdin.
    // Use process substitution workaround: write sig to a temp fd via --status-fd.
    // Simpler approach: use gpg --verify with sig from stdin and data from a named arg.
    // Actually, the cleanest way is: write both to temp files or use --verify - approach.
    //
    // GPG supports: gpg --verify <sig-file> <data-file>
    // For piping, we use a two-step approach with status-fd parsing.

    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    // Write signature to a temp file (GPG requires it as a file argument)
    const tmpDir = os.tmpdir();
    const sigFile = path.join(tmpDir, `precept-sig-${Date.now()}.asc`);
    const dataFile = path.join(tmpDir, `precept-data-${Date.now()}.txt`);

    try {
      fs.writeFileSync(sigFile, signature, 'utf-8');
      fs.writeFileSync(dataFile, data, 'utf-8');
    } catch (err) {
      reject(new Error(`Failed to write temp files: ${err}`));
      return;
    }

    const args = ['--verify', '--status-fd', '1', '--batch', sigFile, dataFile];

    execFile(gpgPath, args, { timeout: 30_000 }, (error, stdout, stderr) => {
      // Clean up temp files
      try { fs.unlinkSync(sigFile); } catch { /* ignore */ }
      try { fs.unlinkSync(dataFile); } catch { /* ignore */ }

      // GPG returns exit code 0 for good signature, 1 for bad
      const output = stdout + '\n' + stderr;

      const goodSig = output.includes('[GNUPG:] GOODSIG') || output.includes('Good signature');
      const keyIdMatch = output.match(/\[GNUPG:\] GOODSIG\s+(\S+)\s+(.*)/);
      const uidMatch = output.match(/Good signature from "([^"]+)"/);

      if (goodSig) {
        resolve({
          valid: true,
          keyId: keyIdMatch?.[1] || 'unknown',
          signedBy: keyIdMatch?.[2] || uidMatch?.[1] || 'unknown',
        });
      } else {
        resolve({
          valid: false,
          keyId: '',
          signedBy: '',
        });
      }
    });
  });
}

/**
 * List available GPG secret keys for signing.
 *
 * @param gpgPath Path to the gpg binary (default: 'gpg')
 * @returns Array of available keys
 */
export function listSecretKeys(gpgPath: string = 'gpg'): Promise<GpgKey[]> {
  return new Promise((resolve, reject) => {
    const args = ['--list-secret-keys', '--with-colons', '--batch'];

    execFile(gpgPath, args, { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`GPG list keys failed: ${stderr || error.message}`));
        return;
      }

      const keys: GpgKey[] = [];
      const lines = stdout.split('\n');
      let currentKeyId = '';

      for (const line of lines) {
        const fields = line.split(':');
        if (fields[0] === 'sec') {
          currentKeyId = fields[4] || '';
        } else if (fields[0] === 'uid' && currentKeyId) {
          keys.push({
            keyId: currentKeyId,
            uid: fields[9] || '',
          });
        }
      }

      resolve(keys);
    });
  });
}

/**
 * Check if GPG is available on the system.
 *
 * @param gpgPath Path to the gpg binary (default: 'gpg')
 * @returns true if gpg is available
 */
export function isGpgAvailable(gpgPath: string = 'gpg'): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(gpgPath, ['--version'], { timeout: 5_000 }, (error) => {
      resolve(!error);
    });
  });
}
