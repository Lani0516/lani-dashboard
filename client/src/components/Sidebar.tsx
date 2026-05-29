import { FaAnglesLeft, FaAnglesRight, FaGear } from 'react-icons/fa6';

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarProps {
  sections: SidebarSection[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  open: boolean;
  onToggle: () => void;
  onSettings?: () => void;
}

export function Sidebar({ sections, activeKey, onSelect, open, onToggle, onSettings }: SidebarProps) {
  const expanded = open;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 border-r border-border bg-bg flex flex-col transition-[width] duration-200 ease-out ${
        expanded ? 'w-60' : 'w-16'
      }`}
    >
      {/* header: brand (left) + collapse button (right) */}
      <div className={`pt-3 h-12 flex items-center gap-2 ${expanded ? 'pl-3.5 pr-3' : 'justify-center'}`}>
        {expanded && (
          <>
            <img src="/logo.png" alt="" className="logo-img w-7 h-7 shrink-0" />
            <span className="text-sm font-bold text-text whitespace-nowrap overflow-hidden">
              Lani Dashboard
            </span>
          </>
        )}
        <button
          onClick={onToggle}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          className={`group relative w-10 h-10 flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors ${
            expanded ? 'ml-auto' : 'mx-auto'
          }`}
        >
          {open ? (
            <FaAnglesLeft size={16} />
          ) : (
            <>
              <img
                src="/logo.png"
                alt=""
                className="logo-img w-6 h-6 object-contain absolute inset-0 m-auto transition-opacity duration-200 group-hover:opacity-0"
              />
              <FaAnglesRight
                size={16}
                className="absolute inset-0 m-auto transition-opacity duration-200 opacity-0 group-hover:opacity-100"
              />
            </>
          )}
        </button>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-2">
            <div
              className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted whitespace-nowrap overflow-hidden transition-opacity duration-150 ${
                expanded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {section.title}
            </div>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = item.key === activeKey;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelect?.(item.key)}
                    title={expanded ? undefined : item.label}
                    className={`flex items-center rounded-lg text-sm transition-colors ${
                      expanded
                        ? 'mx-2 px-3 py-2.5 gap-3 w-[calc(100%-1rem)]'
                        : 'mx-auto w-10 h-10 justify-center'
                    } ${
                      active
                        ? 'text-text bg-bg-hover'
                        : 'text-text-secondary hover:text-text hover:bg-bg-hover'
                    }`}
                  >
                    <span className="w-5 flex items-center justify-center shrink-0">{item.icon}</span>
                    {expanded && (
                      <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* footer item */}
      <div className="py-2">
        <button
          onClick={onSettings}
          className={`flex items-center rounded-lg text-sm text-text-secondary hover:text-text hover:bg-bg-hover transition-colors ${
            expanded ? 'mx-2 px-3 py-2.5 gap-3 w-[calc(100%-1rem)]' : 'mx-auto w-10 h-10 justify-center'
          }`}
          title={expanded ? undefined : 'Settings'}
        >
          <span className="w-5 flex items-center justify-center shrink-0">
            <FaGear />
          </span>
          {expanded && (
            <span className="whitespace-nowrap overflow-hidden">Settings</span>
          )}
        </button>
      </div>
    </aside>
  );
}
