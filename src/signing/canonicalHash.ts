/**
 * Canonical hashing for requirement signing
 *
 * Produces a deterministic string from a requirement's semantic fields,
 * then SHA-256 hashes it. The canonical form is independent of field order,
 * whitespace formatting, and non-semantic metadata.
 */

import * as crypto from 'crypto';
import { RequirementObject } from '../types';

/** Fields excluded from the canonical hash (signing metadata + operational fields) */
const EXCLUDED_METADATA_KEYS = new Set([
  'signature',
  'signed_by',
  'signed_date',
]);

/**
 * Build a deterministic canonical string from a requirement's semantic content.
 *
 * Included: id, type, level, title, description (normalized), status, links (sorted),
 *           metadata keys (sorted, excluding signature fields).
 * Excluded: signature, signed_by, signed_date, baseline.
 */
export function canonicalize(req: RequirementObject): string {
  const parts: string[] = [];

  // Core fields — always present
  parts.push(`id:${req.id}`);
  parts.push(`type:${req.type}`);

  if (req.level) {
    parts.push(`level:${req.level}`);
  }

  parts.push(`title:${req.title}`);

  // Normalize description: collapse whitespace runs, trim
  const normalizedDesc = (req.description || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  parts.push(`description:${normalizedDesc}`);

  if (req.status) {
    parts.push(`status:${req.status}`);
  }

  // Links — sorted by link type, then sorted IDs within each type
  const linkKeys = Object.keys(req.links).sort();
  for (const key of linkKeys) {
    const ids = [...req.links[key]].sort();
    if (ids.length > 0) {
      parts.push(`link.${key}:${ids.join(',')}`);
    }
  }

  // Metadata — sorted keys, excluding signature fields
  const metaKeys = Object.keys(req.metadata)
    .filter(k => !EXCLUDED_METADATA_KEYS.has(k))
    .sort();
  for (const key of metaKeys) {
    parts.push(`meta.${key}:${req.metadata[key]}`);
  }

  return parts.join('\n');
}

/**
 * Compute the SHA-256 hex digest of a requirement's canonical form.
 */
export function computeContentHash(req: RequirementObject): string {
  const canonical = canonicalize(req);
  return crypto.createHash('sha256').update(canonical, 'utf-8').digest('hex');
}
