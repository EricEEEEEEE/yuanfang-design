"use client";

import { FormEvent, useState } from "react";
import { STANDARD_ELEMENTS, STANDARD_STYLES, STANDARD_THEMES } from "@/config/scenes";

type Option = {
  key: string;
  label: string;
};

type OptionGroupProps = {
  title: string;
  options: Option[];
  selectedKey: string;
  onSelect: (key: string) => void;
};

const themeOptions = Object.entries(STANDARD_THEMES).map(([key, value]) => ({
  key,
  label: value.label,
}));
const styleOptions = Object.entries(STANDARD_STYLES).map(([key, value]) => ({
  key,
  label: value.label,
}));
const elementOptions = Object.entries(STANDARD_ELEMENTS).map(([key, value]) => ({
  key,
  label: value.label,
}));

function findLabel(options: Option[], selectedKey: string): string {
  return options.find((option) => option.key === selectedKey)?.label ?? "";
}

function OptionGroup({
  title,
  options,
  selectedKey,
  onSelect,
}: OptionGroupProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = option.key === selectedKey;

          return (
            <button
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                isSelected
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
              }`}
              key={option.key}
              onClick={() => onSelect(option.key)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function StandardPage() {
  const [selectedTheme, setSelectedTheme] = useState(themeOptions[0].key);
  const [selectedStyle, setSelectedStyle] = useState(styleOptions[0].key);
  const [selectedElement, setSelectedElement] = useState(elementOptions[0].key);
  const [campusName, setCampusName] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [campusPhone, setCampusPhone] = useState("");
  const [notice, setNotice] = useState("");
  const summaryItems = [
    { label: "已选主题", value: findLabel(themeOptions, selectedTheme) },
    { label: "已选风格", value: findLabel(styleOptions, selectedStyle) },
    { label: "已选元素", value: findLabel(elementOptions, selectedElement) },
    { label: "校区名称", value: campusName || "-" },
    { label: "校区地址", value: campusAddress || "-" },
    { label: "联系电话", value: campusPhone || "-" },
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("生成功能下一阶段接入");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">标准模式</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              选择主题、风格和画面元素，生成远方文学品牌海报。
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
          <OptionGroup
            onSelect={setSelectedTheme}
            options={themeOptions}
            selectedKey={selectedTheme}
            title="主题词"
          />
          <OptionGroup
            onSelect={setSelectedStyle}
            options={styleOptions}
            selectedKey={selectedStyle}
            title="风格词"
          />
          <OptionGroup
            onSelect={setSelectedElement}
            options={elementOptions}
            selectedKey={selectedElement}
            title="元素词"
          />

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-slate-950">校区信息</h2>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">校区名称</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setCampusName(event.target.value)}
                placeholder="请输入校区名称"
                value={campusName}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">校区地址</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                onChange={(event) => setCampusAddress(event.target.value)}
                placeholder="请输入校区地址"
                value={campusAddress}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">联系电话</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                inputMode="tel"
                onChange={(event) => setCampusPhone(event.target.value)}
                placeholder="请输入联系电话"
                value={campusPhone}
              />
            </label>
          </section>

          <button
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            type="submit"
          >
            生成海报
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
