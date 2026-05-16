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
        label="主标题"
        maxLength={16}
        onChange={(value) => onChange("mainTitle", value)}
        placeholder="成长汇报课"
        value={values.mainTitle}
      />
      <StandardFormInput
        error={errors.subtitle}
        label="副标题"
        maxLength={32}
        onChange={(value) => onChange("subtitle", value)}
        placeholder="看见孩子的表达力量"
        value={values.subtitle}
      />
      <StandardFormTextarea
        error={errors.titleBrief}
        label="标题说明 / 强调要求"
        maxLength={200}
        onChange={(value) => onChange("titleBrief", value)}
        placeholder="例：突出“成长”，整体要有汇报课仪式感。"
        value={values.titleBrief}
      />
      <StandardFormInput
        error={errors.titleEmphasisWords}
        helper="可选，用逗号分隔；每个词必须来自主标题。"
        label="重点突出词"
        onChange={(value) => onChange("titleEmphasisWords", value)}
        placeholder="例：成长,表达"
        value={values.titleEmphasisWords}
      />
    </section>
  );
}
