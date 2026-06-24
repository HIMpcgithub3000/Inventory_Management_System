import { Search, X } from "lucide-react";

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-8"
        type="search"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-500"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-brand-200 bg-white p-0.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`relative rounded-md px-3 py-1.5 text-xs font-medium transition ${
              active ? "bg-brand-600 text-white shadow-sm" : "text-brand-500 hover:text-brand-700"
            }`}
          >
            {o.label}
            {o.count != null && (
              <span className={`ml-1.5 tnum ${active ? "text-white/80" : "text-brand-300"}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
