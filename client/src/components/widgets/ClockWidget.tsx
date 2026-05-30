import { useState, useEffect, useRef } from 'react';
import { FaRegClock, FaGear, FaChevronDown, FaCheck } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { Modal } from '../Modal';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface ClockSettings {
  timeZone: string; // '' = system default
  hour12: boolean;
  showSeconds: boolean;
  showDate: boolean;
  background: string; // data URL, '' = none
}

const defaultSettings: ClockSettings = {
  timeZone: '',
  hour12: false,
  showSeconds: true,
  showDate: true,
  background: '',
};

// One representative zone per UTC offset. label = friendly city name.
const TIMEZONES: { tz: string; label: string }[] = [
  { tz: 'Pacific/Midway', label: 'Midway' },
  { tz: 'Pacific/Honolulu', label: 'Honolulu' },
  { tz: 'America/Anchorage', label: 'Anchorage' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles' },
  { tz: 'America/Denver', label: 'Denver' },
  { tz: 'America/Chicago', label: 'Chicago' },
  { tz: 'America/New_York', label: 'New York' },
  { tz: 'America/Halifax', label: 'Halifax' },
  { tz: 'America/Sao_Paulo', label: 'São Paulo' },
  { tz: 'Atlantic/Azores', label: 'Azores' },
  { tz: 'UTC', label: 'UTC' },
  { tz: 'Europe/London', label: 'London' },
  { tz: 'Europe/Paris', label: 'Paris' },
  { tz: 'Europe/Athens', label: 'Athens' },
  { tz: 'Europe/Moscow', label: 'Moscow' },
  { tz: 'Asia/Dubai', label: 'Dubai' },
  { tz: 'Asia/Karachi', label: 'Karachi' },
  { tz: 'Asia/Kolkata', label: 'Kolkata' },
  { tz: 'Asia/Dhaka', label: 'Dhaka' },
  { tz: 'Asia/Bangkok', label: 'Bangkok' },
  { tz: 'Asia/Shanghai', label: 'Shanghai · Beijing' },
  { tz: 'Asia/Taipei', label: 'Taipei' },
  { tz: 'Asia/Tokyo', label: 'Tokyo' },
  { tz: 'Australia/Adelaide', label: 'Adelaide' },
  { tz: 'Australia/Sydney', label: 'Sydney' },
  { tz: 'Pacific/Auckland', label: 'Auckland' },
  { tz: 'Pacific/Tonga', label: 'Tonga' },
];

// Live UTC offset string e.g. "UTC+8", "UTC+5:30", "UTC". DST-correct.
function getOffsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date());
    const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
    // raw like "GMT+08:00" / "GMT" / "GMT+05:30"
    const m = raw.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!m) return 'UTC';
    const sign = m[1];
    const h = parseInt(m[2], 10);
    const min = parseInt(m[3], 10);
    return `UTC${sign}${h}${min ? ':' + m[3] : ''}`;
  } catch {
    return '';
  }
}

interface TimeZoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
}

