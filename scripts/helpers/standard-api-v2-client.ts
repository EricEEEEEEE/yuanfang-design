import { execSync } from "node:child_process";
import { POST } from "../../src/app/api/generate/standard/v2/route";
import type { StandardGenerateV2Response } from "../../src/models/standard-generation-api-v2";

const URL = "http://localhost/api/generate/standard/v2";
const TEST_INTERNAL_TOKEN = "standard-api-v2-test-token";

export type ApiResult = { status: number; body: StandardGenerateV2Response };
export type PosterStatus = "PASS_POSTER_SMOKE" | "PASS_CONTRACT_FAIL_CLOSED" | "FAIL_UNEXPECTED";
export type CallApiOptions = { token?: string | null };

export async function callApi(payload: unknown, options: CallApiOptions = {}): Promise<ApiResult> {
  const token = options.token === undefined ? internalTestToken() : options.token;
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await POST(new Request(URL, { method: "POST", headers, body: JSON.stringify(payload) }));
  return { status: response.status, body: await response.json() as StandardGenerateV2Response };
}

export function posterStatus(result: ApiResult): PosterStatus {
  if (result.status === 200 && result.body.ok && result.body.output) return "PASS_POSTER_SMOKE";
  if (result.status === 422 && !result.body.ok && !result.body.output) return "PASS_CONTRACT_FAIL_CLOSED";
  return "FAIL_UNEXPECTED";
}

export function guard(result: ApiResult, status: number, code: string): "PASS" | "FAIL" {
  return result.status === status && !result.body.ok && result.body.error?.code === code ? "PASS" : "FAIL";
}

export function hasRawStackTrace(result: ApiResult): boolean {
  return /(?:^|\n)\s*at\s+\S+|Error:/m.test(JSON.stringify(result.body));
}

export function gitStatusShort(): string {
  return execSync("git status --short", { encoding: "utf8" }).trim().replace(/\n/g, " | ") || "clean";
}

function internalTestToken(): string {
  const token = process.env.YUANFANG_INTERNAL_TEST_TOKEN?.trim() || TEST_INTERNAL_TOKEN;
  process.env.YUANFANG_INTERNAL_TEST_TOKEN = token;
  return token;
}
