import { useState, useEffect, useRef } from "react";

export const TextField = ({ label, value, onChange, disabled, altBg, type, autofillData }: TextFieldProps) => {
  const [filteredData, setFilteredData] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autofillData) {
      setFilteredData(filterDataFromValue(value, autofillData));
    }
  }, [autofillData]); 

  const filterDataFromValue = (searchValue: string, dataSource: string[]) => {
    if (!searchValue || !dataSource?.length) return [];

    const exactMatch = dataSource.find(
      data => data.toLowerCase() === searchValue.toLowerCase()
    );
    if (exactMatch) return [];

    const startsWithMatches = dataSource.filter(data =>
      data.toLowerCase().startsWith(searchValue.toLowerCase())
    );
    
    const startsWithSet = new Set(startsWithMatches.map(d => d.toLowerCase()));
    const containsMatches = dataSource.filter(
      data =>
        data.toLowerCase().includes(searchValue.toLowerCase()) &&
        !startsWithSet.has(data.toLowerCase())
    );

    return [...startsWithMatches, ...containsMatches];
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setFilteredData(filterDataFromValue(newValue, autofillData || []));
  };

  const handleFocus = () => {
    setIsFocused(true);
    setFilteredData(filterDataFromValue(value, autofillData || []));
  };

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 150);
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setFilteredData([]);
    setIsFocused(false);
  };

  return (
    <div className="border border-nier-150 flex h-12 relative w-full">
      <input
        type={type || 'text'}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={' '}
        disabled={disabled}
        className="peer focus:outline focus:border-nier-dark w-full p-2 px-4"
      />
      <label className={`absolute left-4 top-3 text-gray-500 pointer-events-none transition-all peer-focus:top-[-10px] peer-focus:left-2 peer-focus:text-sm peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:px-1 ${
        altBg
          ? `peer-focus:bg-nier-100 peer-[:not(:placeholder-shown)]:bg-nier-100`
          : 'peer-focus:bg-nier-100-lighter peer-[:not(:placeholder-shown)]:bg-nier-100-lighter'
      }`}>
        {label}
      </label>
      {(filteredData.length > 0 && isFocused) && (
        <aside 
          ref={dropdownRef}
          className="absolute flex flex-col top-[100%] left-0 border border-nier-150 border-t-0 w-full max-h-32 bg-nier-100-lighter z-99 overflow-y-scroll"
        >
          {filteredData.map((entry, index) => (
            <div 
              onMouseDown={() => handleSelect(entry)} 
              key={index} 
              className="cursor-pointer hover:bg-nier-100 px-4 py-2 border-nier-150 border border-l-0 border-r-0 border-b-0"
            >
              <p className="capitalize">{entry}</p>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
};