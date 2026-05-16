type StandardFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  maxLength?: number;
};

export function StandardFormInput({
  label,
  value,
  placeholder,
  onChange,
  error,
  helper,
  maxLength,
}: StandardFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {helper ? <span className="mt-1 block text-sm leading-6 text-slate-500">{helper}</span> : null}
      <input
        className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {error ? <span className="mt-2 block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}

export function StandardFormTextarea({
  label,
  value,
  placeholder,
  onChange,
  error,
  helper,
  maxLength,
}: StandardFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {helper ? <span className="mt-1 block text-sm leading-6 text-slate-500">{helper}</span> : null}
      <textarea
        className="mt-2 min-h-28 w-full resize-y rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <span className={`mt-2 block text-sm ${error ? "text-red-600" : "text-slate-400"}`}>
        {error ?? (maxLength ? `${value.length}/${maxLength}` : "")}
      </span>
    </label>
  );
}
