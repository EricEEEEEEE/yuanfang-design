import type { StandardGenerateV2Request } from "../../src/models/standard-generation-api-v2";

export const VALID_PAYLOAD: StandardGenerateV2Request = {
  source: "standard-form-v2",
  brandKey: "yuanfangDefault",
  canvas: { width: 1080, height: 1620 },
  form: {
    productOutputType: "achievementShowcase",
    eventBrief: "这是一次学期成长汇报课，孩子会展示阅读、写作、表达和课堂成果。",
    styleBrief: "明亮、可信、有仪式感",
    visualDetails: "中央舞台光柱、左右作品墙、底部展示台、奖章点缀",
    titleBrief: "海报标题突出成长和汇报课",
    avoidNotes: "不要低幼卡通，不要人物太多，不要真实照片感",
  },
  title: { mainTitle: "成长汇报课", subtitle: "看见孩子的表达力量", titleEmphasisWords: ["成长"] },
  background: { mode: "debugFixture" },
  options: { includeLogo: true, includeMascot: false, includeCampusInfo: false, outputMimeType: "image/jpeg", jpegQuality: 78, debug: true },
};

export const QUALITY_PAYLOAD: StandardGenerateV2Request = {
  ...VALID_PAYLOAD,
  form: {
    productOutputType: "enrollment",
    eventBrief: "孩子可以通过假期免费上 4 节课，感受四大名著内容，让孩子爱上名著、爱上文学、爱上语文。",
    styleBrief: "能够让家长感受到四大名著的那种感觉，并且一眼能看出来。不要和传统四大名著感觉一样，要有高级感。",
    visualDetails: "希望图片里出现四大名著的代表人物或者书籍，同时表现出孩子渴望阅读四大名著的感觉。",
    titleBrief: "希望突出四大名著四个字，让家长知道我们通过四大名著课程招收孩子，因为四大名著在中国人人皆知。",
    avoidNotes: "不要出现真实儿童照片，不要有压抑的颜色，也不要有日本动漫的感觉。",
  },
  title: { mainTitle: "暑期体验课", subtitle: "四大名著体验营" },
};
