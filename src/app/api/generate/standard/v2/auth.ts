export type StandardV2AuthResult = { ok: true } | { ok: false };

export function authorizeStandardV2InternalTest(request: Request): StandardV2AuthResult {
  const expected = process.env.YUANFANG_INTERNAL_TEST_TOKEN?.trim();
  const authorization = request.headers.get("authorization");

  if (!expected || !authorization) return { ok: false };
  const [scheme, token, extra] = authorization.split(" ");

  return scheme === "Bearer" && token === expected && !extra ? { ok: true } : { ok: false };
}
