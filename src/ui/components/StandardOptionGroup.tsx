type StandardOption = {
  key: string;
  label: string;
};

type StandardOptionGroupProps = {
  title: string;
  options: StandardOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
};

export function StandardOptionGroup({
  title,
  options,
  selectedKey,
  onSelect,
}: StandardOptionGroupProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <button
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
              option.key === selectedKey
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
            }`}
            key={option.key}
            onClick={() => onSelect(option.key)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

type StandardTextInputProps = {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function StandardTextInput({
  label,
  value,
  placeholder,
  onChange,
}: StandardTextInputProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
