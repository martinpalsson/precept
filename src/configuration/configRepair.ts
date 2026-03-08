/**
 * Config repair for Precept
 *
 * Detects missing fields in precept.json and offers to add them
 * with default values.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Expected fields and their default values for precept.json.
 * When a field is missing, migration will offer to add it.
 */
const EXPECTED_FIELDS: Record<string, unknown> = {
  headingStyles: [
    { char: '#', overline: true },
    { char: '*', overline: true },
    { char: '=', overline: false },
    { char: '-', overline: false },
    { char: '^', overline: false },
    { char: '"', overline: false },
  ],
};

/**
 * Find which expected fields are missing from the config.
 */
export function findMissingFields(rawJson: Record<string, unknown>): string[] {
  return Object.keys(EXPECTED_FIELDS).filter(key => !(key in rawJson));
}

/**
 * Check whether the config has missing fields that should be added.
 */
export function needsRepair(rawJson: Record<string, unknown>): boolean {
  return findMissingFields(rawJson).length > 0;
}

/**
 * Add missing fields to the config with default values.
 * Returns a new object — the original is not mutated.
 */
export function repairConfig(rawJson: Record<string, unknown>): Record<string, unknown> {
  const result = { ...rawJson };
  for (const [key, defaultValue] of Object.entries(EXPECTED_FIELDS)) {
    if (!(key in result)) {
      result[key] = defaultValue;
    }
  }
  return result;
}

/**
 * Write updated config back to disk.
 */
export async function writeConfigFile(
  filePath: string,
  rawJson: Record<string, unknown>
): Promise<void> {
  const content = JSON.stringify(rawJson, null, 2) + '\n';
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

/**
 * Prompt the user to add missing fields to their precept.json.
 */
export async function promptRepair(
  rawJson: Record<string, unknown>
): Promise<'repair' | 'dismiss'> {
  const missing = findMissingFields(rawJson);
  const detail = missing.map(key => `• Add "${key}" with default values`).join('\n');

  const repair = 'Add Missing Fields';
  const choice = await vscode.window.showInformationMessage(
    `Precept: Your precept.json is missing ${missing.length === 1 ? 'a configuration field' : `${missing.length} configuration fields`}.`,
    { modal: true, detail },
    repair
  );

  return choice === repair ? 'repair' : 'dismiss';
}
