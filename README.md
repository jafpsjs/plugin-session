# @jafps/plugin-session

Fastify plugin for session. Use [typebox] to ensure the session match the schema.  
Inspired by [@fastify/secure-session].

It depends on [@fastify/cookie].

## Usage

### Register Plugin

```ts
import sessionPlugin from "@jafps/plugin-session";

await app.register(sessionPlugin, {
  session: {
    salt,
    schema,
    secret: "a".repeat(32)
  },
  session2: {
    salt,
    schema: Type.Object({ b: Type.String({ default: "a" }) }),
    secret: "a".repeat(32)
  }
});

declare module "fastify" {
  interface FastifySessions {
    session: { a: number };
    session2: { b: string };
  }
}
```

For all the sessions, it must be defined in `FastifySessions` and a corresponding configuration defined in options.

A `key` that is 32 bytes or 16 bytes `salt` with at least 32 bytes `secret` can be used.

### JSON Schema

```ts
Type.Object({ b: Type.Options(Type.String(), { default: "a" }) });
Type.Object({ b: Type.Optional(Type.String()) });
```

Properties in JSON schema must be defined `default` or optional. Otherwise, the initial session will throw error.

### Serialization

By using `Type.Codec`, the session can be serialized and deserialized automatically.

```ts
declare module "fastify" {
  interface FastifySessions {
    session: { foo: Date };
  }
}

await app.register(plugin, {
  session: {
    salt,
    schema: Type.Object({
      foo: Type.Codec(Type.Options(Type.String(), { format: "date-time" }))
        .Decode((v) => new Date(v))
        .Encode((v) => v.toISOString())
    }),
    secret: "a".repeat(32)
  }
});

req.sessions.session.set(foo, new Date());
```

[typebox]: https://github.com/sinclairzx81/typebox
[@fastify/secure-session]: https://github.com/fastify/fastify-secure-session
[@fastify/cookie]: https://github.com/fastify/fastify-cookie
