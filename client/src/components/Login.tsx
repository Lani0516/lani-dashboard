import { useState } from 'react';
import { FaLock } from 'react-icons/fa6';
import { api, setToken } from '../services/api';

export function Login({ onAuthed }: { onAuthed: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    setToken(value.trim());
    try {
      await api.files.root(); // any protected route validates the token
      onAuthed();
    } catch {
      setError('Invalid token');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-screen bg-bg flex items-center justify-center">
      <form onSubmit={submit} className="w-80 bg-bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-text">
          <img src="/logo.png" alt="" className="logo-img w-7 h-7" />
          <span className="font-bold">Lani Dashboard</span>
        </div>
        <label className="text-sm text-text-secondary flex flex-col gap-1.5">
          Access token
          <div className="flex items-center gap-2 px-3 h-10 rounded-lg border border-border bg-bg">
            <FaLock size={13} className="text-text-muted" />
            <input
              type="password"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 bg-transparent outline-none text-text text-sm"
              placeholder="DASHBOARD_TOKEN"
            />
          </div>
        </label>
        {error && <span className="text-xs text-error">{error}</span>}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="h-10 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
