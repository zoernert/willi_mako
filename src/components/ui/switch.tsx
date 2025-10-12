import * as React from 'react';

type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ onCheckedChange, onChange, ...props }, ref) => {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event);
    onCheckedChange?.(event.target.checked);
  };

  return (
    <label className="inline-flex cursor-pointer items-center">
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        onChange={handleChange}
        {...props}
      />
      <span className="mr-2 text-sm text-slate-700">{props['aria-label']}</span>
      <span className="relative h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-slate-900">
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
});
Switch.displayName = 'Switch';
