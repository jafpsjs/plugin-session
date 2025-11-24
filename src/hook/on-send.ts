import { objectEntries } from "ts-extras";
import { encodeSession } from "#func";
import { sessionOptionsSymbol } from "#symbol";
import type { onSendAsyncHookHandler } from "fastify";

export const onSend: onSendAsyncHookHandler = async function (req, res) {
  const options = req.server[sessionOptionsSymbol];
  for (const [sessionName, { cookieName, cookieOptions }] of objectEntries(options)) {
    const session = req.sessions[sessionName];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!session?.changed) {
      continue;
    }
    if (session.deleted) {
      res.clearCookie(cookieName);
      continue;
    }
    res.setCookie(
      cookieName,
      encodeSession(this, sessionName, session),
      { ...cookieOptions, ...session.options }
    );
  }
};
