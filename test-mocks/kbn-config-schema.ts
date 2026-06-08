// Runtime stub for @kbn/config-schema used in Jest.
// Route registration calls schema.object/string/maybe/number to build validation
// descriptors — we just need them to return something truthy so the route
// handler can be captured by the mock router.
const schema = {
  object: (_fields: unknown, _opts?: unknown) => ({ _schema: 'object' }),
  string: (_opts?: unknown) => ({ _schema: 'string' }),
  maybe: (inner: unknown) => inner,
  number: (_opts?: unknown) => ({ _schema: 'number' }),
  boolean: (_opts?: unknown) => ({ _schema: 'boolean' }),
  arrayOf: (inner: unknown) => ({ _schema: 'array', inner }),
};

export { schema };