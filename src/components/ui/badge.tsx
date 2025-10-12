import * as React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
};

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-900 text-white',
  secondary: 'bg-slate-100 text-slate-900',
  outline: 'border border-slate-300 text-slate-700',
  destructive: 'bg-red-500 text-white'
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variantClass = variantClasses[variant] ?? variantClasses.default;
    const merged = ['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variantClass, className]
      .filter(Boolean)
      .join(' ');

    return <span ref={ref} className={merged} {...props} />;
  }
);
Badge.displayName = 'Badge';
