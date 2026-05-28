import { useState } from 'react';
import { WidgetCard } from '../WidgetCard';
import { api } from '../../services/api';
import type { WOLDevice } from '@shared/types/index.js';

export function WOLWidget() {
  const [devices, setDevices] = useState<WOLDevice[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', mac: '', ip: '' });
  const [waking, setWaking] = useState<string | null>(null);

  const handleAdd = () => {
    const device: WOLDevice = {
      id: crypto.randomUUID(),
      name: form.name,
      mac: form.mac,
      ip: form.ip || undefined,
    };
    setDevices([...devices, device]);
    setForm({ name: '', mac: '', ip: '' });
    setShowAdd(false);
  };

  const handleWake = async (device: WOLDevice) => {
    setWaking(device.id);
    try {
      await api.wol.wake(device.mac, device.broadcastAddress);
      setDevices(
        devices.map((d) =>
          d.id === device.id ? { ...d, lastWoken: Date.now() } : d
        )
      );
    } catch (e) {
      console.error('WOL failed:', e);
    } finally {
      setTimeout(() => setWaking(null), 2000);
    }
  };

  const handleRemove = (id: string) => {
    setDevices(devices.filter((d) => d.id !== id));
  };

  return (
    <WidgetCard
      title="Wake on LAN"
      icon="⚡"
      actions={
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover"
        >
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      }
    >
      {showAdd ? (
        <div className="space-y-2">
          <input
            className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
            placeholder="Device name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text font-mono"
            placeholder="MAC (aa:bb:cc:dd:ee:ff)"
            value={form.mac}
            onChange={(e) => setForm({ ...form, mac: e.target.value })}
          />
          <input
            className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text font-mono"
            placeholder="IP (optional)"
            value={form.ip}
            onChange={(e) => setForm({ ...form, ip: e.target.value })}
          />
          <button
            onClick={handleAdd}
            className="w-full bg-primary text-white rounded px-2 py-1 text-xs hover:opacity-90"
          >
            Add Device
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.length === 0 && (
            <div className="text-text-muted text-xs text-center py-4">
              No devices. Click + Add to configure WOL targets.
            </div>
          )}
          {devices.map((device) => (
            <div key={device.id} className="bg-bg-hover rounded-lg p-2 flex items-center justify-between">
              <div>
                <div className="text-xs text-text font-semibold">{device.name}</div>
                <div className="text-[10px] text-text-muted font-mono">{device.mac}</div>
                {device.lastWoken && (
                  <div className="text-[10px] text-text-muted">
                    Last woken: {new Date(device.lastWoken).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleWake(device)}
                  disabled={waking === device.id}
                  className={`px-2 py-1 rounded text-xs ${
                    waking === device.id
                      ? 'bg-success text-white'
                      : 'bg-primary text-white hover:opacity-90'
                  }`}
                >
                  {waking === device.id ? '✓ Sent' : 'Wake'}
                </button>
                <button
                  onClick={() => handleRemove(device.id)}
                  className="text-error text-xs px-1 hover:opacity-70"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
