import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse } from '@shared/types/index.js';

export function useApi<T>(path: string, interval?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api${path}`);
      const json: ApiResponse<T> = await res.json();
      if (json.ok && json.data !== undefined) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || 'Unknown error');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchData();
    if (interval) {
      const timer = setInterval(fetchData, interval);
      return () => clearInterval(timer);
    }
  }, [fetchData, interval]);

  return { data, error, loading, refetch: fetchData };
}
