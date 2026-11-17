// @vitest-environment happy-dom
// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { createSignal } from '@atomos-web/prime';
import { bindExecutionStatus, type ExecutionState } from '../src/features/entity-with-edges/bind-execution-status.js';

const makeTargets = () => ({
  body: document.createElement('div'),
  progressBar: document.createElement('div'),
  statusBadge: document.createElement('div'),
});

describe('entity execution status binding', () => {
  it('renders the initial execution state without waiting for a change', () => {
    const targets = makeTargets();
    const signal = createSignal<ExecutionState>({ status: 'success' });
    bindExecutionStatus(targets, signal);
    expect(targets.body.classList.contains('vbs-exec-success')).toBe(true);
    expect(targets.statusBadge.style.opacity).toBe('1');
    expect(targets.progressBar.style.opacity).toBe('0');
  });

  it('follows later changes and stops after unsubscribe', () => {
    const targets = makeTargets();
    const signal = createSignal<ExecutionState>({ status: 'idle' });
    const unsubscribe = bindExecutionStatus(targets, signal);
    expect(targets.statusBadge.style.opacity).toBe('0');

    signal.set({ status: 'running', progress: 140 });
    expect(targets.body.classList.contains('vbs-exec-running')).toBe(true);
    expect(targets.progressBar.style.width).toBe('100%');

    signal.set({ status: 'failed' });
    expect(targets.body.classList.contains('vbs-exec-running')).toBe(false);
    expect(targets.body.classList.contains('vbs-exec-failed')).toBe(true);

    unsubscribe();
    signal.set({ status: 'success' });
    expect(targets.body.classList.contains('vbs-exec-success')).toBe(false);
  });

  it('ignores unknown statuses', () => {
    const targets = makeTargets();
    bindExecutionStatus(targets, createSignal<ExecutionState>({ status: 'bogus' }));
    expect(targets.body.className).toBe('');
    expect(targets.statusBadge.style.opacity).toBe('0');
  });
});
