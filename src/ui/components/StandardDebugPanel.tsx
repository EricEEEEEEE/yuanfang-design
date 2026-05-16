import type { StandardGenerateV2Response } from "@/models/standard-generation-api-v2";

type StandardDebugPanelProps = {
  response: StandardGenerateV2Response;
};

export function StandardDebugPanel({ response }: StandardDebugPanelProps) {
  const formMapping = response.diagnostics?.formMappingSummary;
  const items = [
    { label: "requestId", value: response.requestId },
    { label: "reason", value: response.reason },
    { label: "errorCode", value: response.error?.code || "-" },
    { label: "safety", value: response.safety?.codes.join(", ") || "-" },
    { label: "warnings", value: response.diagnostics?.warnings?.join(", ") || "-" },
    { label: "productOutputType", value: String(formMapping?.productOutputType ?? "-") },
    { label: "designFamily", value: String(formMapping?.designFamily ?? "-") },
    { label: "sceneKey", value: String(formMapping?.sceneKey ?? "-") },
  ];

  return (
    <details className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer text-base font-semibold text-slate-950">
        调试信息（内部）
      </summary>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {items.map((item) => (
          <div className="flex justify-between gap-4" key={item.label}>
            <dt className="text-slate-500">{item.label}</dt>
            <dd className="break-all text-right font-medium text-slate-950">{item.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
