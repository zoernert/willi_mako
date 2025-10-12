import * as React from 'react';

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'destructive';
};

const variantClasses: Record<NonNullable<AlertProps['variant']>, string> = {
  default: 'border-slate-200 bg-white text-slate-900',
  destructive: 'border-red-200 bg-red-50 text-red-900'
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const merged = [
      'rounded-lg border px-4 py-3 text-sm shadow-sm',
      variantClasses[variant] ?? variantClasses.default,
      className
    ]
      .filter(Boolean)
      .join(' ');

    return <div ref={ref} role="alert" className={merged} {...props} />;
  }
);
Alert.displayName = 'Alert';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <p ref={ref} className={['leading-relaxed', className].filter(Boolean).join(' ')} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';
