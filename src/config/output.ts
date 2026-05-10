export type OutputFormat = "jpeg";

export type OutputConfig = {
  standardWidth: number;
  hdWidth: number;
  jpegQuality: number;
  hdJpegQuality: number;
  format: OutputFormat;
};

export const OUTPUT: OutputConfig = {
  standardWidth: 1080,
  hdWidth: 2048,
  jpegQuality: 78,
  hdJpegQuality: 85,
  format: "jpeg",
};
