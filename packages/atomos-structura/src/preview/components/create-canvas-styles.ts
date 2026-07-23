export function injectCanvasResponsiveStyles(shadowRoot: ShadowRoot): void {
  if (shadowRoot.getElementById('vbs-responsive-toolbars')) return;

  const style = document.createElement('style');
  style.id = 'vbs-responsive-toolbars';
  style.textContent = `
    @container (max-width: 768px) {
      .vbs-palette {
        opacity: 0.3;
        transform: translateY(-50%) scale(0.85) !important;
        transform-origin: left center;
        transition: all 0.3s ease;
      }
      .vbs-palette:hover, .vbs-palette:focus-within {
        opacity: 1;
        transform: translateY(-50%) scale(1) !important;
      }
      
      .vbs-bottom-toolbar {
        opacity: 0.3;
        transform: translateX(-50%) scale(0.85) !important;
        transform-origin: bottom center;
        transition: all 0.3s ease;
      }
      .vbs-bottom-toolbar:hover, .vbs-bottom-toolbar:focus-within {
        opacity: 1;
        transform: translateX(-50%) scale(1) !important;
      }
    }
    @container (max-width: 400px) {
      .vbs-palette, .vbs-bottom-toolbar, .vbs-schema-tabs, .vbs-burger-menu {
        display: none !important;
      }
      #vbs-viewport > g, .vbs-entity, .vbs-link {
        pointer-events: none !important;
      }
    }
    
    .vbs-readonly-mode, .vbs-readonly-mode .vbs-canvas-wrap {
      background-color: var(--vbs-bg-canvas, #0a0a0a) !important;
    }
    .vbs-readonly-mode #canvas-grid-large,
    .vbs-readonly-mode #canvas-grid-small,
    .vbs-readonly-mode #grid-large-rect,
    .vbs-readonly-mode #grid-large-path,
    .vbs-readonly-mode #grid-small-path {
      display: none !important;
    }
    .vbs-readonly-mode .vbs-palette,
    .vbs-readonly-mode .vbs-bottom-toolbar,
    .vbs-readonly-mode .vbs-burger-menu,
    .vbs-readonly-mode .vbs-schema-tabs {
      display: none !important;
    }
    .vbs-readonly-mode .resize-handle,
    .vbs-readonly-mode [data-anchor],
    .vbs-readonly-mode .selection-ring {
      display: none !important;
    }
    .vbs-readonly-mode .vbs-entity,
    .vbs-readonly-mode .vbs-link,
    .vbs-readonly-mode .vbs-link-label-body {
      pointer-events: none !important;
    }
    
    .vbs-hover-zone {
      position: absolute;
      z-index: 9999;
      pointer-events: auto;
    }
    .vbs-hover-zone::after {
      content: attr(data-hover-text);
      position: absolute;
      opacity: 0;
      pointer-events: none;
      background: var(--vbs-bg-panel, #1e293b);
      color: var(--vbs-text-primary, #f8fafc);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      white-space: nowrap;
      transition: opacity 0.2s ease, transform 0.2s ease;
      border: 1px solid var(--vbs-border-color, #334155);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .vbs-hover-zone:hover::after {
      opacity: 1;
    }
    .vbs-hover-zone[data-zone="top"]::after { top: 100%; left: 50%; transform: translateX(-50%) translateY(4px); margin-top: 4px; }
    .vbs-hover-zone[data-zone="bottom"]::after { bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-4px); margin-bottom: 4px; }
    .vbs-hover-zone[data-zone="left"]::after { left: 100%; top: 50%; transform: translateY(-50%) translateX(4px); margin-left: 4px; }
    .vbs-hover-zone[data-zone="right"]::after { right: 100%; top: 50%; transform: translateY(-50%) translateX(-4px); margin-right: 4px; }
    .vbs-hover-zone:hover[data-zone="top"]::after { transform: translateX(-50%) translateY(0); }
    .vbs-hover-zone:hover[data-zone="bottom"]::after { transform: translateX(-50%) translateY(0); }
    .vbs-hover-zone:hover[data-zone="left"]::after { transform: translateY(-50%) translateX(0); }
    .vbs-hover-zone:hover[data-zone="right"]::after { transform: translateY(-50%) translateX(0); }
  `;
  shadowRoot.appendChild(style);
}
