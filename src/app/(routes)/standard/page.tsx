"use client";

import { FormEvent, useState } from "react";
import { STANDARD_ELEMENTS, STANDARD_STYLES, STANDARD_THEMES } from "@/config/scenes";
import { StandardOptionGroup, StandardTextInput } from "@/ui/components/StandardOptionGroup";
import { StandardPosterPreview } from "@/ui/components/StandardPosterPreview";
import { StandardSummaryCard, StandardV1DebugPanel } from "@/ui/components/StandardV1DebugPanel";
import type { StandardGenerateV1Request, StandardGenerateV1Response } from "@/models/standard-generation-api";

type Option = { key: string; label: string };
type SubmitState = "idle" | "submitting" | "success" | "validation" | "failed";

const themeOptions = toOptions(STANDARD_THEMES);
const styleOptions = toOptions(STANDARD_STYLES);
const elementOptions = toOptions(STANDARD_ELEMENTS);

function toOptions(source: Record<string, { label: string }>): Option[] {
  return Object.entries(source).map(([key, value]) => ({ key, label: value.label }));
}

function findLabel(options: Option[], selectedKey: string): string {
  return options.find((option) => option.key === selectedKey)?.label ?? "";
}

function readableError(response: StandardGenerateV1Response): string {
  if (response.error?.message) return response.error.message;
  if (response.error?.code) return `生成失败：${response.error.code}`;
  return "标准模式 v1 预览失败，请稍后重试";
}

export default function StandardPage() {
  const [selectedTheme, setSelectedTheme] = useState(themeOptions[0].key);
  const [selectedStyle, setSelectedStyle] = useState(styleOptions[0].key);
  const [selectedElement, setSelectedElement] = useState(elementOptions[0].key);
  const [mainTitle, setMainTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<StandardGenerateV1Response | null>(null);
  const selectedThemeLabel = findLabel(themeOptions, selectedTheme);
  const selectedStyleLabel = findLabel(styleOptions, selectedStyle);
  const selectedElementLabel = findLabel(elementOptions, selectedElement);
  const summaryItems = [
    { label: "已选主题", value: selectedThemeLabel },
    { label: "已选风格", value: selectedStyleLabel },
    { label: "已选元素", value: selectedElementLabel },
    { label: "主标题", value: mainTitle || "-" },
    { label: "副标题", value: subtitle || "-" },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = mainTitle.trim();
    const trimmedSubtitle = subtitle.trim();

    if (!trimmedTitle) {
      setStatus("validation");
      setMessage("请填写主标题");
      setResult(null);
      return;
    }

    const requestBody: StandardGenerateV1Request = {
      mainTitle: trimmedTitle,
      ...(trimmedSubtitle ? { subtitle: trimmedSubtitle } : {}),
      keywords: [selectedThemeLabel, selectedStyleLabel, selectedElementLabel],
      brandKey: "yuanfangDefault",
      canvas: { width: 1080, height: 1620 },
      background: { mode: "debugFixture" },
      options: {
        includeLogo: true,
        includeMascot: false,
        includeCampusInfo: false,
        outputMimeType: "image/jpeg",
        jpegQuality: 78,
        debug: true,
      },
    };

    setStatus("submitting");
    setMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/generate/standard/v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body = (await response.json()) as StandardGenerateV1Response;

      if (!response.ok || !body.ok || !body.output?.base64) {
        setStatus("failed");
        setMessage(readableError(body));
        setResult(body);
        return;
      }

      setStatus("success");
      setMessage("");
      setResult(body);
    } catch {
      setStatus("failed");
      setMessage("标准模式 v1 预览失败，请稍后重试");
      setResult(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">内部测试模式</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">标准模式 v1 预览</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              当前使用固定测试背景验证标题生成与合成链路，暂不代表正式生产效果。
            </p>
          </div>
          <a
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            href="/dashboard"
          >
            返回 Dashboard
          </a>
        </header>

        <form
          className="space-y-8 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
          onSubmit={handleSubmit}
        >
          <StandardOptionGroup onSelect={setSelectedTheme} options={themeOptions} selectedKey={selectedTheme} title="主题词" />
          <StandardOptionGroup onSelect={setSelectedStyle} options={styleOptions} selectedKey={selectedStyle} title="风格词" />
          <StandardOptionGroup onSelect={setSelectedElement} options={elementOptions} selectedKey={selectedElement} title="元素词" />

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-slate-950">海报文案</h2>
            <StandardTextInput label="主标题" onChange={setMainTitle} placeholder="请输入海报主标题" value={mainTitle} />
            <StandardTextInput label="副标题" onChange={setSubtitle} placeholder="请输入海报副标题" value={subtitle} />
          </section>

          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            v1 暂不叠加校区信息，校区名称和电话不会发送。
          </p>

          <button
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={status === "submitting"}
            type="submit"
          >
            {status === "submitting" ? "生成中…" : "生成 v1 预览图"}
          </button>

          {message ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </p>
          ) : null}
        </form>

        {status === "success" && result?.output?.base64 ? (
          <StandardPosterPreview base64={result.output.base64} height={result.output.height} mimeType={result.output.mimeType} width={result.output.width} />
        ) : null}

        {result?.diagnostics || result?.safety ? (
          <StandardV1DebugPanel response={result} />
        ) : null}

        <StandardSummaryCard items={summaryItems} title="当前选择" />
      </section>
    </main>
  );
}
