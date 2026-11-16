import { useSyncExternalStore } from 'react';

import { countUnreadNotifications } from '@/features/notifications/notification-service';

// The unread number shown on the bell. One shared value, refreshed on launch, on returning to the
// app, every minute and whenever the Notifications page changes what is read.
let unread = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setUnreadCount(value: number): void {
  const next = Math.max(0, Math.floor(value));
  if (next === unread) return;
  unread = next;
  emit();
}

export async function refreshUnreadCount(): Promise<void> {
  try {
    setUnreadCount(await countUnreadNotifications());
  } catch {
    // A failed check keeps the last known number; the next refresh tries again.
  }
}

export function useUnreadCount(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => unread,
    () => 0,
  );
}
