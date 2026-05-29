import { useState, useEffect } from 'react';
import { FaRegClock } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';

export function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzAbbr =
    now.toLocaleTimeString(undefined, { timeZoneName: 'short' }).split(' ').pop() ?? '';

  return (
    <WidgetCard title="Clock" icon={<FaRegClock />}>
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-xs text-text-muted uppercase tracking-wide mb-1">
          {tz} · {tzAbbr}
        </div>
        <div className="text-4xl font-bold text-text tabular-nums tracking-tight">{time}</div>
        <div className="text-sm text-text-secondary mt-2">{date}</div>
      </div>
    </WidgetCard>
  );
}
