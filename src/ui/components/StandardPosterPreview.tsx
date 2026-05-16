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
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-950">v1 预览结果</h2>
        <p className="text-sm text-slate-500">
          {width} x {height}
        </p>
      </div>
      <img
        alt="标准模式 v1 预览图"
        className="mt-4 w-full rounded-lg border border-slate-200"
        src={`data:${mimeType};base64,${base64}`}
      />
    </section>
  );
}
