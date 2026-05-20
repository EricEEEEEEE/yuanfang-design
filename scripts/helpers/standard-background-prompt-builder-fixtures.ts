import { BRAND } from "../../src/config/brand";
import type { StandardImagePromptContext } from "../../src/models/standard-background-generation";

export const CANVAS = { width: 1080, height: 1620 };

const BASE_BRAND = {
  brandName: BRAND.name,
  brandEnglishName: BRAND.englishName,
  palette: BRAND.colors,
  visualMotifs: ["阅读", "表达", "成长", "书本", "文学想象"],
  logoPolicy: "Logo is composited later from official assets; AI must not generate it.",
  mascotPolicy: "Mascot is composited later from official assets; AI must not generate it.",
  campusPolicy: "Campus information is composited later as assets; AI must not generate contact text.",
};

const BASE_CONSTRAINTS = {
  forbidReadableText: true,
  forbidLogoGeneration: true,
  forbidMascotGeneration: true,
  forbidCampusTextGeneration: true,
  reserveTitleSpace: true,
  reserveLogoSpace: true,
} as const;

export const FOUR_CLASSICS = context({
  productOutputType: "enrollment",
  eventBrief: "孩子可以通过假期免费上 4 节课，感受四大名著内容，让孩子爱上名著、爱上文学、爱上语文。",
  styleBrief: "能够让家长感受到四大名著的那种感觉，并且一眼能看出来。不要和传统四大名著感觉一样，要有高级感。",
  visualDetails: "希望图片里出现四大名著的代表人物或者书籍，同时表现出孩子渴望阅读四大名著的感觉。",
  titleBrief: "希望突出四大名著四个字，让家长知道我们通过四大名著课程招收孩子。",
  avoidNotes: "不要出现真实儿童照片，不要有压抑的颜色，也不要有日本动漫的感觉。",
  mainTitle: "暑期体验课",
  subtitle: "四大名著体验营",
  hook: "四大名著",
  hookReason: "用户描述中“四大名著”多次出现，但 mainTitle 是“暑期体验课”。",
});

export const ACHIEVEMENT = context({
  productOutputType: "achievementShowcase",
  eventBrief: "孩子完成了阅读表达成果展示，课堂上展示作品墙、阅读分享和表达能力。",
  styleBrief: "希望整体温暖、明亮、有书香气，带一点课堂展示的仪式感。",
  visualDetails: "作品墙、舞台光、书本、展示台和柔和灯光。",
  titleBrief: "突出成长和阅读成果。",
  mainTitle: "成长汇报课",
  subtitle: "阅读成果展示",
  hook: "阅读成果",
});

export const FESTIVAL = context({
  productOutputType: "festival",
  eventBrief: "端午节前发布融合诗词、传统文化和儿童阅读氛围的节日主题海报。",
  styleBrief: "温暖、有书香气，传统但不老气，适合远方文学品牌。",
  visualDetails: "书卷、粽叶、淡雅纹样、节日色彩和儿童阅读氛围。",
  titleBrief: "突出节日阅读活动。",
  avoidNotes: "不要低幼贴纸，不要可读文字。",
  mainTitle: "端午诗会",
  subtitle: "文学节日活动",
  hook: "诗词",
});

export const BRAND_EVENT = context({
  productOutputType: "socialPost",
  eventBrief: "远方文学举办十周年成长庆典，展示品牌十年的成长、课程沉淀和未来愿景。",
  styleBrief: "热烈、现代、有品牌活动感、有庆典感，视觉冲击力强但不要廉价促销。",
  visualDetails: "红橙品牌色块、流动光带、周年庆动线、舞台空间、品牌成长路径。",
  titleBrief: "突出十周年和成长庆典。",
  avoidNotes: "不要过度科技感，不要夜店风。",
  mainTitle: "十周年成长庆典",
  subtitle: "与远方一起走过十年",
  hook: "十周年成长庆典",
});

export const AVOID_STRESS = context({
  productOutputType: "socialPost",
  eventBrief: "发布一张阅读活动朋友圈图，提醒家长带孩子参与文学体验。",
  styleBrief: "干净、现代、有文学感，不要吵闹。",
  visualDetails: "书页空间、阅读灯光、纸张层次。",
  titleBrief: "突出阅读体验。",
  avoidNotes: "不要真实照片,不要黑暗,不要日漫,不要水印,不要电话,不要二维码,不要拥挤,不要低清,不要廉价广告,不要乱码",
  mainTitle: "阅读体验",
  hook: "阅读",
});