function TimeZoneSelect({ value, onChange }: TimeZoneSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selected = TIMEZONES.find((z) => z.tz === value);
  const display = value === '' ? 'System default' : (selected?.label ?? value);
  const displayOffset = value === '' ? '' : getOffsetLabel(value);

  const pick = (tz: string) => {
    onChange(tz);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-bg-hover border border-border rounded px-2.5 py-2 text-sm text-text hover:border-primary transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{display}</span>
          {displayOffset && (
            <span className="shrink-0 text-xs text-text-muted tabular-nums">{displayOffset}</span>
          )}
        </span>
        <FaChevronDown
          size={11}
          className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-bg-card shadow-lg py-1">
          <button
            type="button"
            onClick={() => pick('')}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-bg-hover ${
              value === '' ? 'text-primary' : 'text-text'
            }`}
          >
            <span>System default</span>
            {value === '' && <FaCheck size={11} />}
          </button>
          <div className="my-1 border-t border-border" />
          {TIMEZONES.map((z) => {
            const active = z.tz === value;
            return (
              <button
                key={z.tz}
                type="button"
                onClick={() => pick(z.tz)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-bg-hover ${
                  active ? 'text-primary' : 'text-text'
                }`}
              >
                <span className="truncate">{z.label}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted tabular-nums">{getOffsetLabel(z.tz)}</span>
                  {active && <FaCheck size={11} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ClockWidget() {
  const [settings, setSettings] = useLocalStorage<ClockSettings>('clock-settings', defaultSettings);
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const tzOpt = settings.timeZone || undefined;

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: settings.showSeconds ? '2-digit' : undefined,
    hour12: settings.hour12,
    timeZone: tzOpt,
  });
  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tzOpt,
  });
  const tz = settings.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzAbbr =
    now
      .toLocaleTimeString(undefined, { timeZoneName: 'short', timeZone: tzOpt })
      .split(' ')
      .pop() ?? '';

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSettings({ ...settings, background: reader.result as string });
    reader.readAsDataURL(file);
  };

  const hasBg = settings.background !== '';

  return (
    <WidgetCard
      title="Clock"
      icon={<FaRegClock />}
      actions={
        <button
          onClick={() => setShowSettings(true)}
          className="text-text-muted hover:text-text p-1 rounded hover:bg-bg-hover"
          title="Clock settings"
        >
          <FaGear size={13} />
        </button>
      }
    >
      <div className="relative flex flex-col items-center justify-center h-full rounded-lg overflow-hidden">
        {hasBg && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${settings.background})` }}
            />
            <div className="absolute inset-0 bg-black/40" />
          </>
        )}
        <div className="relative flex flex-col items-center justify-center">
          <div
            className={`text-xs uppercase tracking-wide mb-1 ${hasBg ? 'text-white/80' : 'text-text-muted'}`}
          >
            {tz} · {tzAbbr}
          </div>
          <div
            className={`text-4xl font-bold tabular-nums tracking-tight ${hasBg ? 'text-white' : 'text-text'}`}
          >
            {time}
          </div>
          {settings.showDate && (
            <div className={`text-sm mt-2 ${hasBg ? 'text-white/90' : 'text-text-secondary'}`}>
              {date}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Clock Settings"
        icon={<FaRegClock />}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Time zone</label>
            <TimeZoneSelect
              value={settings.timeZone}
              onChange={(tz) => setSettings({ ...settings, timeZone: tz })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Time format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSettings({ ...settings, hour12: false })}
                className={`flex-1 rounded px-2 py-1.5 text-sm ${
                  !settings.hour12 ? 'bg-primary text-white' : 'bg-bg-hover text-text-secondary'
                }`}
              >
                24-hour
              </button>
              <button
                onClick={() => setSettings({ ...settings, hour12: true })}
                className={`flex-1 rounded px-2 py-1.5 text-sm ${
                  settings.hour12 ? 'bg-primary text-white' : 'bg-bg-hover text-text-secondary'
                }`}
              >
                12-hour
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-text">Show seconds</span>
            <input
              type="checkbox"
              checked={settings.showSeconds}
              onChange={(e) => setSettings({ ...settings, showSeconds: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-text">Show date</span>
            <input
              type="checkbox"
              checked={settings.showDate}
              onChange={(e) => setSettings({ ...settings, showDate: e.target.checked })}
            />
          </label>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Background image
            </label>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 bg-bg-hover border border-border rounded px-2 py-1.5 text-sm text-text hover:bg-bg-card"
              >
                {hasBg ? 'Replace image' : 'Upload image'}
              </button>
              {hasBg && (
                <button
                  onClick={() => setSettings({ ...settings, background: '' })}
                  className="px-3 py-1.5 text-sm text-error rounded hover:bg-bg-hover"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </WidgetCard>
  );
}
