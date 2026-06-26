import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
}

export function Modal({ title, onClose, children, maxHeight = 'max-h-[90vh]' }: Props) {
  // Close on backdrop click + lock body scroll
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full max-w-[430px] bg-omicron-card border border-omicron-border rounded-t-3xl ${maxHeight} flex flex-col shadow-2xl`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1 rounded-full bg-omicron-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-omicron-border">
          <h2 className="text-omicron-text font-bold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-omicron-surface flex items-center justify-center text-omicron-subtle hover:text-omicron-text transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
