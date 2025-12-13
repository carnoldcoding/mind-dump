interface NumTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const NumTextField = ({ label, value, onChange }: NumTextFieldProps) => {
  return (
    <div className="border border-nier-150 flex h-12 relative w-full">
      <input 
        type="text" 
        value={value}
        inputMode="numeric"
        maxLength= {3}
        onChange={(e) => onChange(e.target.value)}
        pattern="^\d+(\.\d+)?$"
        placeholder=" " 
        className="peer focus:outline focus:border-nier-dark w-full p-2 px-4"
      />
      <label className="absolute left-4 top-3 text-gray-500 pointer-events-none transition-all peer-focus:top-[-10px] peer-focus:left-2 peer-focus:text-sm peer-focus:bg-nier-100-lighter peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:bg-nier-100-lighter peer-[:not(:placeholder-shown)]:px-1">
        {label}
      </label>
    </div>
  );
};