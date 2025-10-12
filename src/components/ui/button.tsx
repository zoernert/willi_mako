import * as React from 'react';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base;

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  outline: 'border border-slate-300 text-slate-900 hover:bg-slate-50',
  ghost: 'text-slate-900 hover:bg-slate-100',
  destructive: 'bg-red-600 text-white hover:bg-red-500'
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-10 w-10 p-0'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', type = 'button', variant = 'default', size = 'default', ...props }, ref) => {
    const baseClass = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
    const merged = mergeClassName(`${baseClass} ${variantClasses[variant]} ${sizeClasses[size]}`, className);

    return <button ref={ref} type={type} className={merged} {...props} />;
  }
);
Button.displayName = 'Button';
