import { useState, useEffect, useCallback } from "react";
import { getDriveStatus, disconnectDrive } from "../lib/api.js";
import type { DriveStatus } from "../types/index.js";

export function useDriveStatus() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getDriveStatus();
      setStatus(s);
    } catch {
      // backend may not be up yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const disconnect = useCallback(async () => {
    await disconnectDrive();
    await refresh();
  }, [refresh]);

  return { status, loading, refresh, disconnect };
}