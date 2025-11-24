import sodium from "sodium-native";
import { sessionOptionsSymbol, sessionSchemaSymbol } from "#symbol";
import type { FastifyInstance, FastifySessions } from "fastify";
import type { Session } from "#session";

function genNonce(): Buffer {
  const buf = Buffer.allocUnsafe(sodium.crypto_secretbox_NONCEBYTES);
  sodium.randombytes_buf(buf);
  return buf;
}

export function encodeSession<T extends keyof FastifySessions>(app: FastifyInstance, sessionName: T, session: Session<FastifySessions[T]>): string {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!app[sessionOptionsSymbol][sessionName]) {
    throw new Error("Unknown session key.");
  }

  const { keys, schema } = app[sessionOptionsSymbol][sessionName];
  if (!keys[0]) {
    throw new Error("Unknown session key.");
  }

  const nonce = genNonce();
  const jsonString = app[sessionSchemaSymbol].serialize(schema)(session.data() as any, session.lastUpdated());
  const msg = Buffer.from(jsonString);

  const cipher = Buffer.allocUnsafe(msg.length + sodium.crypto_secretbox_MACBYTES);
  sodium.crypto_secretbox_easy(cipher, msg, nonce, keys[0]);
  return `${cipher.toString("base64")};${nonce.toString("base64")}`;
}
