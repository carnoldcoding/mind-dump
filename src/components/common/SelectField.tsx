interface SelectFieldProps {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
}

export const SelectField = ({ label, options, value, onChange }: SelectFieldProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue) onChange(newValue);
  }
  
  return (
    <div className="border border-nier-150 flex h-12 relative w-full">
      <select 
        className="peer focus:outline focus:border-gray-800 w-full p-2 px-4 appearance-none bg-nier-100-lighter cursor-pointer capitalize"
        value={value || ""}
        onChange={handleChange}
      >
        <option value="" disabled hidden></option>
        {options.map((option, index) => (
          <option key={index} value={option}>
            {option}
          </option>
        ))}
      </select>
      <label className="absolute left-4 top-3 text-gray-500 pointer-events-none transition-all peer-focus:top-[-10px] peer-focus:left-2 peer-focus:text-sm peer-focus:bg-nier-100-lighter peer-focus:px-1 peer-[:not([value=''])]:top-[-10px] peer-[:not([value=''])]:left-2 peer-[:not([value=''])]:text-sm peer-[:not([value=''])]:bg-nier-100-lighter peer-[:not([value=''])]:px-1">
        {label}
      </label>
      <svg className="absolute right-3 top-4 pointer-events-none w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}