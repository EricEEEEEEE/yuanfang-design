"use client";

import { useState } from "react";
import type { StandardGenerateV2Request, StandardGenerateV2Response } from "@/models/standard-generation-api-v2";
import { StandardDebugPanel } from "@/ui/components/StandardDebugPanel";
import {
  initialStandardFormV2Values,
  StandardFormV2,
  type StandardFormV2Errors,
  type StandardFormV2Values,
  type StandardSubmitState,
} from "@/ui/components/StandardFormV2";
import { StandardPosterPreview } from "@/ui/components/StandardPosterPreview";

function readableError(statusCode: number, response?: StandardGenerateV2Response): string {
  if (statusCode >= 500) return "系统暂时不可用，请稍后重试。";
  if (response?.error?.userMessage) return response.error.userMessage;
  if (statusCode === 422) return "生成未通过安全检查，请调整描述后重试。";
  if (!response?.output?.base64) return "本次未生成海报，请稍后重试。";
  return "请求参数无效，请检查表单。";
}

function emphasisWords(value: string): string[] | undefined {
  const words = value.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
  return words.length ? words : undefined;
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function validate(values: StandardFormV2Values): StandardFormV2Errors {
  const errors: StandardFormV2Errors = {};
  const mainTitle = values.mainTitle.trim();
  const emphasis = emphasisWords(values.titleEmphasisWords);
  if (!values.productOutputType) errors.productOutputType = "请选择要做什么图。";
  if (values.eventBrief.trim().length < 10) errors.eventBrief = "请补充活动或课程内容，至少 10 个字。";
  if (values.styleBrief.trim().length < 4) errors.styleBrief = "请补充画面感觉，至少 4 个字。";
  if (mainTitle.length < 2 || mainTitle.length > 16) errors.mainTitle = "主标题需为 2-16 个字。";
  if (values.subtitle.trim().length > 32) errors.subtitle = "副标题需控制在 32 个字以内。";
  if (values.titleBrief.trim().length < 2) errors.titleBrief = "请填写标题说明或强调要求。";
  if (values.visualDetails.trim().length > 300) errors.visualDetails = "画面元素需控制在 300 个字以内。";
  if (values.avoidNotes.trim().length > 200) errors.avoidNotes = "不希望出现的内容需控制在 200 个字以内。";
  if (emphasis?.some((word) => !mainTitle.includes(word))) errors.titleEmphasisWords = "重点突出词必须来自主标题。";
  return errors;
}

function buildRequest(values: StandardFormV2Values): StandardGenerateV2Request {
  return {
    source: "standard-form-v2",
    brandKey: "yuanfangDefault",
    canvas: { width: 1080, height: 1620 },
    form: {
      productOutputType: values.productOutputType,
      eventBrief: values.eventBrief.trim(),
      styleBrief: values.styleBrief.trim(),
      ...(optionalText(values.visualDetails) ? { visualDetails: values.visualDetails.trim() } : {}),
      titleBrief: values.titleBrief.trim(),
      ...(optionalText(values.avoidNotes) ? { avoidNotes: values.avoidNotes.trim() } : {}),
    },
    title: {
      mainTitle: values.mainTitle.trim(),
      ...(optionalText(values.subtitle) ? { subtitle: values.subtitle.trim() } : {}),
      ...(emphasisWords(values.titleEmphasisWords) ? { titleEmphasisWords: emphasisWords(values.titleEmphasisWords) } : {}),
    },
    background: { mode: "debugFixture" },
    options: {
      includeLogo: values.includeLogo,
      includeMascot: values.includeMascot,
      includeCampusInfo: false,
      outputMimeType: "image/jpeg",
      jpegQuality: 78,
      debug: true,
    },
  };
}

export default function StandardPage() {
  const [values, setValues] = useState<StandardFormV2Values>(initialStandardFormV2Values);
  const [errors, setErrors] = useState<StandardFormV2Errors>({});
  const [status, setStatus] = useState<StandardSubmitState>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<StandardGenerateV2Response | null>(null);

  function updateField<K extends keyof StandardFormV2Values>(field: K, value: StandardFormV2Values[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submitPreview() {
    const nextErrors = validate(values);
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      setStatus("validation");
      setMessage("请先修正表单中的提示。");
      setResult(null);
      return;
    }

    setStatus("submitting");
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/generate/standard/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequest(values)),
      });
      const body = (await response.json()) as StandardGenerateV2Response;
      if (!response.ok || !body.ok || !body.output?.base64) {
        setStatus("failed");
        setMessage(readableError(response.status, body));
        setResult(body);
        return;
      }
      setStatus("success");
      setResult(body);
    } catch {
      setStatus("failed");
      setMessage("系统暂时不可用，请稍后重试。");
      setResult(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">内部测试模式</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">标准模式 v2 预览</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              通过结构化创意简报生成测试海报，当前仍使用固定测试背景，暂不代表正式生产效果。
            </p>
          </div>
          <a
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            href="/dashboard"
          >
            返回 Dashboard
          </a>
        </header>

        <StandardFormV2 errors={errors} message={message} onChange={updateField} onSubmit={() => void submitPreview()} submitState={status} values={values} />

        {status === "success" && result?.output?.base64 ? (
          <StandardPosterPreview base64={result.output.base64} height={result.output.height} mimeType={result.output.mimeType} width={result.output.width} />
        ) : null}

        {result?.diagnostics || result?.safety ? <StandardDebugPanel response={result} /> : null}
      </section>
    </main>
  );
}
