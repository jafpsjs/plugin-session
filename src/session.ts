import { arrayIncludes, objectKeys } from "ts-extras";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { UnknownRecord } from "type-fest";

export const timestampKey = "__ts";

export type TimestampKey = typeof timestampKey;
export type SessionData<T> = T extends UnknownRecord ? (keyof T extends TimestampKey ? never : T) : never;

type ObjectKeys<T extends object> = `${Exclude<keyof T, symbol>}`;

export class Session<T> {
  private readonly content: SessionData<T>;
  public changed: boolean;
  public deleted: boolean;
  public options?: CookieSerializeOptions;
  private timestamp: number;

  public constructor(content: SessionData<T>, timestamp?: number) {
    this.content = { ...content };
    this.timestamp = timestamp ?? Math.round(Date.now() / 1000);
    this.changed = false;
    this.deleted = false;
  }

  public get<V extends keyof SessionData<T>>(key: V): SessionData<T>[V] {
    return this.content[key];
  }

  public set<V extends keyof SessionData<T>>(key: V, value: SessionData<T>[V]): void {
    if (key === timestampKey) {
      throw new Error(`Can not use ${timestampKey} as a key.`);
    }
    this.touch();
    this.content[key] = value;
  }

  public delete(): void {
    this.deleted = true;
    this.touch();
  }

  public data(): SessionData<T> {
    return { ...this.content };
  }

  /**
   * Mark session is updated.
   */
  public touch(): void {
    this.changed = true;
    this.timestamp = Math.round(Date.now() / 1000);
  }

  public lastUpdated(): number {
    return this.timestamp;
  }

  public regenerate<T extends keyof SessionData<T>>(ignoredFields?: T[]): void {
    for (const key of objectKeys(this.content)) {
      if (Array.isArray(ignoredFields) && arrayIncludes(ignoredFields as ObjectKeys<SessionData<T>>[], key)) {
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.content[key];
    }
    this.touch();
  }
}
