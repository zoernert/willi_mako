import * as React from 'react';

type SelectBaseProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  value?: string;
  onValueChange?: (value: string) => void;
};

const SELECT_ITEM_SYMBOL = Symbol('SelectItem');
const SELECT_TRIGGER_SYMBOL = Symbol('SelectTrigger');

type SelectItemComponent = React.FC<SelectItemProps> & { __TYPE: symbol };
type SelectTriggerComponent = React.FC<SelectTriggerProps> & { __TYPE: symbol };

interface ParseResult {
  items: SelectItemProps[];
  triggerClassName?: string;
}

const collectItems = (children: React.ReactNode, result: ParseResult): void => {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    const type = child.type as SelectItemComponent | SelectTriggerComponent | React.ComponentType<any>;

    if ((type as SelectItemComponent).__TYPE === SELECT_ITEM_SYMBOL) {
      const { value, children: itemChildren } = child.props as SelectItemProps;
      result.items.push({ value, children: itemChildren });
      return;
    }

    if ((type as SelectTriggerComponent).__TYPE === SELECT_TRIGGER_SYMBOL) {
      const triggerProps = child.props as SelectTriggerProps;
      if (triggerProps.className && !result.triggerClassName) {
        result.triggerClassName = triggerProps.className;
      }
    }

    const childProps = child.props as Record<string, unknown>;
    if (childProps.children) {
      collectItems(childProps.children as React.ReactNode, result);
    }
  });
};

export const Select: React.FC<SelectBaseProps> = ({
  children,
  value,
  onValueChange,
  className = '',
  onChange,
  ...props
}) => {
  const { items, triggerClassName } = React.useMemo(() => {
    const result: ParseResult = { items: [], triggerClassName: undefined };
    collectItems(children, result);
    return result;
  }, [children]);

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    onValueChange?.(event.target.value);
    onChange?.(event);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className={[
        'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        triggerClassName,
        className
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.children}
        </option>
      ))}
    </select>
  );
};

export interface SelectContentProps {
  children: React.ReactNode;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => <>{children}</>;

export interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectTrigger = (({ children }: SelectTriggerProps) => <>{children}</>) as SelectTriggerComponent;
SelectTrigger.__TYPE = SELECT_TRIGGER_SYMBOL;

export interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = () => null;

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export const SelectItem = (({ children }: SelectItemProps) => <>{children}</>) as SelectItemComponent;
SelectItem.__TYPE = SELECT_ITEM_SYMBOL;
