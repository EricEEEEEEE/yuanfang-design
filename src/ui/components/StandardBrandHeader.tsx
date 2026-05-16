import logoMain from "../../../assets/logo/logo-main.png";
import mascotMain from "../../../assets/mascot/elephant-main.png";

export function StandardBrandHeader() {
  return (
    <header className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <img alt="花开远方 Logo" className="h-10 w-auto max-w-36 object-contain" src={logoMain.src} />
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              远方智设
            </span>
          </div>
          <p className="mt-5 text-sm font-medium text-blue-700">内部测试模式</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">标准模式 v2 预览</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            通过结构化创意简报生成测试海报，当前仍使用固定测试背景，暂不代表正式生产效果。
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-50 sm:h-24 sm:w-24">
            <img alt="远方吉祥物" className="max-h-14 w-auto object-contain sm:max-h-20" src={mascotMain.src} />
          </div>
          <span className="hidden text-xs text-slate-500 sm:block">吉祥物预览</span>
        </div>
      </div>
      <a
        className="mt-5 block rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 sm:inline-block"
        href="/dashboard"
      >
        返回 Dashboard
      </a>
    </header>
  );
}
