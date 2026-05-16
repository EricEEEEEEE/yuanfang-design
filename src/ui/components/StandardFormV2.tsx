import type { FormEvent } from "react";
import type { StandardFormV2ProductOutputType } from "@/models/standard-generation-api-v2";
import { StandardFormTextarea } from "@/ui/components/StandardFormField";
import { StandardInspirationCards } from "@/ui/components/StandardInspirationCards";
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

  function applyInspiration(patch: Pick<StandardFormV2Values, "eventBrief" | "styleBrief" | "visualDetails">) {
    onChange("eventBrief", patch.eventBrief);
    onChange("styleBrief", patch.styleBrief);
    onChange("visualDetails", patch.visualDetails);
  }

  return (
    <form className="space-y-8 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200" onSubmit={handleSubmit}>
      <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
        这些输入会作为 v2 创意简报进入测试链路，帮助系统理解活动目标、画面方向和标题重点。
      </p>

      <StandardInspirationCards onApply={applyInspiration} values={values} />

      <StandardProductTypeSelector
        error={errors.productOutputType}
        onChange={(value) => onChange("productOutputType", value)}
        value={values.productOutputType}
      />

      <StandardFormTextarea
        error={errors.eventBrief}
        helper="建议写 50-120 字，最多 300 字。请写清楚课程内容、对象、活动亮点和希望家长看到什么。示例：三年级孩子完成了春季阅读成果展示，课堂上进行了作品朗读和小组分享，希望家长看到孩子表达能力和阅读理解的进步。写得越具体，结果越稳定。"
        label="这次活动/课程具体是什么？"
        maxLength={300}
        onChange={(value) => onChange("eventBrief", value)}
        placeholder="请具体描述课程内容、学生对象、活动亮点和传播目的。"
        value={values.eventBrief}
      />
      <StandardFormTextarea
        error={errors.styleBrief}
        helper="建议写 30-80 字，最多 200 字。请描述画面的情绪、风格和品牌气质。示例：希望整体温暖、明亮、有书香气，不要太低幼，要有一点高级感，让家长觉得孩子在认真成长。"
        label="希望画面给家长什么感觉？"
        maxLength={200}
        onChange={(value) => onChange("styleBrief", value)}
        placeholder="请描述情绪、风格、质感和家长看到后的感受。"
        value={values.styleBrief}
      />
      <StandardFormTextarea
        error={errors.visualDetails}
        helper="建议写 50-150 字，最多 300 字。请描述人物、物品、场景、颜色、构图或你希望出现的画面元素。示例：画面中可以有打开的书、柔和舞台灯光、孩子作品展示墙、成长路径线条，整体空间干净，标题区域要留白。"
        label="希望画面里出现什么？"
        maxLength={300}
        onChange={(value) => onChange("visualDetails", value)}
        placeholder="请具体描述画面元素、颜色、空间和构图。"
        value={values.visualDetails}
      />

      <StandardTitleFields errors={errors} onChange={onChange} values={values} />

      <StandardFormTextarea
        error={errors.avoidNotes}
        helper="建议至少写 8-10 个不希望出现的元素或风格，最多 200 字。负面描述越清楚，越能减少不满意结果。示例：不要低幼卡通、不要真实儿童照片、不要杂乱背景、不要土味红金、不要恐怖风、不要宗教符号、不要夸张表情、不要廉价促销感、不要过多文字、不要黑暗压抑色调、不要网红贴纸风。"
        label="不希望出现的内容"
        maxLength={200}
        onChange={(value) => onChange("avoidNotes", value)}
        placeholder="请列出不希望出现的元素、风格、颜色或画面问题。"
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
