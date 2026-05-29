import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark } from 'react-icons/fa6';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  bodyClassName?: string;
}

const sizeMap = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ open, onClose, title, icon, children, footer, size = 'lg', bodyClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
      onMouseDown={onClose}
    >
      <div
        className={`w-full ${sizeMap[size]} max-h-[85vh] flex flex-col bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-[modalIn_140ms_ease-out]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || icon) && (
          <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {icon && <span className="text-text-secondary flex items-center">{icon}</span>}
              <h2 className="text-base font-bold text-text">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
              title="Close"
            >
              <FaXmark size={16} />
            </button>
          </div>
        )}
        <div className={bodyClassName ?? 'flex-1 overflow-y-auto p-5'}>{children}</div>
        {footer && <div className="px-5 py-3 border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
