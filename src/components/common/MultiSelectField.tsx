import { useState, useEffect } from "react";

interface MultiSelectFieldProps {
  label: string;
  options: string[];
  value?: string[];
  onChange: (value: string[]) => void;
}

export const MutliSelectField = ({ label, options, value = [], onChange }: MultiSelectFieldProps) => {
  const [isOpen, setIsOpen]   = useState(false);
  const [chosen, setChosen]   = useState<string[]>(value);
  const [choices, setChoices] = useState<string[]>([]);

  useEffect(() => {
    setChosen(value);
    setChoices(options.filter(o => !value.includes(o)));
  }, [value, options]);

  const handleChoose = (option: string) => {
    const next = [...chosen, option];
    setChosen(next);
    setChoices(choices.filter(c => c !== option));
    onChange(next);
  };

  const handleRemove = (item: string) => {
    const next = chosen.filter(c => c !== item);
    setChosen(next);
    setChoices(prev => [...prev, item]);
    onChange(next);
  };

  return (
    <div
      tabIndex={0}
      onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      onClick={() => setIsOpen(o => !o)}
      className="border border-nier-150 h-12 relative w-full cursor-pointer select-none"
    >
      {/* Selected pills */}
      <div className="absolute inset-0 px-3 pr-8 flex items-center gap-2 overflow-x-auto">
        {chosen.map((c, i) => (
          <div
            key={i}
            onMouseDown={(e) => { e.stopPropagation(); handleRemove(c); }}
            className="bg-nier-dark px-2 py-0.5 flex items-center gap-1 flex-shrink-0"
          >
            <p className="text-sm text-nier-100-lighter capitalize leading-none">{c}</p>
            <span className="text-nier-text-light text-xs leading-none">×</span>
          </div>
        ))}
      </div>

      {/* Floating label */}
      <label className={`absolute pointer-events-none transition-all text-gray-500 ${
        chosen.length > 0
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
      {isOpen && choices.length > 0 && (
        <aside
          className="absolute top-[100%] left-[-1px] w-[calc(100%+2px)] max-h-32 bg-nier-100-lighter border border-nier-150 border-t-0 z-99 overflow-y-scroll"
          onClick={(e) => e.stopPropagation()}
        >
          {choices.map((option, i) => (
            <div
              key={i}
              onMouseDown={() => handleChoose(option)}
              className="px-4 py-2 capitalize cursor-pointer border-b border-nier-150 last:border-b-0 hover:bg-nier-100"
            >
              <p>{option}</p>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
};
