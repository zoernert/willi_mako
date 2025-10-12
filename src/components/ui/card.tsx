import * as React from 'react';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base;

export const Card = React.forwardRef<HTMLDivElement, DivProps>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={mergeClassName('rounded-lg border border-slate-200 bg-white shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, DivProps>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={mergeClassName('border-b border-slate-100 px-4 py-3', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3 ref={ref} className={mergeClassName('text-lg font-semibold text-slate-900', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<HTMLDivElement, DivProps>(({ className = '', ...props }, ref) => (
  <div ref={ref} className={mergeClassName('px-4 py-5', className)} {...props} />
));
CardContent.displayName = 'CardContent';
