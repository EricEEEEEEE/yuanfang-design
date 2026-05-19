import type { YuanfangCanvasIntent, YuanfangCanvasIntentKey } from "@/models/yuanfang-visual-rules";

function canvasIntent(input: YuanfangCanvasIntent): YuanfangCanvasIntent {
  return input;
}

export const YUANFANG_CANVAS_INTENTS: Record<YuanfangCanvasIntentKey, YuanfangCanvasIntent> = {
  verticalPoster: canvasIntent({
    key: "verticalPoster",
    label: "竖版朋友圈海报",
    aspectRatioClass: "vertical",
    futureCanvas: "1080x1620 or similar 2:3 vertical poster",
    suitableFor: ["朋友圈海报", "招生活动", "节日活动", "阅读课程长图"],
    promptGuidance: "Compose as a vertical poster with a strong top/middle hierarchy and designed safe zones, not an empty central board.",
  }),
  horizontalKeyVisual: canvasIntent({
    key: "horizontalKeyVisual",
    label: "横版品牌主视觉",
    aspectRatioClass: "horizontal",
    futureCanvas: "1920x1080 or similar horizontal key visual",
    suitableFor: ["发布会", "公司活动", "教学比赛", "舞台成果展示", "校区大屏"],
    promptGuidance: "Think like a horizontal KV even when the current canvas is vertical: use lateral motion, stage width, or split fields.",
  }),
  squareSocial: canvasIntent({
    key: "squareSocial",
    label: "方版社交传播图",
    aspectRatioClass: "square",
    futureCanvas: "1080x1080 square social asset",
    suitableFor: ["社群封面", "九宫格", "轻通知", "节日问候"],
    promptGuidance: "Build a compact square-friendly composition with a clear central relationship and no lower-only decoration pile.",
  }),
};
