import { Duration } from "luxon";
import { createSessionKeys } from "./create-session-keys.js";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { TSchema } from "typebox";
import type { CreateKeysOptions } from "./create-session-keys.js";

export type SessionOptions<T extends string> = {
  cookieName: string;
  cookieOptions: CookieSerializeOptions;
  expiry: Duration<true>;
  keys: Buffer[];
  schema: TSchema;
  sessionName: T;
};

export type CreateSessionOption<T extends string> = {
  cookie?: CookieSerializeOptions;
  cookieName?: string;
  expiry?: Duration<true>;
  schema: TSchema;
  sessionName: T;
} & CreateKeysOptions;

export async function createSession<T extends string>(opt: CreateSessionOption<T>): Promise<SessionOptions<T>> {
  const {
    cookie = {},
    sessionName,
    cookieName = sessionName,
    expiry = Duration.fromObject({ day: 1 }),
    schema
  } = opt;

  if (cookie.httpOnly !== false) {
    cookie.httpOnly = true;
  }

  if (cookie.signed !== false) {
    cookie.signed = true;
  }

  if (typeof cookie.sameSite !== "string" && cookie.sameSite !== false) {
    cookie.sameSite = true;
  }

  const keys = await createSessionKeys(opt);
  return { cookieName, cookieOptions: cookie, expiry, keys, schema, sessionName };
}