export const VALID_NEW_THEME_FIXTURES = [
  ["world book day", context({
    productOutputType: "festival",
    eventBrief: "世界读书日当天，鼓励孩子走进书本、分享阅读感受、和同伴一起发现文学世界。",
    styleBrief: "温暖、有书香气、国际阅读日氛围，不要像普通图书馆宣传。",
    visualDetails: "地球、书本、阅读灯光、孩子想象中的文学世界、打开的书页像通往远方的门。",
    titleBrief: "突出阅读点亮世界。",
    avoidNotes: "不要真实儿童照片，不要图书馆借阅通知感，不要生成文字。",
    mainTitle: "阅读点亮世界",
    subtitle: "世界读书日特别活动",
    hook: "阅读点亮世界",
  })],
  ["debate contest", context({
    productOutputType: "parentNotice",
    eventBrief: "校区举办小学生辩论赛，展示孩子思辨表达、团队合作和舞台发言。",
    styleBrief: "有比赛感、舞台感、思辨感，但不要太严肃。",
    visualDetails: "辩论台、麦克风、对话气泡、聚光灯、两组队伍的抽象对阵感。",
    titleBrief: "突出勇敢表达和思辨能力成长。",
    avoidNotes: "不要真实儿童照片，不要法律法庭风，不要生成文字。",
    mainTitle: "小小辩论赛",
    subtitle: "让观点勇敢发声",
    hook: "辩论赛",
  })],
  ["literary cafe", context({
    productOutputType: "socialPost",
    eventBrief: "远方文学想做一张轻量图文，用咖啡馆和阅读场景表达文学的陪伴感。",
    styleBrief: "现代、文艺、生活方式、温暖、有质感，但不要商业咖啡广告。",
    visualDetails: "窗边、咖啡杯、书本、城市光影、阅读角落、温暖灯光。",
    titleBrief: "像现代文学生活方式主题图。",
    avoidNotes: "不要国风，不要山水，不要生成菜单文字。",
    mainTitle: "文学咖啡馆",
    subtitle: "和故事坐一会儿",
    hook: "文学咖啡馆",
  })],
  ["speech open class", context({
    productOutputType: "enrollment",
    eventBrief: "演讲表达公开课，让孩子练习站上舞台、组织观点、清楚表达自己的想法。",
    styleBrief: "有舞台感、有成长感、有公开课招生感，不要廉价培训广告风。",
    visualDetails: "舞台、聚光灯、麦克风、表达能量、向上的成长线条。",
    titleBrief: "突出孩子表达力成长。",
    avoidNotes: "不要真实儿童照片，不要成功学海报风，不要生成文字。",
    mainTitle: "少年演讲公开课",
    subtitle: "站上舞台，表达自己",
    hook: "演讲表达公开课",
  })],
  ["flying flower poetry challenge", context({
    productOutputType: "festival",
    eventBrief: "校区组织古诗飞花令挑战活动，孩子通过诗词接龙和互动游戏感受古诗之美。",
    styleBrief: "国风、春天、诗词、活动感，画面要灵动，不要老气。",
    visualDetails: "春天花枝、诗词卷轴、团扇、书页、轻盈的国风动线。",
    titleBrief: "标题有挑战感和诗词美感。",
    avoidNotes: "不要土味红金，不要复杂书法字，不要生成文字。",
    mainTitle: "飞花令挑战",
    subtitle: "在诗词里遇见春天",
    hook: "飞花令挑战",
  })],
  ["winter reading camp", context({
    productOutputType: "enrollment",
    eventBrief: "寒假阅读营，孩子集中阅读经典故事、分享读后感、完成表达作品。",
    styleBrief: "冬日、温暖、阅读、成长，有招生活动感，但不要廉价促销。",
    visualDetails: "冬日暖光、书本、雪花、窗户、孩子想象中的故事世界。",
    titleBrief: "让家长感到温暖、有价值。",
    avoidNotes: "不要圣诞老人，不要西方节日符号，不要生成文字。",
    mainTitle: "寒假阅读营",
    subtitle: "让假期长出文学的翅膀",
    hook: "寒假阅读营",
  })],
] as const;

export function context(input: {
  productOutputType: StandardImagePromptContext["form"]["productOutputType"];
  eventBrief: string; styleBrief: string; visualDetails?: string; titleBrief: string; avoidNotes?: string;
  mainTitle: string; subtitle?: string; hook?: string; hookReason?: string;
}): StandardImagePromptContext {
  return {
    source: "standard-form-v2",
    brandKey: "yuanfangDefault",
    canvas: CANVAS,
    form: {
      productOutputType: input.productOutputType,
      eventBrief: input.eventBrief,
      styleBrief: input.styleBrief,
      ...(input.visualDetails ? { visualDetails: input.visualDetails } : {}),
      titleBrief: input.titleBrief,
      ...(input.avoidNotes ? { avoidNotes: input.avoidNotes } : {}),
    },
    title: { mainTitle: input.mainTitle, ...(input.subtitle ? { subtitle: input.subtitle } : {}) },
    visualHook: input.hook ? { primaryHook: input.hook, source: "manual", possibleMismatch: Boolean(input.hookReason), mismatchReason: input.hookReason } : undefined,
    brand: BASE_BRAND,
    constraints: BASE_CONSTRAINTS,
    avoidNotes: input.avoidNotes,
    outputIntent: { backgroundOnly: true, finalPoster: false },
  };
}
