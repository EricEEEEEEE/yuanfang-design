import type { StandardFormV2Values } from "@/ui/components/StandardFormV2";

type StandardOptionsPanelProps = {
  includeLogo: boolean;
  includeMascot: boolean;
  onChange: (field: keyof StandardFormV2Values, value: boolean) => void;
};

export function StandardOptionsPanel({
  includeLogo,
  includeMascot,
  onChange,
}: StandardOptionsPanelProps) {
  return (
    <section className="space-y-4 rounded-lg bg-slate-50 px-4 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">品牌元素</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          当前仍是 v2 预览，固定测试背景用于验证表单到合成链路。
        </p>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <input
          checked={includeLogo}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          onChange={(event) => onChange("includeLogo", event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-medium text-slate-950">显示品牌 Logo</span>
          <span className="mt-1 block text-sm leading-6 text-slate-500">建议保留，有助于保持远方品牌统一。</span>
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <input
          checked={includeMascot}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          onChange={(event) => onChange("includeMascot", event.target.checked)}
          type="checkbox"
        />
        <span>
          <span className="block text-sm font-medium text-slate-950">显示吉祥物</span>
          <span className="mt-1 block text-sm leading-6 text-slate-500">
            吉祥物为可选项，实际显示效果取决于系统版式与素材可用性。
          </span>
        </span>
      </label>
      <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-700">
        校区信息叠加尚未接入 v2，后续将以校区信息资产方式加入。
      </div>
    </section>
  );
}
