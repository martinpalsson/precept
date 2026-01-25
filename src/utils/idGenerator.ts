/**
 * ID Generator - Auto-increment requirement IDs
 *
 * IDs are now semantically neutral (e.g., 0001, 0002 or REQ-0001, REQ-0002)
 * and project-globally unique. The format is controlled by IdConfig.
 */

import { RequirementObject, IdConfig } from '../types';
import { formatId, parseIdNumber } from '../configuration/defaults';

/**
 * Extract numeric part from an ID based on IdConfig
 */
export function extractNumber(id: string, idConfig: IdConfig): number | null {
  return parseIdNumber(idConfig, id);
}

/**
 * Format number with leading zeros according to IdConfig
 */
function formatNumber(num: number, padding: number): string {
  return num.toString().padStart(padding, '0');
}

/**
 * Generate the next available ID based on existing requirements
 * IDs are now project-global and independent of type/level
 */
export function generateNextId(
  idConfig: IdConfig,
  existingRequirements: RequirementObject[]
): string {
  if (existingRequirements.length === 0) {
    // No existing IDs, start with configured start value
    return formatId(idConfig, idConfig.start);
  }

  // Find the highest number across all IDs
  let maxNum = 0;

  for (const req of existingRequirements) {
    const num = parseIdNumber(idConfig, req.id);
    if (num !== null && num > maxNum) {
      maxNum = num;
    }
  }

  // Generate next ID
  const nextNum = Math.max(maxNum + 1, idConfig.start);
  return formatId(idConfig, nextNum);
}

/**
 * Check if an ID is valid according to the IdConfig pattern
 */
export function isValidId(id: string, idConfig: IdConfig): boolean {
  const num = parseIdNumber(idConfig, id);
  return num !== null && num > 0;
}

/**
 * Parse an ID to extract its numeric component
 */
export function parseId(id: string, idConfig: IdConfig): { number: number } | null {
  const num = parseIdNumber(idConfig, id);
  if (num !== null) {
    return { number: num };
  }
  return null;
}

/**
 * Get all IDs sorted numerically
 */
export function getIdsSorted(
  idConfig: IdConfig,
  requirements: RequirementObject[]
): string[] {
  return requirements
    .map(r => r.id)
    .sort((a, b) => {
      const numA = parseIdNumber(idConfig, a) || 0;
      const numB = parseIdNumber(idConfig, b) || 0;
      return numA - numB;
    });
}

/**
 * Get all IDs for a specific level, sorted numerically
 */
export function getIdsByLevel(
  level: string,
  idConfig: IdConfig,
  requirements: RequirementObject[]
): string[] {
  return requirements
    .filter(r => r.level === level)
    .map(r => r.id)
    .sort((a, b) => {
      const numA = parseIdNumber(idConfig, a) || 0;
      const numB = parseIdNumber(idConfig, b) || 0;
      return numA - numB;
    });
}

/**
 * Find gaps in ID sequence
 */
export function findIdGaps(
  idConfig: IdConfig,
  requirements: RequirementObject[]
): number[] {
  const numbers = requirements
    .map(r => parseIdNumber(idConfig, r.id))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  if (numbers.length === 0) {
    return [];
  }

  const gaps: number[] = [];
  let expected = idConfig.start;

  for (const num of numbers) {
    while (expected < num) {
      gaps.push(expected);
      expected++;
    }
    expected = num + 1;
  }

  return gaps;
}

/**
 * Suggest next ID, optionally filling gaps
 */
export function suggestNextId(
  idConfig: IdConfig,
  requirements: RequirementObject[],
  fillGaps: boolean = false
): string {
  if (fillGaps) {
    const gaps = findIdGaps(idConfig, requirements);
    if (gaps.length > 0) {
      return formatId(idConfig, gaps[0]);
    }
  }

  return generateNextId(idConfig, requirements);
}

/**
 * Check if an ID already exists
 */
export function idExists(
  id: string,
  requirements: RequirementObject[]
): boolean {
  return requirements.some(r => r.id === id);
}

/**
 * Generate a unique ID, avoiding conflicts
 */
export function generateUniqueId(
  idConfig: IdConfig,
  requirements: RequirementObject[]
): string {
  let nextId = generateNextId(idConfig, requirements);

  // Safety check - ensure no collision (should not happen normally)
  while (idExists(nextId, requirements)) {
    const num = parseIdNumber(idConfig, nextId);
    if (num !== null) {
      nextId = formatId(idConfig, num + 1);
    } else {
      break;
    }
  }

  return nextId;
}
