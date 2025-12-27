import { useState, useEffect } from "react"

interface MultiSelectFieldProps {
  label: string;
  options: string[];
  value?: string[];
  onChange: (value: string[]) => void;
}

export const MutliSelectField = ({ label, options, value = [], onChange }: MultiSelectFieldProps) => {
  const [choices, setChoices] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>(value);

  useEffect(() => {
    setChosen(value);
    setChoices(options.filter(option => !value.includes(option)));
  }, [value, options]);

  const handleChoose = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue) {
      const newChosen = [...chosen, selectedValue];
      setChosen(newChosen);
      setChoices(choices.filter(choice => choice !== selectedValue));
      onChange(newChosen);
      e.target.value = "";
    }
  }

  const handleRemove = (itemToRemove: string) => {
    const newChosen = chosen.filter(c => c !== itemToRemove);
    setChosen(newChosen);
    setChoices([...choices, itemToRemove]);
    onChange(newChosen);
  }

  return (
    <div className="border border-nier-150 flex h-12 relative w-full">
      <select 
        className="peer focus:outline focus:border-gray-800 w-full p-2 px-4 appearance-none bg-nier-100-lighter cursor-pointer capitalize"
        value=""
        onChange={handleChoose}
      >
        <option value="" disabled hidden></option>
        {choices.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="absolute top-2 left-4 flex gap-2 overflow-x-scroll pointer-events-auto">
        {chosen.map((choice, index) => (
          <div 
            className="rounded-md bg-nier-dark px-2 py-1 flex gap-2 cursor-pointer" 
            key={index}
            onClick={() => handleRemove(choice)}
          >
            <p className="text-sm text-nier-100-lighter">{choice}</p>
          </div>
        ))}
      </div>
      <label className="absolute left-4 top-3 text-gray-500 pointer-events-none transition-all peer-focus:top-[-10px] peer-focus:left-2 peer-focus:text-sm peer-focus:bg-nier-100-lighter peer-focus:px-1 peer-[:not([value=''])]:top-[-10px] peer-[:not([value=''])]:left-2 peer-[:not([value=''])]:text-sm peer-[:not([value=''])]:bg-nier-100-lighter peer-[:not([value=''])]:px-1">
        {label}
      </label>
      <svg className="absolute right-3 top-4 pointer-events-none w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}