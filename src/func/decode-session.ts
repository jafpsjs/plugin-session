import sodium from "sodium-native";
import { Session, timestampKey } from "#session";
import { sessionOptionsSymbol, sessionSchemaSymbol } from "#symbol";
import type { FastifyInstance, FastifySessions } from "fastify";
import type { TSchema } from "typebox";
import type { SessionData } from "#session";


function createDefaultSession<T extends keyof FastifySessions>(app: FastifyInstance, schema: TSchema): Session<FastifySessions[T]> {
  const result = app[sessionSchemaSymbol].deserialize(schema)({});
  if ("error" in result) {
    throw result.error;
  }
  return new Session(result.value as SessionData<FastifySessions[T]>);
}

export function decodeSession<T extends keyof FastifySessions>(app: FastifyInstance, sessionName: T, cookie: string | undefined): Session<FastifySessions[T]> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!app[sessionOptionsSymbol][sessionName]) {
    throw new Error("Unknown session key.");
  }
  const { expiry, keys, schema } = app[sessionOptionsSymbol][sessionName];
  if (!cookie) {
    return createDefaultSession(app, schema);
  }
  const split = cookie.split(";");
  const cyphertextB64 = split[0];
  const nonceB64 = split[1];
  if (split.length <= 1 || !cyphertextB64 || !nonceB64) {
    return createDefaultSession(app, schema);
  }
  const cipher = Buffer.from(cyphertextB64, "base64");
  const nonce = Buffer.from(nonceB64, "base64");

  if (cipher.length < sodium.crypto_secretbox_MACBYTES) {
    return createDefaultSession(app, schema);
  }

  if (nonce.length !== sodium.crypto_secretbox_NONCEBYTES) {
    return createDefaultSession(app, schema);
  }

  const msg = Buffer.allocUnsafe(cipher.length - sodium.crypto_secretbox_MACBYTES);

  let signingKeyRotated = false;
  const decodeSuccess = keys.some((k, i) => {
    const decoded = sodium.crypto_secretbox_open_easy(msg, cipher, nonce, k);
    signingKeyRotated = decoded && i > 0;
    return decoded;
  });
  if (!decodeSuccess) {
    return createDefaultSession(app, schema);
  }
  const parsed = JSON.parse(msg as any);
  if (!(timestampKey in parsed)) {
    return createDefaultSession(app, schema);
  }
  const timestamp = parsed[timestampKey];
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete parsed[timestampKey];
  const expirySecond = expiry.as("second");
  if (((timestamp + expirySecond) * 1000) - Date.now() <= 0) {
    return createDefaultSession(app, schema);
  }
  const result = app[sessionSchemaSymbol].deserialize(schema)(parsed);
  if ("error" in result) {
    return createDefaultSession(app, schema);
  }
  const session = new Session<FastifySessions[T]>(result.value as any, timestamp);
  session.changed = signingKeyRotated;
  return session;
}
