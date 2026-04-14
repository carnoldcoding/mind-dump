import { useState } from "react";

interface SelectFieldProps {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
}

export const SelectField = ({ label, options, value, onChange }: SelectFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div
      tabIndex={0}
      onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      onClick={() => setIsOpen(o => !o)}
      className="border border-nier-150 flex h-12 relative w-full cursor-pointer select-none"
    >
      {/* Current value */}
      <div className="w-full p-2 px-4 flex items-center">
        <span className="capitalize text-nier-text-dark">{value || ''}</span>
      </div>

      {/* Floating label */}
      <label className={`absolute pointer-events-none transition-all text-gray-500 ${
        value
          ? 'top-[-10px] left-2 text-sm bg-nier-100-lighter px-1'
          : 'top-3 left-4'
      }`}>
        {label}
      </label>

      {/* Caret */}
      <div className="absolute right-3 top-0 h-full flex items-center pointer-events-none">
        <ion-icon name={isOpen ? 'caret-up-outline' : 'caret-down-outline'}></ion-icon>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <aside className="absolute top-[100%] left-[-1px] w-[calc(100%+2px)] max-h-32 bg-nier-100-lighter border border-nier-150 border-t-0 z-99 overflow-y-scroll">
          {options.map((option, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(option)}
              className={`px-4 py-2 capitalize cursor-pointer border-b border-nier-150 last:border-b-0 hover:bg-nier-100 ${value === option ? 'bg-nier-100' : ''}`}
            >
              <p>{option}</p>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
};
