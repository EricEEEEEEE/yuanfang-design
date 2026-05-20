export type BrandAssetPosition = {
  x: number;
  y: number;
  width: number;
};

export type BrandLogoVariantKey =
  | "colorFullLockup"
  | "whiteLockup"
  | "deepBlueLockup"
  | "monochromeDark"
  | "monochromeLight";

export type BrandLogoVariant = {
  key: BrandLogoVariantKey;
  path: string;
  derived: boolean;
  intendedBackground: string;
  description: string;
  fullLockup: true;
};

export type BrandColors = {
  red: string;
  orange: string;
  green: string;
  skyBlue: string;
  deepBlue: string;
};

export type BrandConfig = {
  name: string;
  englishName: string;
  colors: BrandColors;
  logoPath: string;
  logoSymbolPath: string;
  logoVariants: Record<BrandLogoVariantKey, BrandLogoVariant>;
  mascotPath: string;
  fontFamily: string;
  logoPosition: BrandAssetPosition;
  mascotPosition: BrandAssetPosition;
};

export const BRAND: BrandConfig = {
  name: "花开远方",
  englishName: "BLOOMING FUTURE",
  colors: {
    red: "#C30D23",
    orange: "#EF7A00",
    green: "#8FC31F",
    skyBlue: "#2EA7E0",
    deepBlue: "#004089",
  },
  logoPath: "assets/logo/logo-main.png",
  logoSymbolPath: "assets/logo/logo-symbol.png",
  logoVariants: {
    colorFullLockup: {
      key: "colorFullLockup",
      path: "assets/logo/logo-lockup-color.png",
      derived: true,
      intendedBackground: "light clean background",
      description: "Internal v1 full-color lockup derived from logo-main.png.",
      fullLockup: true,
    },
    whiteLockup: {
      key: "whiteLockup",
      path: "assets/logo/logo-lockup-white.png",
      derived: true,
      intendedBackground: "dark clean background",
      description: "Internal v1 white full lockup derived from logo-main.png alpha.",
      fullLockup: true,
    },
    deepBlueLockup: {
      key: "deepBlueLockup",
      path: "assets/logo/logo-lockup-deepblue.png",
      derived: true,
      intendedBackground: "warm pale or light blue background",
      description: "Internal v1 deep-blue full lockup derived from logo-main.png alpha.",
      fullLockup: true,
    },
    monochromeDark: {
      key: "monochromeDark",
      path: "assets/logo/logo-lockup-dark.png",
      derived: true,
      intendedBackground: "very light neutral background",
      description: "Internal v1 dark monochrome full lockup derived from logo-main.png alpha.",
      fullLockup: true,
    },
    monochromeLight: {
      key: "monochromeLight",
      path: "assets/logo/logo-lockup-light.png",
      derived: true,
      intendedBackground: "dark or saturated background",
      description: "Internal v1 light monochrome full lockup derived from logo-main.png alpha.",
      fullLockup: true,
    },
  },
  mascotPath: "assets/mascot/elephant-main.png",
  fontFamily: "sans-serif",
  logoPosition: {
    x: 852,
    y: 60,
    width: 180,
  },
  mascotPosition: {
    x: 800,
    y: 1260,
    width: 190,
  },
};
