import * as React from 'react';

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

const useDialogContext = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
};

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = React.useState(open);

  React.useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  const setOpen = React.useCallback(
    (value: boolean) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  return <DialogContext.Provider value={{ open: internalOpen, setOpen }}>{children}</DialogContext.Provider>;
};

export interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactElement;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ asChild = false, children }) => {
  const { setOpen } = useDialogContext();
  const child = React.Children.only(children) as React.ReactElement<Record<string, unknown>>;

  const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
    const originalOnClick = child.props.onClick as React.MouseEventHandler<HTMLElement> | undefined;
    originalOnClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(true);
    }
  };

  if (asChild) {
    return React.cloneElement(child, {
      onClick: handleClick
    });
  }

  return React.cloneElement(child, {
    onClick: handleClick
  });
};

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  overlayClassName?: string;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className = '', overlayClassName = '', children, ...props }, ref) => {
    const { open, setOpen } = useDialogContext();

    if (!open) {
      return null;
    }

    const handleOverlayClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
      if (event.target === event.currentTarget) {
        setOpen(false);
      }
    };

    return (
      <div
        className={['fixed inset-0 z-40 flex items-center justify-center bg-black/40', overlayClassName]
          .filter(Boolean)
          .join(' ')}
        onClick={handleOverlayClick}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={['relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg', className]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={['mb-4', className].filter(Boolean).join(' ')} {...props} />
  )
);
DialogHeader.displayName = 'DialogHeader';

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h2 ref={ref} className={['text-lg font-semibold text-slate-900', className].filter(Boolean).join(' ')} {...props} />
  )
);
DialogTitle.displayName = 'DialogTitle';
