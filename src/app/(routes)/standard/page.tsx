export default function StandardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-950">标准模式</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          选择主题和风格，一键生成远方文学品牌海报。
        </p>
        <div className="mt-6 rounded-lg bg-slate-50 px-4 py-5 text-center">
          <p className="text-base font-medium text-slate-700">功能开发中</p>
        </div>
        <a
          className="mt-6 block rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
          href="/dashboard"
        >
          返回 Dashboard
        </a>
      </section>
    </main>
  );
}
