import type { StandardFormV2Values } from "@/ui/components/StandardFormV2";

type InspirationPatch = Pick<StandardFormV2Values, "eventBrief" | "styleBrief" | "visualDetails">;

type StandardInspirationCardsProps = {
  values: StandardFormV2Values;
  onApply: (patch: InspirationPatch) => void;
};

const INSPIRATIONS: Array<{
  title: string;
  description: string;
  example: string;
  patch: InspirationPatch;
}> = [
  {
    title: "基于课程进度",
    description: "根据本周课程、课堂成果、学生作品或阶段性学习重点，快速生成适合发给家长的展示海报。",
    example: "本周孩子完成了《西游记》人物分析，课堂上做了小组展示，希望生成一张展示学习成果、鼓励表达能力的海报。",
    patch: {
      eventBrief: "本周孩子完成了《西游记》人物分析，课堂上做了小组展示，希望家长看到孩子阅读理解和表达能力的提升。",
      styleBrief: "希望整体温暖、明亮、有书香气，带一点课堂展示的仪式感，不要太低幼。",
      visualDetails: "画面可以出现书本、人物分析卡片、小组展示舞台、作品墙和柔和灯光，标题区域需要干净留白。",
    },
  },
  {
    title: "基于节假日",
    description: "根据节日、节气、纪念日或校区活动节点，快速生成适合社群传播和家长沟通的节日主题海报。",
    example: "端午节前想发一张融合诗词、传统文化和儿童阅读氛围的节日海报，风格温暖、有书香气。",
    patch: {
      eventBrief: "端午节前希望发布一张融合诗词、传统文化和儿童阅读氛围的节日主题海报，用于家长群和朋友圈传播。",
      styleBrief: "希望风格温暖、有书香气，传统但不老气，适合远方文学品牌调性。",
      visualDetails: "画面可以出现书卷、粽叶、淡雅纹样、节日色彩和儿童阅读氛围，整体干净明亮。",
    },
  },
];

export function StandardInspirationCards({ values, onApply }: StandardInspirationCardsProps) {
  function applyPatch(patch: InspirationPatch) {
    onApply({
      eventBrief: values.eventBrief.trim() ? values.eventBrief : patch.eventBrief,
      styleBrief: values.styleBrief.trim() ? values.styleBrief : patch.styleBrief,
      visualDetails: values.visualDetails.trim() ? values.visualDetails : patch.visualDetails,
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">生成灵感入口</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          点击卡片会填充空白字段，不覆盖已写内容；描述越具体，生成结果越稳定。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {INSPIRATIONS.map((item) => (
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
            key={item.title}
            onClick={() => applyPatch(item.patch)}
            type="button"
          >
            <span className="block text-sm font-semibold text-slate-950">{item.title}</span>
            <span className="mt-2 block text-sm leading-6 text-slate-500">{item.description}</span>
            <span className="mt-3 block rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
              示例：{item.example}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
