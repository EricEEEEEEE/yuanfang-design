export type StandardDesignFamilyKey =
  | "businessLaunch"
  | "educationGrowth"
  | "achievementShowcase"
  | "literaryEditorial"
  | "modernChinese"
  | "ipCartoonEvent"
  | "boldCampaign"
  | "minimalPremium";

export type StandardDesignFamily = {
  label: string;
  suitableFor: string[];
  visualLanguage: string[];
  compositionRules: string[];
  avoid: string[];
  prompt: string;
};

export const STANDARD_DESIGN_FAMILIES: Record<
  StandardDesignFamilyKey,
  StandardDesignFamily
> = {
  businessLaunch: {
    label: "商务发布会风",
    suitableFor: ["公司活动", "周年庆", "课程发布", "总部通知", "品牌会议"],
    visualLanguage: [
      "深蓝",
      "橙红",
      "商务光效",
      "发布会舞台",
      "数字纪念",
      "品牌色块",
    ],
    compositionRules: [
      "可根据物料尺寸使用横向或中心发布会构图",
      "保留强标题区",
      "使用灯光聚焦强化正式感",
    ],
    avoid: ["儿童插画", "书页山水", "低幼卡通"],
    prompt:
      "偏商务发布会视觉，使用深蓝、橙红、商务光效、发布会舞台、数字纪念和品牌色块，形成正式、清晰、有品牌发布感的画面。",
  },
  educationGrowth: {
    label: "教育成长路径风",
    suitableFor: ["招生", "公开课", "课程升级", "学习规划"],
    visualLanguage: [
      "成长路径",
      "阶梯",
      "向上光束",
      "现代教育空间",
      "课程模块",
      "打开世界",
    ],
    compositionRules: [
      "使用斜向成长动线",
      "中部或右侧设置视觉焦点",
      "保留清晰标题区",
    ],
    avoid: ["国风过重", "卷轴山水", "杂乱课堂"],
    prompt:
      "偏教育成长路径视觉，使用向上动线、成长路径、现代教育空间、课程模块和打开世界的隐喻，体现学习升级和课程价值。",
  },
  achievementShowcase: {
    label: "成果展示风",
    suitableFor: ["汇报课", "家长开放日", "教学比赛", "作品展示"],
    visualLanguage: [
      "舞台光",
      "作品墙",
      "奖章",
      "展示台",
      "表达麦克风",
      "荣誉感",
    ],
    compositionRules: ["使用舞台或展陈空间", "中部聚光", "设置作品展示区域"],
    avoid: ["大型商业演出", "拟人老师学生", "低幼"],
    prompt:
      "偏成果展示视觉，使用展陈空间、舞台聚光、作品展示区、奖章、表达麦克风和荣誉感，体现孩子成长成果。",
  },
  literaryEditorial: {
    label: "文学杂志风",
    suitableFor: ["读书节", "文学周", "阅读活动", "一本好书"],
    visualLanguage: [
      "纸张层次",
      "杂志排版感",
      "书页空间",
      "阅读灯光",
      "文学世界",
    ],
    compositionRules: ["使用编辑版面感", "突出局部主题物件", "保持克制留白"],
    avoid: ["小清新手账", "普通书店海报", "儿童绘本"],
    prompt:
      "偏文学杂志视觉，使用纸张层次、编辑版面节奏、书页空间、阅读灯光和文学世界，保持文艺但有品牌秩序。",
  },
  modernChinese: {
    label: "现代国风风",
    suitableFor: ["诗词", "国学", "名著", "传统文化"],
    visualLanguage: [
      "红金青绿",
      "山水",
      "卷轴",
      "月亮",
      "竹子",
      "古典建筑",
      "章回小说感",
    ],
    compositionRules: [
      "使用现代国风 KV",
      "营造文化空间",
      "平衡留白与古典元素",
    ],
    avoid: ["廉价古风游戏", "沉闷古板", "所有主题泛用国风"],
    prompt:
      "偏现代国风主视觉，使用红金青绿、山水、卷轴、月亮、竹子、古典建筑和章回小说感，保持现代、轻盈、有教育品牌质感。",
  },
  ipCartoonEvent: {
    label: "品牌 IP 活动风",
    suitableFor: ["线下公开课", "游园会", "儿童互动", "节日活动"],
    visualLanguage: [
      "高质量卡通",
      "品牌 IP 化",
      "活动道具",
      "游戏感",
      "趣味互动",
    ],
    compositionRules: [
      "营造活动场景感",
      "角色以小比例或中比例出现",
      "角色必须具有品牌化气质",
    ],
    avoid: ["拟人老师学生", "低幼儿童乐园", "课本人物"],
    prompt:
      "偏品牌 IP 活动视觉，使用高质量卡通、活动道具、游戏互动和品牌化角色氛围，但避免低幼和廉价拟人。",
  },
  boldCampaign: {
    label: "强营销活动风",
    suitableFor: ["招生冲刺", "报名提醒", "短期活动", "开班提醒"],
    visualLanguage: [
      "大色块",
      "高对比",
      "冲击力",
      "活动标签感",
      "明确转化导向",
    ],
    compositionRules: ["设置大标题区", "使用强视觉焦点", "使用品牌色块动势"],
    avoid: ["复杂叙事", "过度文艺", "信息不清楚"],
    prompt:
      "偏强营销活动视觉，使用大色块、高对比、强视觉焦点、活动标签感和明确转化导向，适合报名和开班提醒。",
  },
  minimalPremium: {
    label: "高级留白风",
    suitableFor: ["家长通知", "课程说明", "品牌理念", "校区公告"],
    visualLanguage: [
      "克制留白",
      "浅色结构",
      "低复杂度",
      "少量品牌元素",
      "质感光影",
    ],
    compositionRules: ["保留大面积可读区域", "主题符号少而准"],
    avoid: ["纯空白模板", "过度素淡", "缺少品牌记忆点"],
    prompt:
      "偏高级留白视觉，使用克制留白、浅色结构、低复杂度、少量品牌元素和质感光影，保留大面积可读区域但不能像空模板。",
  },
};
