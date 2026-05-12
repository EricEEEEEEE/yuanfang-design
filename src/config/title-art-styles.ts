import type { StandardFontKey } from "@/config/font-library";

export type StandardTitleArtStyleKey =
  | "cleanBrand"
  | "stageGlow"
  | "modernChinese"
  | "boldCampaign"
  | "literaryEditorial"
  | "ipEvent";

export type StandardTitleArtStyle = {
  label: string;
  suitableFor: string[];
  fontKey: StandardFontKey;
  titleFill: string;
  subtitleFill: string;
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    dx: number;
    dy: number;
    blur: number;
    opacity: number;
  };
  glow?: {
    color: string;
    blur: number;
    opacity: number;
  };
  letterSpacing: number;
  description: string;
};

export const STANDARD_TITLE_ART_STYLES: Record<
  StandardTitleArtStyleKey,
  StandardTitleArtStyle
> = {
  cleanBrand: {
    label: "品牌清晰标题",
    suitableFor: ["通用活动", "课程说明", "家长通知", "公开课"],
    fontKey: "sourceHanSansBold",
    titleFill: "#004089",
    subtitleFill: "#EF7A00",
    shadow: {
      color: "#0B1F3A",
      dx: 0,
      dy: 3,
      blur: 6,
      opacity: 0.18,
    },
    letterSpacing: 1,
    description: "干净、清晰、品牌标准感，保证家长第一眼读懂。",
  },
  stageGlow: {
    label: "舞台光感标题",
    suitableFor: ["成长汇报课", "成果展示", "发布会", "教学比赛"],
    fontKey: "sourceHanSansBold",
    titleFill: "#004089",
    subtitleFill: "#EF7A00",
    stroke: {
      color: "#FFFFFF",
      width: 2,
    },
    shadow: {
      color: "#0B1F3A",
      dx: 0,
      dy: 5,
      blur: 10,
      opacity: 0.26,
    },
    glow: {
      color: "#FFE8A3",
      blur: 14,
      opacity: 0.35,
    },
    letterSpacing: 1,
    description: "舞台聚光感，标题像站在舞台光里，正式、有仪式感。",
  },
  modernChinese: {
    label: "现代国风标题",
    suitableFor: ["国学", "诗词", "名著", "传统文化"],
    fontKey: "sourceHanSerifSemiBold",
    titleFill: "#004089",
    subtitleFill: "#C30D23",
    stroke: {
      color: "#FFF6E8",
      width: 1,
    },
    shadow: {
      color: "#5C3B1E",
      dx: 0,
      dy: 3,
      blur: 6,
      opacity: 0.22,
    },
    glow: {
      color: "#F6D58A",
      blur: 10,
      opacity: 0.18,
    },
    letterSpacing: 1.5,
    description:
      "现代国风标题感，有文化气质，但不要廉价毛笔字和古风游戏字。",
  },
  boldCampaign: {
    label: "强营销标题",
    suitableFor: ["招生", "开班提醒", "报名提醒", "短期活动"],
    fontKey: "smileySans",
    titleFill: "#004089",
    subtitleFill: "#EF7A00",
    stroke: {
      color: "#FFFFFF",
      width: 3,
    },
    shadow: {
      color: "#004089",
      dx: 0,
      dy: 5,
      blur: 8,
      opacity: 0.28,
    },
    letterSpacing: 0.5,
    description:
      "强识别、高对比、适合朋友圈快速抓住注意力，但不要廉价促销感。",
  },
  literaryEditorial: {
    label: "文学杂志标题",
    suitableFor: ["读书节", "一本好书", "文学周", "品牌理念"],
    fontKey: "lxgwWenkaiGbMedium",
    titleFill: "#004089",
    subtitleFill: "#334155",
    shadow: {
      color: "#CBD5E1",
      dx: 0,
      dy: 3,
      blur: 6,
      opacity: 0.24,
    },
    letterSpacing: 2,
    description: "文学杂志标题感，克制、文艺、有书卷气，但不小清新手账。",
  },
  ipEvent: {
    label: "品牌 IP 活动标题",
    suitableFor: ["暑期营", "游园会", "轻活动", "品牌 IP 活动"],
    fontKey: "lxgwMarkerGothic",
    titleFill: "#004089",
    subtitleFill: "#EF7A00",
    stroke: {
      color: "#FFFFFF",
      width: 2,
    },
    shadow: {
      color: "#0B1F3A",
      dx: 0,
      dy: 4,
      blur: 7,
      opacity: 0.2,
    },
    glow: {
      color: "#DFF4FF",
      blur: 10,
      opacity: 0.25,
    },
    letterSpacing: 1,
    description: "活泼、有活动感、适合品牌 IP 和轻活动，但不能低幼。",
  },
};

