const filters: string[] = [
  "全部",
  "标准模式",
  "优化模式",
  "生成成功",
  "生成失败",
];

const tips: string[] = [
  "标准模式生成的海报会保留在这里",
  "优化模式生成的图片会保留在这里",
  "后续可在这里重新下载已生成图片",
];

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">生成记录</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              查看历史生成图片和下载记录。
            </p>
          </div>
          <a
            className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            href="/dashboard"
          >
            返回 Dashboard
          </a>
        </header>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-950">筛选</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {filters.map((filter) => (
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                key={filter}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-950">
            暂无生成记录
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            完成图片生成后，历史记录会显示在这里。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {tips.map((tip) => (
            <article
              className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
              key={tip}
            >
              <p className="text-sm leading-6 text-slate-600">{tip}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
