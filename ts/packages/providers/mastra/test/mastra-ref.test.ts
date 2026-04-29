/**
 * Integration test for the Mastra provider against the **real**
 * `@mastra/schema-compat` package (no `vi.mock` for it). This is the regression
 * test for [PLEN-2244]: a Composio tool whose `inputParameters` carry a `$ref`
 * (legal under both Draft 7 and 2020-12).
 *
 * Without dereferencing, `applyCompatLayer` silently *degrades* the `$ref`-typed
 * property to a permissive `anyOf` of all primitives — losing the type
 * information from `$defs`. This test asserts the post-wrap `inputSchema`
 * preserves the structure described by `$defs`, which is only possible if
 * `$ref` is resolved before the conversion.
 *
 * Vitest mock scoping is per-file by default, so the top-level `vi.mock` for
 * `@mastra/schema-compat` in `mastra.test.ts` does **not** leak into this file.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Tool } from '@composio/core';
import { MastraProvider } from '../src';

const containsRef = (value: unknown): boolean => {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsRef);
  if ('$ref' in (value as Record<string, unknown>)) return true;
  return Object.values(value as Record<string, unknown>).some(containsRef);
};

const findProperty = (schema: unknown, key: string): Record<string, unknown> | undefined => {
  if (schema === null || typeof schema !== 'object') return undefined;
  const node = schema as Record<string, unknown>;
  if (node.properties && typeof node.properties === 'object') {
    const props = node.properties as Record<string, unknown>;
    if (key in props) return props[key] as Record<string, unknown>;
    for (const value of Object.values(props)) {
      const found = findProperty(value, key);
      if (found) return found;
    }
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findProperty(item, key);
        if (found) return found;
      }
    } else if (typeof value === 'object' && value !== null) {
      const found = findProperty(value, key);
      if (found) return found;
    }
  }
  return undefined;
};

const refTool: Tool = {
  slug: 'PLEN_2244_TOOL',
  name: 'PLEN-2244 Tool',
  description: 'Tool whose schema carries internal $ref pointers',
  toolkit: { slug: 'plen2244', name: 'PLEN 2244' },
  version: '20260430_00',
  availableVersions: ['20260430_00'],
  tags: [],
  inputParameters: {
    type: 'object',
    properties: { user: { $ref: '#/$defs/User' } as never },
    required: ['user'],
    $defs: {
      User: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  } as unknown as Tool['inputParameters'],
  outputParameters: {
    type: 'object',
    properties: { item: { $ref: '#/definitions/Item' } as never },
    definitions: {
      Item: {
        type: 'object',
        properties: { sku: { type: 'string' } },
        required: ['sku'],
      },
    },
  } as unknown as Tool['outputParameters'],
};

describe('MastraProvider regression: PLEN-2244 ($ref in JSON Schema)', () => {
  it('does not throw when wrapping a tool whose schema uses $ref / $defs', () => {
    const provider = new MastraProvider();
    const executeToolFn = vi.fn().mockResolvedValue({ data: {}, error: null, successful: true });
    provider._setExecuteToolFn(executeToolFn);

    expect(() => provider.wrapTool(refTool, executeToolFn)).not.toThrow();
  });

  it('preserves type information from $defs (does not degrade $ref to permissive anyOf)', () => {
    const provider = new MastraProvider();
    const executeToolFn = vi.fn().mockResolvedValue({ data: {}, error: null, successful: true });
    provider._setExecuteToolFn(executeToolFn);

    const wrapped = provider.wrapTool(refTool, executeToolFn) as { inputSchema: unknown };

    // Without the dereference step, `$ref` is silently dropped during
    // JSON-Schema → Zod → JSON-Schema round-trip and the `id` field disappears
    // entirely (the property gets degraded to a permissive `anyOf`).
    const idProp = findProperty(wrapped.inputSchema, 'id');
    expect(idProp).toBeDefined();
    expect(idProp?.type).toBe('string');
  });

  it('preserves type information from `definitions` on outputParameters (Draft 7)', () => {
    const provider = new MastraProvider();
    const executeToolFn = vi.fn().mockResolvedValue({ data: {}, error: null, successful: true });
    provider._setExecuteToolFn(executeToolFn);

    const wrapped = provider.wrapTool(refTool, executeToolFn) as { outputSchema: unknown };

    const skuProp = findProperty(wrapped.outputSchema, 'sku');
    expect(skuProp).toBeDefined();
    expect(skuProp?.type).toBe('string');
  });

  it('does not leave any $ref in the produced schemas', () => {
    const provider = new MastraProvider();
    const executeToolFn = vi.fn().mockResolvedValue({ data: {}, error: null, successful: true });
    provider._setExecuteToolFn(executeToolFn);

    const wrapped = provider.wrapTool(refTool, executeToolFn) as {
      inputSchema: unknown;
      outputSchema: unknown;
    };

    expect(containsRef(wrapped.inputSchema)).toBe(false);
    expect(containsRef(wrapped.outputSchema)).toBe(false);
  });
});
