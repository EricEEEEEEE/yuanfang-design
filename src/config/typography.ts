export type TextStyleConfig = {
  fontFamily: string;
  fontFilePath?: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  letterSpacing: number;
  lineHeight: number;
  maxCharsPerLine: number;
};

export type FontFaceConfig = {
  family: string;
  filePath?: string;
};

export type TypographyConfig = {
  title: TextStyleConfig;
  subtitle: TextStyleConfig;
  campus: TextStyleConfig;
  info: TextStyleConfig;
  phone: TextStyleConfig;
};

const fontFamily = "PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif";
const titleFontFamily = fontFamily;

export const TYPOGRAPHY: TypographyConfig = {
  title: {
    fontFamily: titleFontFamily,
    fontSize: 76,
    fontWeight: 900,
    fill: "#004089",
    letterSpacing: 1,
    lineHeight: 82,
    maxCharsPerLine: 9,
  },
  subtitle: {
    fontFamily,
    fontSize: 34,
    fontWeight: 700,
    fill: "#EF7A00",
    letterSpacing: 0.5,
    lineHeight: 42,
    maxCharsPerLine: 16,
  },
  campus: {
    fontFamily,
    fontSize: 36,
    fontWeight: 800,
    fill: "#004089",
    letterSpacing: 0.5,
    lineHeight: 44,
    maxCharsPerLine: 15,
  },
  info: {
    fontFamily,
    fontSize: 26,
    fontWeight: 500,
    fill: "#334155",
    letterSpacing: 0,
    lineHeight: 34,
    maxCharsPerLine: 24,
  },
  phone: {
    fontFamily,
    fontSize: 28,
    fontWeight: 800,
    fill: "#C30D23",
    letterSpacing: 0.5,
    lineHeight: 34,
    maxCharsPerLine: 18,
  },
};
