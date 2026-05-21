type StandardPosterPreviewProps = {
  base64: string;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
};

export function StandardPosterPreview({
  base64,
  mimeType,
  width,
  height,
}: StandardPosterPreviewProps) {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const extension = mimeType === "image/jpeg" ? "jpg" : "png";

  return (
    <section className="mx-auto w-full max-w-xl rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-950">预览结果</h2>
        <p className="text-sm text-slate-500">
          {width} x {height}
        </p>
      </div>
      <img
        alt="标准模式预览图"
        className="mt-4 w-full rounded-lg border border-slate-200"
        src={dataUrl}
      />
      <a
        className="mt-4 block rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
        download={`yuanfang-standard-poster-${width}x${height}.${extension}`}
        href={dataUrl}
      >
        下载海报
      </a>
    </section>
  );
}
