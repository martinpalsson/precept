/**
 * Tests for canonical hashing
 */

import { canonicalize, computeContentHash } from './canonicalHash';
import { RequirementObject } from '../types';

function makeReq(overrides: Partial<RequirementObject> = {}): RequirementObject {
  return {
    id: 'REQ-001',
    type: 'requirement',
    title: 'Test requirement',
    description: 'A test description',
    status: 'draft',
    links: {},
    metadata: {},
    location: { file: '/test.rst', line: 1 },
    ...overrides,
  };
}

describe('canonicalize', () => {
  it('produces deterministic output for the same requirement', () => {
    const req = makeReq();
    expect(canonicalize(req)).toBe(canonicalize(req));
  });

  it('includes core fields', () => {
    const result = canonicalize(makeReq());
    expect(result).toContain('id:REQ-001');
    expect(result).toContain('type:requirement');
    expect(result).toContain('title:Test requirement');
    expect(result).toContain('description:A test description');
    expect(result).toContain('status:draft');
  });

  it('includes level when present', () => {
    const result = canonicalize(makeReq({ level: 'system' }));
    expect(result).toContain('level:system');
  });

  it('excludes level when not present', () => {
    const result = canonicalize(makeReq());
    expect(result).not.toContain('level:');
  });

  it('sorts links by type and IDs within type', () => {
    const req = makeReq({
      links: {
        satisfies: ['REQ-005', 'REQ-002'],
        links: ['REQ-010', 'REQ-001'],
      },
    });
    const result = canonicalize(req);
    expect(result).toContain('link.links:REQ-001,REQ-010');
    expect(result).toContain('link.satisfies:REQ-002,REQ-005');
    // 'links' should come before 'satisfies' (alphabetical)
    const linksIdx = result.indexOf('link.links');
    const satisfiesIdx = result.indexOf('link.satisfies');
    expect(linksIdx).toBeLessThan(satisfiesIdx);
  });

  it('sorts metadata keys alphabetically', () => {
    const req = makeReq({
      metadata: { priority: 'high', product: 'widget' },
    });
    const result = canonicalize(req);
    expect(result).toContain('meta.priority:high');
    expect(result).toContain('meta.product:widget');
    const prioIdx = result.indexOf('meta.priority');
    const prodIdx = result.indexOf('meta.product');
    expect(prioIdx).toBeLessThan(prodIdx);
  });

  it('excludes signature-related metadata', () => {
    const req = makeReq({
      metadata: {
        signature: 'abc123',
        signed_by: 'someone',
        signed_date: '2026-01-01',
        priority: 'high',
      },
    });
    const result = canonicalize(req);
    expect(result).not.toContain('meta.signature');
    expect(result).not.toContain('meta.signed_by');
    expect(result).not.toContain('meta.signed_date');
    expect(result).toContain('meta.priority:high');
  });

  it('normalizes description whitespace', () => {
    const req1 = makeReq({ description: 'foo   bar\n  baz' });
    const req2 = makeReq({ description: 'foo bar\n baz' });
    expect(canonicalize(req1)).toBe(canonicalize(req2));
  });

  it('normalizes CRLF line endings in description', () => {
    const req1 = makeReq({ description: 'line1\r\nline2' });
    const req2 = makeReq({ description: 'line1\nline2' });
    expect(canonicalize(req1)).toBe(canonicalize(req2));
  });

  it('produces different output for different content', () => {
    const req1 = makeReq({ title: 'Title A' });
    const req2 = makeReq({ title: 'Title B' });
    expect(canonicalize(req1)).not.toBe(canonicalize(req2));
  });

  it('ignores empty link arrays', () => {
    const req = makeReq({ links: { satisfies: [] } });
    const result = canonicalize(req);
    expect(result).not.toContain('link.satisfies');
  });
});

describe('computeContentHash', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = computeContentHash(makeReq());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns same hash for identical requirements', () => {
    const req = makeReq();
    expect(computeContentHash(req)).toBe(computeContentHash(req));
  });

  it('returns different hash for different content', () => {
    const req1 = makeReq({ title: 'Title A' });
    const req2 = makeReq({ title: 'Title B' });
    expect(computeContentHash(req1)).not.toBe(computeContentHash(req2));
  });

  it('is not affected by signature fields on the RequirementObject', () => {
    const req1 = makeReq();
    const req2 = makeReq({
      signature: 'some-sig-data',
      signedBy: 'Jane Doe',
      signedDate: '2026-03-19',
      signedHash: 'abc123',
    });
    // signature/signedBy/signedDate/signedHash are on the object but not in metadata,
    // so they should not affect the canonical form at all
    expect(computeContentHash(req1)).toBe(computeContentHash(req2));
  });
});
