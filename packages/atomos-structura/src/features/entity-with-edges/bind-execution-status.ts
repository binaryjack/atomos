import type { Signal } from '@atomos-web/prime'

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failed' | 'warning';

export interface ExecutionState {
  readonly status?: ExecutionStatus | string;
  readonly progress?: number;
}

export interface ExecutionStatusTargets {
  readonly body: HTMLElement;
  readonly progressBar: HTMLElement;
  readonly statusBadge: HTMLElement;
}

const EXEC_CLASSES = ['vbs-exec-running', 'vbs-exec-success', 'vbs-exec-failed', 'vbs-exec-warning'];

const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>';
const ICON_CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>';
const ICON_WARN = '<span style="font-weight:bold;line-height:0">!</span>';

const BADGES: Readonly<Record<string, { icon: string; background: string }>> = {
  success: { icon: ICON_CHECK, background: '#22c55e' },
  failed: { icon: ICON_CROSS, background: '#ef4444' },
  warning: { icon: ICON_WARN, background: '#eab308' },
};

const applyBadge = function(statusBadge: HTMLElement, status: string | undefined): void {
  const badge = status ? BADGES[status] : undefined;
  if (badge) {
    statusBadge.innerHTML = badge.icon;
    statusBadge.style.background = badge.background;
    statusBadge.style.opacity = '1';
    statusBadge.style.transform = 'scale(1)';
  } else {
    statusBadge.style.opacity = '0';
    statusBadge.style.transform = 'scale(0.8)';
  }
};

/** Renders one execution state: frame glow class, progress bar and floating status badge. */
export const applyExecutionStatus = function(targets: ExecutionStatusTargets, exec: ExecutionState | null | undefined): void {
  const status = exec?.status;
  targets.body.classList.remove(...EXEC_CLASSES);
  const statusClass = `vbs-exec-${status ?? 'idle'}`;
  if (EXEC_CLASSES.includes(statusClass)) targets.body.classList.add(statusClass);

  if (exec?.progress !== undefined) {
    targets.progressBar.style.width = `${Math.max(0, Math.min(100, exec.progress))}%`;
    targets.progressBar.style.opacity = '1';
  } else {
    targets.progressBar.style.opacity = '0';
  }
  applyBadge(targets.statusBadge, status);
};

/**
 * Applies the signal's current execution state immediately, then on every change.
 * Signals only notify on change, so the initial state must be rendered explicitly.
 */
export const bindExecutionStatus = function(targets: ExecutionStatusTargets, signal: Signal<ExecutionState>): () => void {
  applyExecutionStatus(targets, signal.value);
  return signal.subscribe((exec) => applyExecutionStatus(targets, exec));
};
