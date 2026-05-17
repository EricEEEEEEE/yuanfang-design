import type { StandardBackgroundMode } from "@/ui/components/StandardFormV2";

type StandardBackgroundModeSelectorProps = {
  value: StandardBackgroundMode;
  onChange: (value: StandardBackgroundMode) => void;
};

const BACKGROUND_MODES: Array<{
  value: StandardBackgroundMode;
  title: string;
  description: string;
  note: string;
}> = [
  {
    value: "debugFixture",
    title: "测试背景",
    description: "速度快，用于验证标题生成和合成链路。",
    note: "默认模式，不消耗真实背景生成成本。",
  },
  {
    value: "generated",
    title: "AI 主题背景",
    description: "根据创意简报生成主题背景，速度较慢，会消耗生成成本。",
    note: "仍为预览能力，生成失败或效果波动属于正常测试状态。",
  },
];

export function StandardBackgroundModeSelector({
  value,
  onChange,
}: StandardBackgroundModeSelectorProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">背景模式</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          受控测试选项。AI 主题背景更接近真实产品方向，但更慢、成本更高，也可能 fail-closed。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {BACKGROUND_MODES.map((mode) => (
          <button
            className={`rounded-lg border px-4 py-4 text-left transition ${
              mode.value === value
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
            }`}
            key={mode.value}
            onClick={() => onChange(mode.value)}
            type="button"
          >
            <span className="block text-sm font-semibold">{mode.title}</span>
            <span className="mt-2 block text-sm leading-6 text-slate-500">{mode.description}</span>
            <span className="mt-3 block rounded-lg bg-white/70 px-3 py-2 text-sm leading-6 text-slate-600">
              {mode.note}
            </span>
          </button>
        ))}
      </div>
      {value === "generated" ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          当前 AI 主题背景仍在测试中，生成会更慢并消耗生成成本；如果失败，请稍后重试或调整描述。
        </p>
      ) : null}
    </section>
  );
}
