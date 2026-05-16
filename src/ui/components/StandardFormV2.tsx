import type { FormEvent } from "react";
import type { StandardFormV2ProductOutputType } from "@/models/standard-generation-api-v2";
import { StandardFormTextarea } from "@/ui/components/StandardFormField";
import { StandardOptionsPanel } from "@/ui/components/StandardOptionsPanel";
import { StandardProductTypeSelector } from "@/ui/components/StandardProductTypeSelector";
import { StandardTitleFields } from "@/ui/components/StandardTitleFields";

export type StandardFormV2Values = {
  productOutputType: StandardFormV2ProductOutputType;
  eventBrief: string;
  styleBrief: string;
  visualDetails: string;
  titleBrief: string;
  mainTitle: string;
  subtitle: string;
  titleEmphasisWords: string;
  avoidNotes: string;
  includeLogo: boolean;
  includeMascot: boolean;
};

export type StandardFormV2Errors = Partial<Record<keyof StandardFormV2Values, string>>;
export type StandardSubmitState = "idle" | "submitting" | "success" | "validation" | "failed";

export const initialStandardFormV2Values: StandardFormV2Values = {
  productOutputType: "achievementShowcase",
  eventBrief: "",
  styleBrief: "",
  visualDetails: "",
  titleBrief: "",
  mainTitle: "",
  subtitle: "",
  titleEmphasisWords: "",
  avoidNotes: "",
  includeLogo: true,
  includeMascot: false,
};

type StandardFormV2Props = {
  values: StandardFormV2Values;
  errors: StandardFormV2Errors;
  submitState: StandardSubmitState;
  message: string;
  onChange: <K extends keyof StandardFormV2Values>(field: K, value: StandardFormV2Values[K]) => void;
  onSubmit: () => void;
};

export function StandardFormV2({
  values,
  errors,
  submitState,
  message,
  onChange,
  onSubmit,
}: StandardFormV2Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="space-y-8 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200" onSubmit={handleSubmit}>
      <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
        这些输入会作为 v2 创意简报进入测试链路，帮助系统理解活动目标、画面方向和标题重点。
      </p>

      <StandardProductTypeSelector
        error={errors.productOutputType}
        onChange={(value) => onChange("productOutputType", value)}
        value={values.productOutputType}
      />

      <StandardFormTextarea
        error={errors.eventBrief}
        label="这次活动/课程具体是什么？"
        maxLength={300}
        onChange={(value) => onChange("eventBrief", value)}
        placeholder="例：三年级孩子的春季阅读成果展示，希望家长看到孩子表达能力的提升。"
        value={values.eventBrief}
      />
      <StandardFormTextarea
        error={errors.styleBrief}
        label="希望画面给家长什么感觉？"
        maxLength={200}
        onChange={(value) => onChange("styleBrief", value)}
        placeholder="例：温暖、明亮、有书香气，不要太卡通，要有一点高级感。"
        value={values.styleBrief}
      />
      <StandardFormTextarea
        error={errors.visualDetails}
        label="希望画面里出现什么？"
        maxLength={300}
        onChange={(value) => onChange("visualDetails", value)}
        placeholder="例：书本、舞台灯光、作品墙、孩子剪影、成长路径。"
        value={values.visualDetails}
      />

      <StandardTitleFields errors={errors} onChange={onChange} values={values} />

      <StandardFormTextarea
        error={errors.avoidNotes}
        label="不希望出现的内容"
        maxLength={200}
        onChange={(value) => onChange("avoidNotes", value)}
        placeholder="例：不要低幼卡通、不要真实儿童照片、不要杂乱背景。"
        value={values.avoidNotes}
      />

      <StandardOptionsPanel includeLogo={values.includeLogo} includeMascot={values.includeMascot} onChange={onChange} />

      <button
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={submitState === "submitting"}
        type="submit"
      >
        {submitState === "submitting" ? "生成中…" : "生成 v2 预览图"}
      </button>

      {submitState === "submitting" ? <p className="text-center text-sm text-slate-500">生成中，可能需要几十秒。</p> : null}
      {message ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
    </form>
  );
}
