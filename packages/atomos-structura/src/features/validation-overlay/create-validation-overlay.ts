import type { CanvasViewport } from '../../core/create-canvas-viewport.js';
import type { EntityManager } from '../../core/presentation/entity-manager.js';
import type { SchemaValidator, ValidationWarning } from '../../core/validation/create-schema-validator.js';

export interface ValidationOverlayResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}

export const createValidationOverlay = (
  validator: SchemaValidator,
  viewport: CanvasViewport,
  entityManager: EntityManager,
  canvasContainer: HTMLElement,
): ValidationOverlayResult => {
  let expanded = false;
  let warnings: ValidationWarning[] = [];

  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:absolute;bottom:80px;left:16px;z-index:25;',
    'font-family:system-ui,sans-serif;',
  ].join('');

  const badge = document.createElement('button');
  badge.style.cssText = [
    'display:flex;align-items:center;gap:6px;',
    'padding:4px 12px;border-radius:20px;border:none;cursor:pointer;',
    'background:#dc2626;color:#fff;font-size:12px;font-family:inherit;',
    'box-shadow:0 2px 8px rgba(0,0,0,0.4);transition:background 0.2s;',
  ].join('');
  badge.onmouseover = () => { badge.style.background = '#b91c1c'; };
  badge.onmouseout = () => { badge.style.background = '#dc2626'; };

  const list = document.createElement('div');
  list.style.cssText = [
    'position:absolute;bottom:calc(100% + 8px);left:0;z-index:26;',
    'background:rgba(15,23,42,0.97);border:1px solid #27272a;',
    'border-radius:8px;min-width:280px;max-width:360px;max-height:240px;overflow-y:auto;',
    'box-shadow:0 8px 24px rgba(0,0,0,0.5);',
  ].join('');

  const render = (): void => {
    if (warnings.length === 0) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'block';
    badge.textContent = `⚠ ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`;

    if (!expanded) {
      list.style.display = 'none';
      return;
    }

    list.style.display = 'block';
    list.innerHTML = '';
    warnings.forEach(w => {
      const row = document.createElement('div');
      row.style.cssText = [
        'padding:8px 12px;cursor:pointer;border-bottom:1px solid #1e293b;',
        'color:#f4f4f5;font-size:12px;display:flex;gap:8px;align-items:flex-start;',
      ].join('');
      row.onmouseover = () => { row.style.background = '#1e293b'; };
      row.onmouseout = () => { row.style.background = 'transparent'; };

      const dot = document.createElement('span');
      dot.style.cssText = 'flex-shrink:0;margin-top:2px;color:#facc15;';
      dot.textContent = '●';

      const text = document.createElement('span');
      text.textContent = w.message;

      row.appendChild(dot);
      row.appendChild(text);

      if (w.entityId) {
        row.title = 'Click to pan to entity';
        row.onclick = () => {
          const entity = entityManager.getEntity(w.entityId!);
          if (!entity) return;
          const rect = canvasContainer.getBoundingClientRect();
          const { zoom } = viewport.state.value;
          const cx = entity.position.x + entity.dimensions.width / 2;
          const cy = entity.position.y + entity.dimensions.height / 2;
          viewport.panTo(rect.width / 2 - cx * zoom, rect.height / 2 - cy * zoom);
        };
      }

      list.appendChild(row);
    });
  };

  badge.onclick = () => {
    expanded = !expanded;
    render();
  };

  wrap.appendChild(list);
  wrap.appendChild(badge);
  canvasContainer.appendChild(wrap);
  wrap.style.display = 'none';

  const unsubValidator = validator.subscribe(w => {
    warnings = w;
    render();
  });

  return {
    element: wrap,
    cleanup: {
      destroy: () => {
        unsubValidator();
        wrap.remove();
      },
    },
  };
};
