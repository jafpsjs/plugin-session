import sodium from "sodium-native";
import type {} from "fastify";

export type SessionKeyOptions = {
  key: (Buffer | string)[];
} | {
  key: Buffer | string;
};

export type SessionSecretOptions = {
  salt: Buffer | string;
  secret: Buffer | string;
};

export type CreateKeysOptions = SessionKeyOptions | SessionSecretOptions;

async function createKeysFromSecret(opts: SessionSecretOptions): Promise<Buffer[]> {
  const secret = Buffer.from(opts.secret);
  if (Buffer.byteLength(secret) < 32) {
    throw new Error("secret must be at least 32 bytes");
  }
  const salt = Buffer.from(opts.salt);
  if (Buffer.byteLength(salt) !== sodium.crypto_pwhash_SALTBYTES) {
    throw new Error(`salt must be length ${sodium.crypto_pwhash_SALTBYTES}`);
  }
  const key = await new Promise<Buffer>((resolve, reject) => {
    const key = Buffer.allocUnsafe(sodium.crypto_secretbox_KEYBYTES);
    sodium.crypto_pwhash_async(
      key,
      secret,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT,
      err => {
        if (err) {
          reject(new Error(err.message, { cause: err }));
        } else {
          resolve(key);
        }
      }
    );
  });
  return [key];
}

async function createKeysFromKey(opts: SessionKeyOptions): Promise<Buffer[]> {
  let keys: Buffer[];
  if (typeof opts.key === "string") {
    keys = [Buffer.from(opts.key, "base64")];
  } else if (Array.isArray(opts.key)) {
    keys = opts.key.map(k => typeof k === "string" ? Buffer.from(k, "base64") : k);
  } else if (Buffer.isBuffer(opts.key)) {
    keys = [opts.key];
  } else {
    throw new Error("key must be a string or a Buffer");
  }
  if (keys.some(key => Buffer.byteLength(key) !== sodium.crypto_secretbox_KEYBYTES)) {
    throw new Error(`key must be ${sodium.crypto_secretbox_KEYBYTES} bytes`);
  }
  return keys;
}

export async function createSessionKeys(opts: CreateKeysOptions): Promise<Buffer[]> {
  return "secret" in opts ? createKeysFromSecret(opts) : createKeysFromKey(opts);
}
