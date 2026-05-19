import { randomUUID } from "node:crypto";

export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown> & {
  event: string;
  request_id?: string;
  agent_pubkey?: string;
};

function emit(level: LogLevel, fields: LogFields) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...fields });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (fields: LogFields) => emit("info", fields),
  warn: (fields: LogFields) => emit("warn", fields),
  error: (fields: LogFields) => emit("error", fields),
};

export function newRequestId(req: Request): string {
  const fromVercel = req.headers.get("x-vercel-id");
  if (fromVercel) return fromVercel;
  return randomUUID();
}
