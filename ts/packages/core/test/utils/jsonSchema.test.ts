import { describe, it, expect } from 'vitest';
import { dereferenceJsonSchema } from '../../src/utils/jsonSchema';
import { JsonSchemaRefResolutionError } from '../../src/errors/ValidationErrors';

const containsRef = (value: unknown): boolean => {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsRef);
  if ('$ref' in (value as Record<string, unknown>)) return true;
  return Object.values(value as Record<string, unknown>).some(containsRef);
};

describe('dereferenceJsonSchema', () => {
  it('inlines a single internal $ref under $defs', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: { user: { $ref: '#/$defs/User' } },
      required: ['user'],
      $defs: { User: { type: 'string' } },
    });

    expect(out).toEqual({
      type: 'object',
      properties: { user: { type: 'string' } },
      required: ['user'],
    });
    expect(containsRef(out)).toBe(false);
  });

  it('resolves a chain of refs A -> B -> C', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: { v: { $ref: '#/$defs/A' } },
      $defs: {
        A: { $ref: '#/$defs/B' },
        B: { $ref: '#/$defs/C' },
        C: { type: 'integer' },
      },
    });

    expect(containsRef(out)).toBe(false);
    expect((out as { properties: { v: unknown } }).properties.v).toEqual({ type: 'integer' });
  });

  it('walks containers reflectively (items, oneOf, anyOf, allOf, not, additionalProperties, patternProperties, prefixItems)', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: {
        a: { type: 'array', items: { $ref: '#/$defs/Leaf' } },
        b: { oneOf: [{ $ref: '#/$defs/Leaf' }, { type: 'null' }] },
        c: { anyOf: [{ $ref: '#/$defs/Leaf' }] },
        d: { allOf: [{ $ref: '#/$defs/Leaf' }] },
        e: { not: { $ref: '#/$defs/Leaf' } },
        f: { type: 'object', additionalProperties: { $ref: '#/$defs/Leaf' } },
        g: {
          type: 'object',
          patternProperties: { '^x_': { $ref: '#/$defs/Leaf' } },
        },
        h: { type: 'array', prefixItems: [{ $ref: '#/$defs/Leaf' }] },
      },
      $defs: { Leaf: { type: 'string' } },
    });

    expect(containsRef(out)).toBe(false);
  });

  it('resolves Draft 7 legacy `definitions`', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: { name: { $ref: '#/definitions/Name' } },
      definitions: { Name: { type: 'string', minLength: 1 } },
    });

    expect(containsRef(out)).toBe(false);
    expect((out as { properties: { name: unknown } }).properties.name).toEqual({
      type: 'string',
      minLength: 1,
    });
  });

  it('mixes $defs and definitions transitively', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: { v: { $ref: '#/definitions/A' } },
      definitions: { A: { $ref: '#/$defs/B' } },
      $defs: { B: { type: 'boolean' } },
    });

    expect(containsRef(out)).toBe(false);
    expect((out as { properties: { v: unknown } }).properties.v).toEqual({ type: 'boolean' });
  });

  it('shallow-merges sibling keywords next to $ref (Draft 2020-12 semantics; siblings win on collision)', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: {
        v: {
          $ref: '#/$defs/Foo',
          description: 'caller override',
          default: null,
        },
      },
      $defs: {
        Foo: { type: 'string', description: 'target description' },
      },
    });

    const v = (out as { properties: { v: Record<string, unknown> } }).properties.v;
    expect(v.type).toBe('string');
    expect(v.description).toBe('caller override');
    expect(v.default).toBeNull();
    expect(containsRef(out)).toBe(false);
  });

  it('breaks recursive $ref cycles with a permissive object sentinel', () => {
    const out = dereferenceJsonSchema({
      $ref: '#/$defs/Tree',
      $defs: {
        Tree: {
          type: 'object',
          properties: {
            children: { type: 'array', items: { $ref: '#/$defs/Tree' } },
          },
        },
      },
    });

    expect((out as { type: string }).type).toBe('object');
    const children = (
      out as {
        properties: { children: { items: { type: string; additionalProperties: boolean } } };
      }
    ).properties.children;
    expect(children.items).toEqual({ type: 'object', additionalProperties: true });
    expect(containsRef(out)).toBe(false);
  });

  it('strips $defs and definitions from the returned root schema', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: { x: { $ref: '#/$defs/Foo' } },
      $defs: { Foo: { type: 'integer' } },
      definitions: { Bar: { type: 'string' } },
    }) as Record<string, unknown>;

    expect(out.$defs).toBeUndefined();
    expect(out.definitions).toBeUndefined();
  });

  it('throws JsonSchemaRefResolutionError when target is missing', () => {
    expect(() =>
      dereferenceJsonSchema({
        type: 'object',
        properties: { v: { $ref: '#/$defs/Missing' } },
        $defs: {},
      })
    ).toThrow(JsonSchemaRefResolutionError);
  });

  it('throws JsonSchemaRefResolutionError when chain depth exceeds the cap', () => {
    const $defs: Record<string, unknown> = {};
    for (let i = 0; i < 200; i++) {
      $defs[`A${i}`] = { $ref: i + 1 < 200 ? `#/$defs/A${i + 1}` : '#/$defs/A0' };
    }
    expect(() =>
      dereferenceJsonSchema({
        type: 'object',
        properties: { v: { $ref: '#/$defs/A0' } },
        $defs,
      })
    ).toThrow(JsonSchemaRefResolutionError);
  });

  it('leaves external $ref pointers untouched', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: { v: { $ref: 'https://example.com/Foo' } },
    });

    expect((out as { properties: { v: { $ref: string } } }).properties.v.$ref).toBe(
      'https://example.com/Foo'
    );
  });

  it('does not mutate the input schema', () => {
    const input = {
      type: 'object',
      properties: { v: { $ref: '#/$defs/Foo' } },
      $defs: { Foo: { type: 'string' } },
    };
    const snapshot = structuredClone(input);
    dereferenceJsonSchema(input);
    expect(input).toEqual(snapshot);
  });

  it('decodes JSON Pointer escape sequences (~1 -> /, ~0 -> ~) in the correct order', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: {
        a: { $ref: '#/$defs/with~1slash' },
        b: { $ref: '#/$defs/with~0tilde' },
        c: { $ref: '#/$defs/tilde-then-slash~01' },
      },
      $defs: {
        'with/slash': { type: 'string' },
        'with~tilde': { type: 'integer' },
        'tilde-then-slash~1': { type: 'boolean' },
      },
    } as unknown as Record<string, unknown>);

    const props = (out as { properties: Record<string, { type: string }> }).properties;
    expect(props.a.type).toBe('string');
    expect(props.b.type).toBe('integer');
    expect(props.c.type).toBe('boolean');
  });

  it('resolves array-index pointers (#/$defs/foo/oneOf/0)', () => {
    const out = dereferenceJsonSchema({
      type: 'object',
      properties: { v: { $ref: '#/$defs/foo/oneOf/0' } },
      $defs: {
        foo: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
    } as unknown as Record<string, unknown>);

    expect((out as { properties: { v: { type: string } } }).properties.v.type).toBe('string');
  });
});
