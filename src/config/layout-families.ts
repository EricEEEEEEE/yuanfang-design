export type StandardLayoutFamilyKey =
  | "classicTop"
  | "centerTitle"
  | "sideTitle"
  | "bottomTitle"
  | "eventPoster";

export type StandardLayoutFamily = {
  label: string;
  suitableFor: string[];
  titleArea: string;
  infoArea: string;
  logoArea: string;
  mascotArea: string;
  compositionIntent: string;
  avoid: string[];
  prompt: string;
};

export const STANDARD_LAYOUT_FAMILIES: Record<
  StandardLayoutFamilyKey,
  StandardLayoutFamily
> = {
  classicTop: {
    label: "经典顶部版式",
    suitableFor: ["通用活动图", "招生图", "公开课"],
    titleArea: "上方或左上大标题区域。",
    infoArea: "底部信息栏。",
    logoArea: "右上。",
    mascotArea: "右下或信息栏附近。",
    compositionIntent: "稳定、清晰、通用。",
    avoid: ["所有主题长期只用这一套"],
    prompt:
      "使用经典顶部版式，标题位于上方或左上，底部承载校区信息，整体稳定清晰，适合通用传播。",
  },
  centerTitle: {
    label: "中心标题版式",
    suitableFor: ["发布会", "成果展示", "品牌活动"],
    titleArea: "中上或中心大标题区域。",
    infoArea: "下方或侧下方。",
    logoArea: "右上或标题附近。",
    mascotArea: "底部边缘，小比例。",
    compositionIntent: "更像主视觉发布图，标题更有仪式感。",
    avoid: ["标题压住复杂背景"],
    prompt:
      "使用中心标题版式，让标题在中上或中心区域形成仪式感，下方或侧下方承载信息，适合发布会和成果展示。",
  },
  sideTitle: {
    label: "侧边标题版式",
    suitableFor: ["商务活动", "长图封面", "课程发布", "公司活动"],
    titleArea: "左侧或右侧纵向视觉信息区。",
    infoArea: "另一侧底部或下方。",
    logoArea: "上方角落。",
    mascotArea: "底部角落。",
    compositionIntent: "形成明显左右分栏或侧边构图。",
    avoid: ["左右两边都太满"],
    prompt:
      "使用侧边标题版式，形成明显左右分栏或侧边视觉信息区，另一侧保留背景主视觉和信息承载空间。",
  },
  bottomTitle: {
    label: "底部标题版式",
    suitableFor: ["强主视觉", "读书节", "文学活动", "IP 活动"],
    titleArea: "下方或中下方。",
    infoArea: "标题下方或底部整合。",
    logoArea: "上方角落。",
    mascotArea: "标题区附近。",
    compositionIntent: "让上半部分释放给背景主视觉。",
    avoid: ["底部信息过挤"],
    prompt:
      "使用底部标题版式，将标题和信息集中在下方或中下方，让上半部分充分释放给背景主视觉。",
  },
  eventPoster: {
    label: "活动海报版式",
    suitableFor: ["线下活动", "游园会", "比赛", "节日活动", "强营销"],
    titleArea: "中部或上中部强标题卡。",
    infoArea: "可以集中成活动信息块。",
    logoArea: "顶部或信息块附近。",
    mascotArea: "可参与活动氛围，但仍由后期合成。",
    compositionIntent: "更接近完整活动海报，不只是背景底板。",
    avoid: ["信息过多导致杂乱"],
    prompt:
      "使用活动海报版式，以中部或上中部强标题卡和集中信息块组织画面，更接近完整活动海报。",
  },
};
