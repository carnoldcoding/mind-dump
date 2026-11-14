import { useId } from "react";

// The inputs the Body views repeat. They draw like the Finances fields — a
// bordered 48px box with a floating label (docs/chrome.md) — so a form here
// reads like a form there.

const floatingLabel =
    "absolute left-4 top-3 text-gray-500 pointer-events-none transition-all peer-focus:top-[-10px] peer-focus:left-2 peer-focus:text-body peer-focus:bg-nier-100-lighter peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-body peer-[:not(:placeholder-shown)]:bg-nier-100-lighter peer-[:not(:placeholder-shown)]:px-1";

/** A count or a weight. Text, not type=number, so a phone shows a number pad and nothing spins. */
export const NumberField = ({ label, value, onChange, decimal = false, autoFocus = false }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    decimal?: boolean;
    /** Takes the keyboard when it appears: the field of the row Today selected. */
    autoFocus?: boolean;
}) => {
    const id = useId();
    return (
        <div className="border border-nier-150 flex h-12 relative w-full min-w-0">
            <input
                id={id}
                type="text"
                inputMode={decimal ? "decimal" : "numeric"}
                autoFocus={autoFocus}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder=" "
                className="peer focus:outline focus:border-nier-dark w-full min-w-0 p-2 px-4"
            />
            <label htmlFor={id} className={floatingLabel}>{label}</label>
        </div>
    );
};

/** A native select, so a phone opens its own picker. `placeholder` is a first option that cannot be chosen. */
export const Select = ({ label, value, onChange, options, placeholder }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}) => (
    <div className="border border-nier-150 flex h-12 relative w-full min-w-0">
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            aria-label={label}
            className="w-full min-w-0 px-3 bg-transparent cursor-pointer focus:outline focus:border-nier-dark"
        >
            {placeholder !== undefined && <option value="" disabled>{placeholder}</option>}
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

/** Two or three choices side by side, the chosen one inverted. */
export const Toggle = <T extends string>({ label, options, value, onChange }: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) => (
    <div role="group" aria-label={label} className="flex gap-2">
        {options.map(o => (
            <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                aria-pressed={value === o.value}
                className={`flex-1 text-label uppercase tracking-wide px-3 min-h-11 border border-nier-dark cursor-pointer transition-colors ${
                    value === o.value ? "bg-nier-text-dark text-nier-100-lighter" : "text-nier-text-dark hover:bg-nier-150/50"
                }`}
            >
                {o.label}
            </button>
        ))}
    </div>
);
