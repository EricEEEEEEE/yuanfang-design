"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardUser = {
  name: string;
  phone: string;
  role: string;
};

type MeResponse = {
  user?: DashboardUser;
};

type ModeEntry = {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
};

const TOKEN_KEY = "yuanfang_token";
const USER_KEY = "yuanfang_user";

const MODE_ENTRIES: ModeEntry[] = [
  {
    title: "标准模式",
    description: "选择主题和风格，一键生成品牌海报",
    buttonLabel: "进入标准模式",
    href: "/standard",
  },
  {
    title: "优化模式",
    description: "上传课堂照片，快速美化并加上品牌包装",
    buttonLabel: "进入优化模式",
    href: "/optimize",
  },
  {
    title: "生成记录",
    description: "查看历史生成图片和下载记录",
    buttonLabel: "查看记录",
    href: "/history",
  },
];

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    let isActive = true;

    if (!token) {
      router.replace("/login");
      return () => {
        isActive = false;
      };
    }

    async function loadUser(): Promise<void> {
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("AUTH_FAILED");
        }

        const result = (await response.json()) as MeResponse;

        if (!result.user) {
          throw new Error("USER_MISSING");
        }

        if (isActive) {
          setUser(result.user);
        }
      } catch {
        clearSession();
        router.replace("/login");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      isActive = false;
    };
  }, [router]);

  function handleLogout(): void {
    clearSession();
    router.replace("/login");
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">加载中…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">远方智设</h1>
            <p className="mt-2 text-sm text-slate-500">
              欢迎回来，{user.name}
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            onClick={handleLogout}
            type="button"
          >
            退出登录
          </button>
        </header>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-950">
            用户信息
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">姓名</dt>
              <dd className="mt-1 text-sm font-medium text-slate-950">
                {user.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">手机号</dt>
              <dd className="mt-1 text-sm font-medium text-slate-950">
                {user.phone}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">角色</dt>
              <dd className="mt-1 text-sm font-medium text-slate-950">
                {user.role}
              </dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {MODE_ENTRIES.map((entry) => (
            <article
              className="flex min-h-48 flex-col rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
              key={entry.href}
            >
              <h2 className="text-lg font-semibold text-slate-950">
                {entry.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">
                {entry.description}
              </p>
              <button
                className="mt-5 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                onClick={() => router.push(entry.href)}
                type="button"
              >
                {entry.buttonLabel}
              </button>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
