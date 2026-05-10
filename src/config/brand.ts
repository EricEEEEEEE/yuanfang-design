export type BrandAssetPosition = {
  x: number;
  y: number;
  width: number;
};

export type BrandConfig = {
  primaryColor: string;
  secondaryColor: string;
  logoPath: string;
  mascotPath: string;
  fontFamily: string;
  logoPosition: BrandAssetPosition;
  mascotPosition: BrandAssetPosition;
};

export const BRAND: BrandConfig = {
  primaryColor: "#2F80ED",
  secondaryColor: "#F2994A",
  logoPath: "assets/logo/logo-main.png",
  mascotPath: "assets/mascot/elephant-main.png",
  fontFamily: "sans-serif",
  logoPosition: {
    x: 40,
    y: 40,
    width: 120,
  },
  mascotPosition: {
    x: 900,
    y: 1300,
    width: 150,
  },
};
