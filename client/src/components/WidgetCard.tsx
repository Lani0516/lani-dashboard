import type { ReactNode } from 'react';

interface WidgetCardProps {
  title: string;
  icon?: string;
  status?: 'online' | 'offline' | 'loading' | 'error';
  children: ReactNode;
  actions?: ReactNode;
}

export function WidgetCard({ title, icon, status, children, actions }: WidgetCardProps) {
  const statusColor = {
    online: 'bg-success',
    offline: 'bg-error',
    loading: 'bg-warning animate-pulse',
    error: 'bg-error',
  }[status || 'online'];

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {status && (
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          )}
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
