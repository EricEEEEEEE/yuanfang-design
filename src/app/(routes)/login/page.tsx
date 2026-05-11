"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_INVITE_CODE"
  | "USER_NOT_FOUND"
  | "USER_INACTIVE"
  | "JWT_SECRET_MISSING"
  | "AUTH_SERVICE_ERROR";

type LoginSuccess = {
  token: string;
  user: unknown;
};

type LoginFailure = {
  error?: string;
};

const ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  INVALID_REQUEST: "请输入手机号和邀请码",
  INVALID_INVITE_CODE: "邀请码错误",
  USER_NOT_FOUND: "用户不存在",
  USER_INACTIVE: "账号已停用",
  JWT_SECRET_MISSING: "系统配置缺失，请联系管理员",
  AUTH_SERVICE_ERROR: "登录失败，请稍后重试",
};

function getErrorMessage(code: string | undefined): string {
  if (code && code in ERROR_MESSAGES) {
    return ERROR_MESSAGES[code as LoginErrorCode];
  }

  return "登录失败，请稍后重试";
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    const trimmedPhone = phone.trim();
    const trimmedInviteCode = inviteCode.trim();

    if (!trimmedPhone || !trimmedInviteCode) {
      setErrorMessage(ERROR_MESSAGES.INVALID_REQUEST);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: trimmedPhone,
          inviteCode: trimmedInviteCode,
        }),
      });

      const result = (await response.json()) as LoginSuccess | LoginFailure;

      if (!response.ok) {
        setErrorMessage(getErrorMessage((result as LoginFailure).error));
        return;
      }

      const session = result as LoginSuccess;
      localStorage.setItem("yuanfang_token", session.token);
      localStorage.setItem("yuanfang_user", JSON.stringify(session.user));
      router.push("/dashboard");
    } catch {
      setErrorMessage(ERROR_MESSAGES.AUTH_SERVICE_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-950">远方智设</h1>
          <p className="mt-3 text-sm text-slate-500">
            远方文学 AI 品牌图片工具
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">手机号</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              inputMode="tel"
              name="phone"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="请输入手机号"
              type="tel"
              value={phone}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">邀请码</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              name="inviteCode"
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="请输入邀请码"
              type="text"
              value={inviteCode}
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "登录中…" : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
