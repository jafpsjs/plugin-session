import { objectEntries } from "ts-extras";
import { decodeSession } from "#func";
import { sessionOptionsSymbol } from "#symbol";
import type { onRequestAsyncHookHandler } from "fastify";

export const onRequest: onRequestAsyncHookHandler = async function (req) {
  const options = req.server[sessionOptionsSymbol];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  req.sessions ??= {} as any;
  for (const [sessionName, { cookieName, cookieOptions }] of objectEntries(options)) {
    let cookie = req.cookies[cookieName];
    if (cookie !== undefined && cookieOptions.signed === true) {
      const unsignedCookie = req.server.unsignCookie(cookie);

      if (unsignedCookie.valid) {
        cookie = unsignedCookie.value;
      }
    }
    req.sessions[sessionName] = decodeSession(req.server, sessionName, cookie) as any;
  }
};
