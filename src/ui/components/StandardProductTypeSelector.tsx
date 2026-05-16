import type { StandardFormV2ProductOutputType } from "@/models/standard-generation-api-v2";

export const STANDARD_PRODUCT_TYPE_OPTIONS: Array<{
  value: StandardFormV2ProductOutputType;
  label: string;
  description: string;
}> = [
  { value: "achievementShowcase", label: "成果展示", description: "展示课堂成果、作品汇报和孩子成长。" },
  { value: "enrollment", label: "招生宣传", description: "用于课程报名、新班推广和公开课招募。" },
  { value: "festival", label: "节日/活动", description: "用于节日祝福、节气活动和主题活动。" },
  { value: "classReview", label: "课堂回顾", description: "用于记录课堂片段和学习过程。" },
  { value: "parentNotice", label: "家长通知", description: "用于重要事项提醒和家校沟通。" },
  { value: "socialPost", label: "朋友圈图文", description: "用于社群传播和轻量分享。" },
];

type StandardProductTypeSelectorProps = {
  value: StandardFormV2ProductOutputType;
  onChange: (value: StandardFormV2ProductOutputType) => void;
  error?: string;
};

export function StandardProductTypeSelector({
  value,
  onChange,
  error,
}: StandardProductTypeSelectorProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">你要做什么图？</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          选择最接近的用途，系统会根据用途调整内容表达和版式倾向。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STANDARD_PRODUCT_TYPE_OPTIONS.map((option) => (
          <button
            className={`rounded-lg border px-4 py-3 text-left transition ${
              option.value === value
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="block text-sm font-semibold">{option.label}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">{option.description}</span>
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
