"use client";

import { FormEvent, useState } from "react";
import { OPTIMIZE_SCENES, STANDARD_STYLES } from "@/config/scenes";

type Option = {
  key: string;
  label: string;
};

const sceneOptions: Option[] = Object.entries(OPTIMIZE_SCENES).map(
  ([key, value]) => ({
    key,
    label: value.label,
  }),
);

const styleOptions: Option[] = Object.entries(STANDARD_STYLES).map(
  ([key, value]) => ({
    key,
    label: value.label,
  }),
);

function findLabel(options: Option[], key: string): string {
  return options.find((option) => option.key === key)?.label ?? "";
}

export default function OptimizePage() {
  const [selectedScene, setSelectedScene] = useState(sceneOptions[0].key);
  const [selectedStyle, setSelectedStyle] = useState(styleOptions[0].key);
  const [courseName, setCourseName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState("");
  const summaryItems = [
    { label: "已选场景", value: findLabel(sceneOptions, selectedScene) },
    { label: "已选风格", value: findLabel(styleOptions, selectedStyle) },
    { label: "课程名", value: courseName || "-" },
    { label: "老师姓名", value: teacherName || "-" },
    { label: "一句话描述", value: description || "-" },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("优化生成功能下一阶段接入");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">优化模式</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              上传课堂照片，快速美化并加上品牌包装。
            </p>
          </div>
          <a
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            href="/dashboard"
          >
            返回 Dashboard
          </a>
        </header>

        <form
          className="space-y-8 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
          onSubmit={handleSubmit}
        >
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-950">
              场景选择
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sceneOptions.map((option) => (
                <button
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                    option.key === selectedScene
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                  key={option.key}
                  onClick={() => setSelectedScene(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-950">
              风格选择
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {styleOptions.map((option) => (
                <button
                  className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                    option.key === selectedStyle
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                  key={option.key}
                  onClick={() => setSelectedStyle(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-950">
              上传占位区
            </h2>
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-base font-medium text-slate-700">
                照片上传区域
              </p>
              <p className="mt-2 text-sm text-slate-500">
                真实上传功能将在下一阶段接入
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-slate-950">
              叠加信息
            </h2>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">课程名</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setCourseName(event.target.value)}
                placeholder="请输入课程名"
                value={courseName}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                老师姓名
              </span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setTeacherName(event.target.value)}
                placeholder="请输入老师姓名"
                value={teacherName}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                一句话描述
              </span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="请输入一句话描述"
                value={description}
              />
            </label>
          </section>

          <button
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            type="submit"
          >
            生成优化图
          </button>
          {notice ? (
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {notice}
            </p>
          ) : null}
        </form>

        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-950">当前选择</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div className="flex justify-between gap-4" key={item.label}>
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-medium text-slate-950">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}
