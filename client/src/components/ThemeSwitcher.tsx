import { themes, applyTheme } from '../themes/themes';
import type { ThemeId } from '@shared/types/index.js';

interface ThemeSwitcherProps {
  current: ThemeId;
  onChange: (id: ThemeId) => void;
}

export function ThemeSwitcher({ current, onChange }: ThemeSwitcherProps) {
  return (
    <div className="flex gap-2">
      {Object.values(themes).map((theme) => (
        <button
          key={theme.id}
          onClick={() => {
            applyTheme(theme.id);
            onChange(theme.id);
          }}
          className={`w-6 h-6 rounded-full border-2 transition-all ${
            current === theme.id ? 'border-primary scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: theme.colors.bg }}
          title={theme.name}
        />
      ))}
    </div>
  );
}
