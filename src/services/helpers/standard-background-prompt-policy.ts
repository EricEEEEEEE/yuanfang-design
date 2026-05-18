export const PROMPT_VERSION = "standard-background-prompt-v1";

export const TEMPLATE_SOURCES = [
  "docs/STANDARD_PROMPT_LANGUAGE_V2.md",
  "templates/_base.json",
  "templates/_brand-rules.json",
  "templates/standard/themes.json",
  "templates/standard/styles.json",
  "templates/standard/elements.json",
];

export const FORBIDDEN_ELEMENTS = [
  "readable text", "Chinese title text", "English title text", "fake Chinese characters",
  "logo", "Yuanfang logo", "mascot", "QR code", "campus phone", "address", "watermark",
];

export const PRODUCT_LABELS = {
  achievementShowcase: "成果展示图",
  enrollment: "招生宣传图",
  festival: "节日活动图",
  classReview: "课堂回顾图",
  parentNotice: "家长通知图",
  socialPost: "朋友圈传播图",
};

export const BENCHMARK_STANDARD = "Yuanfang education-brand key visual benchmark: thematic campaign background, strong primary visual hook, rich controlled visual density framing protected safe zones, clear title-safe zone, clear logo-safe zone, professional brand material quality, not generic AI art.";

export const BENCHMARK_FAMILIES = {
  enrollment: "Benchmark family A: enrollment / open class / literary activity key visual; bright, social-share friendly, course value visible, theme readable at a glance without text.",
  achievementShowcase: "Benchmark family B: achievement showcase / report class key visual; stage light, works wall, growth path, ceremony, parent witness feeling.",
  festival: "Benchmark family C: festival / poetry / modern Chinese culture key visual; scrolls, seasonal symbols, literary atmosphere, modern not old-fashioned.",
  classReview: "Benchmark family B: achievement showcase / class review key visual; works wall, classroom outcome space, warm spotlight, growth evidence.",
  parentNotice: "Benchmark family D: brand / notice key visual; structured brand blocks, clean hierarchy, strong safe zones, not empty template.",
  socialPost: "Benchmark family D: company activity / launch / brand event key visual; launch-stage energy, brand color motion, strong visual impact.",
};
