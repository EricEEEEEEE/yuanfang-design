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
  productOutputType: ProductOutputType;
  eventBrief: string;
  styleBrief?: string;
  visualDetails?: string;
  avoidNotes?: string;
};
