import { getToolboxConfig } from '../../core/adapters/toolbox-config-manager.js';
import { getEntityManager } from '../../core/presentation/entity-manager.js';

export function createShapePalette(
  instanceId: string,
  canvasWrap: HTMLDivElement,
  viewport: any
): HTMLDivElement {
  const palette = document.createElement('div');
  palette.classList.add('vbs-palette');
  palette.style.cssText = [
    'position:absolute;top:50%;left:16px;transform:translateY(-50%);',
    'display:flex;flex-direction:column;gap:8px;z-index:20;',
    'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
    'border:1px solid var(--vbs-border, #27272a);border-radius:12px;padding:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);'
  ].join('');

  const toolboxConfig = getToolboxConfig();

  toolboxConfig.toolsets.forEach(toolset => {
    const setContainer = document.createElement('div');
    setContainer.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;';

    if (toolset.tools.length === 1) {
      const sh = toolset.tools[0];
      if (!sh) return;

      const btn = document.createElement('button');
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sh.icon}</svg>`;
      btn.title = sh.description || `Add ${sh.name}`;
      btn.style.cssText = [
        'display:flex;align-items:center;justify-content:center;',
        'width:40px;height:40px;border:none;background:transparent;',
        'color:var(--vbs-text-secondary, #a1a1aa);border-radius: var(--vbs-radius, 2px);cursor:grab;transition:all 0.2s;'
      ].join('');

      btn.onmouseover = () => {
        btn.style.background = 'var(--vbs-bg-panel, #111111)';
        btn.style.color = '#f8fafc';
      };
      btn.onmouseout = () => {
        btn.style.background = 'transparent';
        btn.style.color = 'var(--vbs-text-secondary, #a1a1aa)';
      };

      btn.onclick = e => {
        e.stopPropagation();
        const rect = canvasWrap.getBoundingClientRect();
        const center = viewport.screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
        const worldX = center.x;
        const worldY = center.y;
        const id = `entity-${Date.now()}`;
        getEntityManager(instanceId).createEntity(
          id,
          `New ${sh.name}`,
          { x: worldX - 100, y: worldY - 50 },
          { width: 200, height: sh.shape === 'box' || sh.shape === 'rectangle' ? 100 : 180 },
          { shape: sh.shape, color: sh.baseColor }
        );
      };

      btn.draggable = true;
      btn.ondragstart = e => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('application/vbs-shape', sh.shape);
          e.dataTransfer.setData('application/vbs-color', sh.baseColor);
          e.dataTransfer.effectAllowed = 'copy';
        }
      };

      setContainer.appendChild(btn);
    } else if (toolset.tools.length > 1) {
      const groupBtn = document.createElement('button');
      groupBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${toolset.icon}</svg>
        <div style="position:absolute;bottom:2px;right:2px;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:4px solid #64748b;transform:rotate(135deg);"></div>
      `;
      groupBtn.title = toolset.name;
      groupBtn.style.cssText = [
        'position:relative;display:flex;align-items:center;justify-content:center;',
        'width:40px;height:40px;border:none;background:transparent;',
        'color:var(--vbs-text-secondary, #a1a1aa);border-radius: var(--vbs-radius, 2px);cursor:pointer;transition:all 0.2s;'
      ].join('');

      groupBtn.onmouseover = () => {
        groupBtn.style.background = 'var(--vbs-bg-panel, #111111)';
        groupBtn.style.color = '#f8fafc';
      };
      groupBtn.onmouseout = () => {
        groupBtn.style.background = 'transparent';
        groupBtn.style.color = 'var(--vbs-text-secondary, #a1a1aa)';
      };

      const flyout = document.createElement('div');
      flyout.style.cssText = [
        'display:none;position:absolute;left:100%;top:0;margin-left:8px;',
        'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
        'border:1px solid var(--vbs-border, #27272a);border-radius:12px;padding:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);',
        'flex-direction:row;gap:8px;z-index:30;'
      ].join('');

      toolset.tools.forEach(sh => {
        const btn = document.createElement('button');
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sh.icon}</svg>`;
        btn.title = sh.description || `Add ${sh.name}`;
        btn.style.cssText = [
          'display:flex;align-items:center;justify-content:center;',
          'width:40px;height:40px;border:none;background:transparent;',
          'color:var(--vbs-text-secondary, #a1a1aa);border-radius: var(--vbs-radius, 2px);cursor:grab;transition:all 0.2s;'
        ].join('');

        btn.onmouseover = () => {
          btn.style.background = 'var(--vbs-border, #27272a)';
          btn.style.color = '#f8fafc';
        };
        btn.onmouseout = () => {
          btn.style.background = 'transparent';
          btn.style.color = 'var(--vbs-text-secondary, #a1a1aa)';
        };

        btn.onclick = e => {
          e.stopPropagation();
          const v = viewport.state.value;
          const rect = canvasWrap.getBoundingClientRect();
          const screenW = rect.width;
          const screenH = rect.height;
          const safePanX = Number.isFinite(v.pan.x) ? v.pan.x : 0;
          const safePanY = Number.isFinite(v.pan.y) ? v.pan.y : 0;
          const safeZoom = Number.isFinite(v.zoom) && v.zoom > 0 ? v.zoom : 1;

          const worldX = (screenW / 2 - safePanX) / safeZoom;
          const worldY = (screenH / 2 - safePanY) / safeZoom;
          const id = `entity-${Date.now()}`;
          getEntityManager(instanceId).createEntity(
            id,
            `New ${sh.name}`,
            { x: worldX - 100, y: worldY - 50 },
            { width: 200, height: sh.shape === 'box' || sh.shape === 'rectangle' ? 100 : 180 },
            { shape: sh.shape, color: sh.baseColor }
          );
          flyout.style.display = 'none';
        };

        btn.draggable = true;
        btn.ondragstart = e => {
          if (e.dataTransfer) {
            e.dataTransfer.setData('application/vbs-shape', sh.shape);
            e.dataTransfer.setData('application/vbs-color', sh.baseColor);
            e.dataTransfer.effectAllowed = 'copy';
          }
        };
        flyout.appendChild(btn);
      });

      let hideTimeout: ReturnType<typeof setTimeout>;
      setContainer.onmouseenter = () => {
        clearTimeout(hideTimeout);
        flyout.style.display = 'flex';
      };
      setContainer.onmouseleave = () => {
        hideTimeout = setTimeout(() => {
          flyout.style.display = 'none';
        }, 300);
      };

      setContainer.appendChild(groupBtn);
      setContainer.appendChild(flyout);
    }

    palette.appendChild(setContainer);
  });

  return palette;
}
