interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  altBg?: boolean;
  type?: string;
}

export const TextField = ({ label, value, onChange, disabled, altBg, type }: TextFieldProps) => {
  return (
    <div className="border border-nier-150 flex h-12 relative w-full">
      <input 
        type={type ? type : 'text'} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" " 
        disabled = {disabled}
        className="peer focus:outline focus:border-nier-dark w-full p-2 px-4"
      />
      <label className={`absolute left-4 top-3 text-gray-500 pointer-events-none transition-all peer-focus:top-[-10px] peer-focus:left-2 peer-focus:text-sm peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-2 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:px-1 ${
        altBg 
          ? `peer-focus:bg-nier-100 peer-[:not(:placeholder-shown)]:bg-nier-100`
          : 'peer-focus:bg-nier-100-lighter peer-[:not(:placeholder-shown)]:bg-nier-100-lighter'
        }`}>
          {label}
        </label>
    </div>
  );
};