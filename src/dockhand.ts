import * as dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const BASE_URL = process.env.DOCKHAND_URL ?? "";
const USERNAME = process.env.DOCKHAND_USERNAME ?? "";
const PASSWORD = process.env.DOCKHAND_PASSWORD ?? "";
const DEFAULT_ENV_ID = process.env.DOCKHAND_ENV_ID ?? "1";

/**
 * Build the `env=N` query-string fragment for a Dockhand API call.
 * Falls back to DOCKHAND_ENV_ID (or "1") when no override is provided.
 */
export function envQuery(envId?: string | number): string {
  return `env=${envId ?? DEFAULT_ENV_ID}`;
}

/**
 * Shared zod schema for the optional `environmentId` parameter on every
 * environment-scoped tool. Lets MCP clients target a specific Dockhand
 * environment per call without restarting the server.
 */
export const environmentIdSchema = z
  .union([z.string(), z.number()])
  .optional()
  .describe(
    "Optional Dockhand environment ID to target. Use list_environments to find IDs. Defaults to DOCKHAND_ENV_ID env var (or 1)."
  );

async function buildErrorMessage(response: Response): Promise<string> {
  const body = (await response.text().catch(() => "")).trim();
  const head = body.length > 500 ? `${body.slice(0, 500)}…` : body;
  return `Dockhand API error: ${response.status} ${response.statusText}${head ? ` — ${head}` : ""}`;
}

let sessionCookie: string | null = null;

async function login(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Dockhand login failed: ${res.status} ${res.statusText}`);
  }

  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No session cookie returned from Dockhand login");
  }

  // Extract the dockhand_session cookie value
  const match = setCookie.match(/dockhand_session=[^;]+/);
  if (!match) {
    throw new Error("dockhand_session cookie not found in login response");
  }

  sessionCookie = match[0];
}

export async function dockhandRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!sessionCookie) {
    await login();
  }

  // Dockhand's POST endpoints (deploy, start, stop, sync, prune) expect a
  // JSON body even when there's no payload to send. Without one, the server
  // tries to parse an empty body and returns 500 "Unexpected end of JSON
  // input". Default to "{}" for mutating methods that didn't supply a body.
  const method = (options.method ?? "GET").toUpperCase();
  const expectsBody = method === "POST" || method === "PUT" || method === "PATCH";
  const body = options.body ?? (expectsBody ? "{}" : undefined);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    body,
    headers: {
      ...(options.headers ?? {}),
      Cookie: sessionCookie!,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    // Session expired — re-login and retry once
    sessionCookie = null;
    await login();

    const retry = await fetch(`${BASE_URL}${path}`, {
      ...options,
      body,
      headers: {
        ...(options.headers ?? {}),
        Cookie: sessionCookie!,
        "Content-Type": "application/json",
      },
    });

    if (!retry.ok) {
      throw new Error(await buildErrorMessage(retry));
    }

    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    throw new Error(await buildErrorMessage(res));
  }

  // Some endpoints return 204 No Content
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}
