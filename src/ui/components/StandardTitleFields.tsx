import { StandardFormInput, StandardFormTextarea } from "@/ui/components/StandardFormField";
import type { StandardFormV2Values, StandardFormV2Errors } from "@/ui/components/StandardFormV2";

type StandardTitleFieldsProps = {
  values: StandardFormV2Values;
  errors: StandardFormV2Errors;
  onChange: (field: keyof StandardFormV2Values, value: string) => void;
};

export function StandardTitleFields({
  values,
  errors,
  onChange,
}: StandardTitleFieldsProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">海报上要写什么？</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          主标题以下方输入为准，标题说明只用于风格和强调要求。
        </p>
      </div>
      <StandardFormInput
        error={errors.mainTitle}
        helper="建议 2-12 字，最多 16 字。主标题会被系统严格用于标题设计，请不要写太长。示例：成长汇报课。"
        label="主标题"
        maxLength={16}
        onChange={(value) => onChange("mainTitle", value)}
        placeholder="成长汇报课"
        value={values.mainTitle}
      />
      <StandardFormInput
        error={errors.subtitle}
        helper="可选，建议 8-20 字，最多 32 字。用于补充主标题，不要写太长。示例：看见孩子的表达力量。"
        label="副标题"
        maxLength={32}
        onChange={(value) => onChange("subtitle", value)}
        placeholder="看见孩子的表达力量"
        value={values.subtitle}
      />
      <StandardFormTextarea
        error={errors.titleBrief}
        helper="建议写 20-80 字，最多 200 字。主标题以下方输入为准，这里只说明标题气质、重点词和层级。示例：希望突出“成长”两个字，让标题有汇报课的仪式感，副标题轻一些，不要像普通通知。"
        label="标题说明 / 强调要求"
        maxLength={200}
        onChange={(value) => onChange("titleBrief", value)}
        placeholder="例：突出“成长”，整体要有汇报课仪式感。"
        value={values.titleBrief}
      />
      <StandardFormInput
        error={errors.titleEmphasisWords}
        helper="可选，用逗号分隔；每个词必须来自主标题中的词。示例：成长,表达。"
        label="重点突出词"
        onChange={(value) => onChange("titleEmphasisWords", value)}
        placeholder="例：成长,表达"
        value={values.titleEmphasisWords}
      />
    </section>
  );
}
