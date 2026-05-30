import { useState } from 'react';
import { FaAnglesLeft, FaAnglesRight, FaChevronRight, FaGear } from 'react-icons/fa6';

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  children?: SidebarChildItem[];
}

export interface SidebarChildItem {
  key: string;
  label: string;
  meta?: string;
  href?: string;
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ sites: true });

  const toggleGroup = (key: string) => {
    setOpenGroups((groups) => ({ ...groups, [key]: !groups[key] }));
  };

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
            {section.title && (
              <div
                className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted whitespace-nowrap overflow-hidden transition-opacity duration-150 ${
                  expanded ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {section.title}
              </div>
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = item.key === activeKey;
                const hasChildren = expanded && !!item.children?.length;
                const groupOpen = !!openGroups[item.key];
                return (
                  <div key={item.key}>
                    <button
                      onClick={() => {
                        if (hasChildren) toggleGroup(item.key);
                        onSelect?.(item.key);
                      }}
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
                        <>
                          <span className="whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                          {hasChildren && (
                            <FaChevronRight
                              size={10}
                              className={`shrink-0 text-text-muted transition-transform duration-200 ease-out ${
                                groupOpen ? 'rotate-90' : 'rotate-180'
                              }`}
                            />
                          )}
                        </>
                      )}
                    </button>

                    {hasChildren && (
                      <div
                        className={`ml-9 mr-2 overflow-hidden border-l border-border pl-2 transition-[max-height,opacity,transform,margin] duration-200 ease-out ${
                          groupOpen
                            ? 'mt-1 mb-1 max-h-64 translate-y-0 opacity-100'
                            : 'mt-0 mb-0 max-h-0 -translate-y-1 opacity-0'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 py-0.5">
                        {item.children!.map((child) => (
                          <button
                            key={child.key}
                            onClick={() => child.href && window.open(child.href, '_blank', 'noopener,noreferrer')}
                            className="min-w-0 rounded-md px-2 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover hover:text-text transition-colors"
                            title={child.meta ? `${child.label} ${child.meta}` : child.label}
                          >
                            <div className="truncate font-mono text-text">:{child.label}</div>
                            {child.meta && (
                              <div className="truncate text-[10px] text-text-muted">{child.meta}</div>
                            )}
                          </button>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
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
