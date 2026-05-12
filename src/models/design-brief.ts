import type { StandardDesignFamilyKey } from "@/config/design-families";

export type ProductOutputType =
  | "mainVisual"
  | "socialPoster"
  | "noticeCard"
  | "wechatHeader"
  | "courseIntro"
  | "longPoster"
  | "eventSchedule"
  | "checkInCard"
  | "workShowcase"
  | "displayBoard"
  | "videoCover"
  | "xiaohongshuCover";

export type StandardDesignBriefInput = {
  designFamily?: StandardDesignFamilyKey;
  productOutputType: ProductOutputType;
  eventBrief: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
};

export type StandardDesignBriefOverlayData = {
  mainTitle: string;
  subtitle?: string;
  campusName: string;
  campusAddress?: string;
  campusPhone: string;
};

export type StandardDesignBriefPromptFields = {
  designFamily?: StandardDesignFamilyKey;
  productOutputType: ProductOutputType;
  eventBrief: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};
