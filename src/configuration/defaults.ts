/**
 * Default configuration when conf.py is not found or parsing fails
 */

import { RigrConfig, ObjectType, Level, IdConfig, LinkType, Status, CustomFields } from '../types';

export const DEFAULT_OBJECT_TYPES: ObjectType[] = [
  {
    type: 'requirement',
    title: 'Requirement',
    color: '#BFD8D2',
    style: 'node',
  },
  {
    type: 'rationale',
    title: 'Rationale',
    color: '#FEDCD2',
    style: 'node',
  },
  {
    type: 'information',
    title: 'Information',
    color: '#DF744A',
    style: 'node',
  },
  {
    type: 'parameter',
    title: 'Parameter',
    color: '#AEDFF7',
    style: 'node',
  },
  {
    type: 'term',
    title: 'Term',
    color: '#98D8AA',
    style: 'node',
  },
  {
    type: 'design_element',
    title: 'Design Element',
    color: '#C8A2C8',
    style: 'node',
  },
];

export const DEFAULT_LEVELS: Level[] = [
  { level: 'stakeholder', title: 'Stakeholder Requirements' },
  { level: 'system', title: 'System Requirements' },
  { level: 'component', title: 'Component Requirements' },
  { level: 'software', title: 'Software Requirements' },
  { level: 'hardware', title: 'Hardware Requirements' },
];

export const DEFAULT_ID_CONFIG: IdConfig = {
  prefix: '',
  separator: '',
  padding: 4,
  start: 1,
};

export const DEFAULT_LINK_TYPES: LinkType[] = [
  {
    option: 'links',
    incoming: 'links',
    outgoing: 'links',
  },
  {
    option: 'satisfies',
    incoming: 'satisfied_by',
    outgoing: 'satisfies',
  },
  {
    option: 'implements',
    incoming: 'implemented_by',
    outgoing: 'implements',
  },
  {
    option: 'derives_from',
    incoming: 'derives_to',
    outgoing: 'derives_from',
  },
  {
    option: 'tests',
    incoming: 'tested_by',
    outgoing: 'tests',
  },
];

export const DEFAULT_STATUSES: Status[] = [
  { status: 'draft', color: '#FFEB3B' },
  { status: 'review', color: '#FF9800' },
  { status: 'approved', color: '#4CAF50' },
  { status: 'implemented', color: '#2196F3' },
];

/**
 * Default custom fields (empty - user defines their own)
 */
export const DEFAULT_CUSTOM_FIELDS: CustomFields = {};

/**
 * Build ID regex from IdConfig
 */
export function buildIdRegex(idConfig: IdConfig): RegExp {
  if (idConfig.prefix) {
    // With prefix: e.g., REQ-0001
    const prefixPattern = idConfig.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const separatorPattern = idConfig.separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${prefixPattern}${separatorPattern}\\d{${idConfig.padding},}`, 'g');
  } else {
    // Without prefix: just numeric, e.g., 0001
    return new RegExp(`\\d{${idConfig.padding},}`, 'g');
  }
}

export const DEFAULT_ID_REGEX = buildIdRegex(DEFAULT_ID_CONFIG);

export const DEFAULT_CONFIG: RigrConfig = {
  objectTypes: DEFAULT_OBJECT_TYPES,
  levels: DEFAULT_LEVELS,
  idConfig: DEFAULT_ID_CONFIG,
  linkTypes: DEFAULT_LINK_TYPES,
  statuses: DEFAULT_STATUSES,
  customFields: DEFAULT_CUSTOM_FIELDS,
  id_regex: DEFAULT_ID_REGEX,
};

/**
 * Get all valid object type values from configuration
 */
export function getObjectTypeValues(config: RigrConfig): string[] {
  return config.objectTypes.map(t => t.type);
}

/**
 * Get all valid level values from configuration
 */
export function getLevelValues(config: RigrConfig): string[] {
  return config.levels.map(l => l.level);
}

/**
 * Get all valid link option names from configuration
 */
export function getLinkOptionNames(config: RigrConfig): string[] {
  const options = new Set<string>();
  for (const link of config.linkTypes) {
    options.add(link.option);
    options.add(link.incoming);
    options.add(link.outgoing);
  }
  return Array.from(options);
}

/**
 * Get all valid status names from configuration
 */
export function getStatusNames(config: RigrConfig): string[] {
  return config.statuses.map(s => s.status);
}

/**
 * Get object type info
 */
export function getObjectTypeInfo(config: RigrConfig, type: string): ObjectType | undefined {
  return config.objectTypes.find(t => t.type === type);
}

/**
 * Get level info
 */
export function getLevelInfo(config: RigrConfig, level: string): Level | undefined {
  return config.levels.find(l => l.level === level);
}

/**
 * Get status info
 */
export function getStatusInfo(config: RigrConfig, status: string): Status | undefined {
  return config.statuses.find(s => s.status === status);
}

/**
 * Get all custom field names from configuration
 */
export function getCustomFieldNames(config: RigrConfig): string[] {
  return Object.keys(config.customFields || {});
}

/**
 * Get valid values for a custom field
 */
export function getCustomFieldValues(config: RigrConfig, fieldName: string): string[] {
  const field = config.customFields?.[fieldName];
  return field ? field.map(v => v.value) : [];
}

/**
 * Format an ID number according to the IdConfig
 */
export function formatId(idConfig: IdConfig, number: number): string {
  const paddedNumber = String(number).padStart(idConfig.padding, '0');
  if (idConfig.prefix) {
    return `${idConfig.prefix}${idConfig.separator}${paddedNumber}`;
  }
  return paddedNumber;
}

/**
 * Parse an ID string to extract the numeric portion
 */
export function parseIdNumber(idConfig: IdConfig, id: string): number | null {
  if (idConfig.prefix) {
    const prefixWithSep = idConfig.prefix + idConfig.separator;
    if (id.startsWith(prefixWithSep)) {
      const numStr = id.slice(prefixWithSep.length);
      const num = parseInt(numStr, 10);
      return isNaN(num) ? null : num;
    }
    return null;
  } else {
    const num = parseInt(id, 10);
    return isNaN(num) ? null : num;
  }
}
