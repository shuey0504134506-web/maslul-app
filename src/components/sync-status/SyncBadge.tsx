import type { SyncStatus } from '@/types';
import { syncEngine } from '@/services/sync/syncEngine';

const CONFIG: Record<SyncStatus, { icon: string; label: string; className: string }> = {
  synced: { icon: '✓', label: 'נשמר וסונכרן', className: 'text-sage-dark bg-sage/10' },
  pending: { icon: '☁', label: 'ממתין לחיבור לאינטרנט', className: 'text-ink-soft bg-sand-200' },
  uploading: { icon: '↑', label: 'מעלה...', className: 'text-honey-dark bg-honey/10' },
  failed: { icon: '⚠', label: 'ההעלאה נכשלה - לחץ לניסיון חוזר', className: 'text-clay bg-clay/10' }
};

export function SyncBadge({ status, queueItemId }: { status: SyncStatus; queueItemId?: string }) {
  const cfg = CONFIG[status];
  const isClickable = status === 'failed' && !!queueItemId;

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => queueItemId && syncEngine.retry(queueItemId)}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.className} ${
        isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
      }`}
      aria-label={cfg.label}
      title={cfg.label}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      <span>{cfg.label}</span>
    </button>
  );
}
