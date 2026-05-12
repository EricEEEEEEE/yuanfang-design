export type StandardTitleTreatmentKey =
  | "glassCard"
  | "softGlow"
  | "noPanel"
  | "colorBlock"
  | "editorialText";

export type StandardCampusInfoMode =
  | "hidden"
  | "compact"
  | "full";

export type StandardDisplayPolicy = {
  titleTreatment: StandardTitleTreatmentKey;
  campusInfoMode: StandardCampusInfoMode;
  description: string;
  creditHint?: string;
};

export const STANDARD_DISPLAY_POLICIES: Record<string, StandardDisplayPolicy> = {
  titleOnlyDefault: {
    titleTreatment: "softGlow",
    campusInfoMode: "hidden",
    description:
      "默认策略。只显示主标题和副标题，不显示校区名称、地址、电话和底部信息白框。适合朋友圈、主视觉、小红书封面、品牌活动图。",
  },
  cleanPoster: {
    titleTreatment: "noPanel",
    campusInfoMode: "hidden",
    description:
      "更干净的海报策略。弱化标题底框，不显示校区信息，适合读书节、品牌理念、活动主视觉。",
  },
  compactCampus: {
    titleTreatment: "softGlow",
    campusInfoMode: "compact",
    description:
      "轻量校区信息策略。只显示校区名称或极简信息，不显示完整地址和电话，适合家长群或轻转化场景。",
    creditHint: "添加校区信息会消耗更多积分",
  },
  fullInfoGlass: {
    titleTreatment: "glassCard",
    campusInfoMode: "full",
    description:
      "完整校区信息策略。标题白色玻璃卡加底部完整校区信息，适合招生转化和需要明确联系方式的图片。",
    creditHint: "添加完整校区信息会消耗更多积分",
  },
  campaignInfo: {
    titleTreatment: "colorBlock",
    campusInfoMode: "full",
    description:
      "强转化策略。用于招生报名、开班提醒、短期活动，保留必要校区信息，标题可使用品牌色块。",
    creditHint: "添加完整校区信息会消耗更多积分",
  },
};
