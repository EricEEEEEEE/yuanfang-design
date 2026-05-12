export type StandardFontKey =
  | "sourceHanSansBold"
  | "sourceHanSerifSemiBold"
  | "smileySans"
  | "lxgwWenkaiGbMedium"
  | "lxgwMarkerGothic"
  | "gensenRoundedBold";

export type StandardFontCategory =
  | "sans"
  | "serif"
  | "display"
  | "kai"
  | "rounded"
  | "marker";

export type StandardFontAsset = {
  displayName: string;
  filePath: string;
  category: StandardFontCategory;
  license: string;
  source: string;
  suitableFor: string[];
  avoidFor: string[];
  personality: string[];
  defaultUse: string;
};

export const STANDARD_FONT_LIBRARY: Record<
  StandardFontKey,
  StandardFontAsset
> = {
  sourceHanSansBold: {
    displayName: "思源黑体 Bold",
    filePath: "assets/fonts/source-han-sans-sc-bold.otf",
    category: "sans",
    license: "SIL Open Font License 1.1",
    source: "adobe-fonts/source-han-sans",
    suitableFor: [
      "商务教育",
      "招生",
      "公开课",
      "成长汇报课",
      "课程发布",
    ],
    avoidFor: ["轻文艺", "低龄活动"],
    personality: ["稳定", "清晰", "专业", "高可读"],
    defaultUse: "默认商务教育标题字体，适合 cleanBrand / stageGlow。",
  },
  sourceHanSerifSemiBold: {
    displayName: "思源宋体 SemiBold",
    filePath: "assets/fonts/source-han-serif-sc-semibold.otf",
    category: "serif",
    license: "SIL Open Font License 1.1",
    source: "adobe-fonts/source-han-serif",
    suitableFor: ["国学", "诗词", "名著", "读书节", "品牌理念"],
    avoidFor: ["强营销", "低龄活动"],
    personality: ["文化感", "书卷气", "稳重", "文学感"],
    defaultUse:
      "国风和文学主题标题字体，适合 modernChinese / literaryEditorial。",
  },
  smileySans: {
    displayName: "得意黑",
    filePath: "assets/fonts/smiley-sans.ttf",
    category: "display",
    license: "SIL Open Font License 1.1",
    source: "atelier-anchor/smiley-sans",
    suitableFor: ["强标题", "招生活动", "开班提醒", "年轻化活动"],
    avoidFor: ["正式品牌理念", "严肃教学比赛", "高级留白"],
    personality: ["活动感", "抓眼", "年轻", "有标题感"],
    defaultUse: "强营销和活动标题字体，适合 boldCampaign。",
  },
  lxgwWenkaiGbMedium: {
    displayName: "霞鹜文楷 GB Medium",
    filePath: "assets/fonts/lxgw-wenkai-gb-medium.ttf",
    category: "kai",
    license: "SIL Open Font License 1.1",
    source: "lxgw/LxgwWenkaiGB",
    suitableFor: ["一本好书", "读书节", "文学周", "阅读活动"],
    avoidFor: ["强营销", "商务发布会"],
    personality: ["亲和", "文学感", "书写感", "温和"],
    defaultUse: "阅读和文学活动标题字体，适合 literaryEditorial 的温和版本。",
  },
  lxgwMarkerGothic: {
    displayName: "霞鹜漫黑",
    filePath: "assets/fonts/lxgw-marker-gothic.ttf",
    category: "marker",
    license: "SIL Open Font License 1.1",
    source: "lxgw/LxgwMarkerGothic",
    suitableFor: ["暑期营", "游园会", "轻活动", "品牌 IP 活动"],
    avoidFor: ["严肃商务", "品牌理念", "国学诗词"],
    personality: ["活泼", "手作感", "轻卡通", "活动感"],
    defaultUse: "轻活动和 IP 活动字体，适合 ipCartoonEvent。",
  },
  gensenRoundedBold: {
    displayName: "源泉圆体 Bold",
    filePath: "assets/fonts/gensen-rounded-tw-bold.otf",
    category: "rounded",
    license: "SIL Open Font License 1.1",
    source: "ButTaiwan/gensen-font",
    suitableFor: ["公开课", "家长群", "亲和活动", "低龄但不低幼的活动图"],
    avoidFor: ["正式发布会", "高级国风"],
    personality: ["圆润", "亲和", "温暖", "易读"],
    defaultUse:
      "亲和型活动标题字体，适合 educationGrowth / ipCartoonEvent 的温和版本。",
  },
};

