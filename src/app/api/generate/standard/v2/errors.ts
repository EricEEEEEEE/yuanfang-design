import type { StandardGenerateV2ErrorCode, StandardGenerateV2Error } from "@/models/standard-generation-api-v2";

const ERROR_INFO = {
  invalid_json: ["Request body must be valid JSON.", "请求格式无效，请刷新后重试。"],
  invalid_request: ["Request body is invalid.", "请求参数无效，请检查表单。"],
  missing_main_title: ["title.mainTitle is required.", "请填写海报标题。"],
  invalid_title_length: ["title length is invalid.", "请控制标题长度。"],
  invalid_product_output_type: ["form.productOutputType is invalid.", "请选择要做什么图。"],
  event_brief_too_short: ["form.eventBrief must be 10-300 characters.", "请补充活动或课程内容。"],
  style_brief_too_short: ["form.styleBrief must be 4-200 characters.", "请补充画面感觉。"],
  avoid_notes_too_long: ["form.avoidNotes is too long.", "请缩短不希望出现的内容。"],
  unsupported_background_mode: ["Requested background mode is not supported in Standard API v2.", "当前暂不支持这种背景模式。"],
  campus_info_not_supported: ["campusInfoAsset is not supported in Standard API v2.", "当前暂不支持校区信息叠加。"],
  prompt_build_failed: ["Generated background prompt build failed.", "背景生成准备失败，请调整描述后重试。"],
  background_generation_failed: ["Generated background image failed.", "背景生成失败，请调整描述后重试。"],
  background_image_empty: ["Generated background image is empty.", "背景生成失败，请稍后重试。"],
  background_image_invalid: ["Generated background image is invalid.", "背景图片处理失败，请稍后重试。"],
  background_image_normalize_failed: ["Generated background normalization failed.", "背景图片规格化失败，请稍后重试。"],
  unknown_background_generation_error: ["Generated background failed unexpectedly.", "背景生成暂时不可用，请稍后重试。"],
  generation_fail_closed: ["Standard API v2 generation failed closed.", "生成未通过安全检查，请调整描述后重试。"],
  no_output: ["Standard API v2 produced no output.", "本次未生成海报，请稍后重试。"],
  openai_api_key_missing: ["OPENAI_API_KEY missing.", "系统生成配置未完成。"],
  insufficient_credit: ["Campus balance is insufficient.", "当前测试额度不足，请联系管理员。"],
  credit_gate_unavailable: ["Internal test credit gate is unavailable.", "当前测试额度配置不可用，请联系管理员。"],
  internal_error: ["Standard API v2 failed unexpectedly.", "系统暂时不可用，请稍后重试。"],
  unauthorized: ["Standard API v2 internal test token is missing or invalid.", "当前测试入口无访问权限，请联系管理员。"],
} satisfies Record<StandardGenerateV2ErrorCode, [string, string]>;

export function standardV2ErrorPayload(code: StandardGenerateV2ErrorCode, message?: string): StandardGenerateV2Error {
  const [defaultMessage, userMessage] = ERROR_INFO[code];
  return { code, message: message ?? defaultMessage, userMessage };
}

export function standardV2ErrorMessage(code: StandardGenerateV2ErrorCode): string {
  return ERROR_INFO[code][0];
}
