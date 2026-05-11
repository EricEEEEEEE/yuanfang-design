export type BrandAssetPosition = {
  x: number;
  y: number;
  width: number;
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
  mascotPath: "assets/mascot/elephant-main.png",
  fontFamily: "sans-serif",
  logoPosition: {
    x: 852,
    y: 60,
    width: 180,
  },
  mascotPosition: {
    x: 760,
    y: 1220,
    width: 220,
  },
};
