// @vitest-environment jsdom
/**
 * Tests — Long text wrapping, adaptive scaling and zero-overflow in Entity Header
 */
import { describe, it, expect } from 'vitest';
import { createSignal, createEditableLabel } from '@atomos-web/prime';
import { createEntityHeader } from '../src/features/entity-with-edges/create-entity-header.js';

describe('Entity Long Text Wrapping & Adaptive Typography', () => {
  it('should configure multiline editable label with break-word and line-clamp', () => {
    const longTitle = '1. 🔬 INDUSTRIAL BENCHMARK SPEC 20: GALILEUS VIRTUAL RAM STAGING & POSIX MATERIALIZATION';
    const labelSignal = createSignal(longTitle);

    const editable = createEditableLabel({
      value: labelSignal,
      onChange: (v) => labelSignal.set(v),
      multiline: true,
      maxLines: 3,
      enablePopover: true,
    });

    const span = editable.element.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.style.whiteSpace).toBe('normal');
    expect(span?.style.wordBreak).toBe('break-word');
    expect(span?.style.overflowWrap).toBe('anywhere');
    expect(span?.style.fontSize).toBe('11px'); // length > 45 -> 11px
    expect(span?.title).toBe(longTitle);

    editable.cleanup.destroy();
  });

  it('should scale font size adaptively based on text length', () => {
    const labelSignal = createSignal('Short Title');
    const editable = createEditableLabel({
      value: labelSignal,
      onChange: (v) => labelSignal.set(v),
      multiline: true,
      maxLines: 3,
    });

    const span = editable.element.querySelector('span')!;
    // Short title (<= 24 chars) -> default font-size
    expect(span.style.fontSize).toBe('');

    // Medium title (25-45 chars) -> 12px
    labelSignal.set('Medium Architecture Component Title');
    expect(span.style.fontSize).toBe('12px');

    // Long title (> 45 chars) -> 11px
    labelSignal.set('1. 🔬 INDUSTRIAL BENCHMARK SPEC 20: GALILEUS VIRTUAL RAM STAGING & POSIX MATERIALIZATION');
    expect(span.style.fontSize).toBe('11px');

    editable.cleanup.destroy();
  });

  it('should render createEntityHeader with zero overflow constraints and action buttons', () => {
    const labelSignal = createSignal('Extremely Long Entity Specification Title Across Multiple Architecture Domains');
    const isCollapsedSignal = createSignal(false);

    const headerResult = createEntityHeader({
      label: labelSignal,
      isCollapsed: isCollapsedSignal,
      onLabelChange: (v) => labelSignal.set(v),
      onToggleCollapse: () => isCollapsedSignal.set(!isCollapsedSignal.value),
      onSettingsClick: () => {},
      onDeleteClick: () => {},
      isReadonly: false,
    });

    expect(headerResult.element.classList.contains('vbs-entity-header')).toBe(true);
    expect(headerResult.element.style.cursor).toBe('grab');
    expect(headerResult.element.children.length).toBeGreaterThanOrEqual(2);

    headerResult.cleanup.destroy();
  });
});
