import type { EntityStyleSettings, LinkStyleSettings } from '../../features/settings-page/types/settings-page.types.js'

export const DEFAULT_ENTITY_STYLE: EntityStyleSettings = {
  nameFontFamily: 'sans-serif',
  nameFontSize: 14,
  nameFontWeight: 'bold',
  nameColor: 'var(--vbs-text-primary, #f4f4f5)',
  propsFontFamily: 'sans-serif',
  propsFontSize: 10,
  propsFontWeight: 'normal',
  propsColor: 'var(--vbs-text-secondary, #a1a1aa)',
  borderRadius: 4,
  borderWidth: 1,
  namePaddingY: -8,
  propsPaddingY: 12,
}

export const DEFAULT_LINK_STYLE: LinkStyleSettings = {
  color: '#a1a1aa',
  selectedColor: '#3b82f6',
  thickness: 2,
  selectedThickness: 3,
}

export const injectDesignSystemTokens = () => {
  let style = document.getElementById('vbs-design-system') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'vbs-design-system';
    document.head.appendChild(style);
  }
  style.innerHTML = `
    :root {
      /* Brand Core - "Obsidian" Theme */
      --vbs-bg-canvas: #000000;    /* Pure black */
      --vbs-bg-panel: #111111;     /* Very deep neutral grey */
      --vbs-bg-input: #09090b;     /* Recessed, almost black */
      
      /* Borders & Depth */
      --vbs-border: #27272a;       /* Zinc 800 */
      --vbs-border-hover: #3f3f46; /* Zinc 700 */
      
      /* Accents */
      --vbs-primary: #3b82f6;      /* Sharp Blue 500 */
      --vbs-primary-hover: #2563eb;/* Sharp Blue 600 */
      --vbs-danger: #ef4444;       /* Red 500 */
      
      /* Typography */
      --vbs-text-primary: #f4f4f5; /* Zinc 50 */
      --vbs-text-secondary: #a1a1aa;/* Zinc 400 */
      
      /* Sizing - Technical, sharp edges! */
      --vbs-radius: 2px;
      --vbs-control-height: 28px;  /* Compact height for node canvas */

      /* Entity style tokens */
      --vbs-entity-name-font-family: ${DEFAULT_ENTITY_STYLE.nameFontFamily};
      --vbs-entity-name-font-size: ${DEFAULT_ENTITY_STYLE.nameFontSize}px;
      --vbs-entity-name-font-weight: ${DEFAULT_ENTITY_STYLE.nameFontWeight};
      --vbs-entity-name-color: ${DEFAULT_ENTITY_STYLE.nameColor};
      --vbs-entity-props-font-family: ${DEFAULT_ENTITY_STYLE.propsFontFamily};
      --vbs-entity-props-font-size: ${DEFAULT_ENTITY_STYLE.propsFontSize}px;
      --vbs-entity-props-font-weight: ${DEFAULT_ENTITY_STYLE.propsFontWeight};
      --vbs-entity-props-color: ${DEFAULT_ENTITY_STYLE.propsColor};
      --vbs-entity-border-radius: ${DEFAULT_ENTITY_STYLE.borderRadius}px;
      --vbs-entity-border-width: ${DEFAULT_ENTITY_STYLE.borderWidth}px;
      --vbs-entity-name-padding-y: ${DEFAULT_ENTITY_STYLE.namePaddingY}px;
      --vbs-entity-props-padding-y: ${DEFAULT_ENTITY_STYLE.propsPaddingY}px;

      /* Link style tokens */
      --atp-edge-stroke: ${DEFAULT_LINK_STYLE.color};
      --atp-edge-width: ${DEFAULT_LINK_STYLE.thickness}px;
      --atp-edge-stroke-selected: ${DEFAULT_LINK_STYLE.selectedColor};
      --atp-edge-width-selected: ${DEFAULT_LINK_STYLE.selectedThickness}px;
    }
    text.vbs-entity-name {
      font-family: ${DEFAULT_ENTITY_STYLE.nameFontFamily};
      font-size: ${DEFAULT_ENTITY_STYLE.nameFontSize}px;
      font-weight: ${DEFAULT_ENTITY_STYLE.nameFontWeight};
      fill: ${DEFAULT_ENTITY_STYLE.nameColor};
    }
    text.vbs-entity-props {
      font-family: ${DEFAULT_ENTITY_STYLE.propsFontFamily};
      font-size: ${DEFAULT_ENTITY_STYLE.propsFontSize}px;
      font-weight: ${DEFAULT_ENTITY_STYLE.propsFontWeight};
      fill: ${DEFAULT_ENTITY_STYLE.propsColor};
    }
    .vbs-entity-shape {
      stroke-width: ${DEFAULT_ENTITY_STYLE.borderWidth};
    }
    .vbs-entity-rect {
      rx: var(--vbs-entity-border-radius, ${DEFAULT_ENTITY_STYLE.borderRadius}px);
      ry: var(--vbs-entity-border-radius, ${DEFAULT_ENTITY_STYLE.borderRadius}px);
    }
    .vbs-link {
      stroke: ${DEFAULT_LINK_STYLE.color};
      stroke-width: ${DEFAULT_LINK_STYLE.thickness}px;
    }
  `;
};

export const applyAppearanceTokens = (entity?: Partial<EntityStyleSettings>, link?: Partial<LinkStyleSettings>) => {
  let styleEl = document.getElementById('vbs-appearance-tokens') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'vbs-appearance-tokens';
  }
  // Always move to end of <head> so these rules come after #vbs-design-system defaults
  document.head.appendChild(styleEl);
  const e = { ...DEFAULT_ENTITY_STYLE, ...entity };
  const l = { ...DEFAULT_LINK_STYLE, ...link };
  styleEl.innerHTML = `:root {
    --vbs-entity-name-font-family: ${e.nameFontFamily};
    --vbs-entity-name-font-size: ${e.nameFontSize}px;
    --vbs-entity-name-font-weight: ${e.nameFontWeight};
    --vbs-entity-name-color: ${e.nameColor};
    --vbs-entity-props-font-family: ${e.propsFontFamily};
    --vbs-entity-props-font-size: ${e.propsFontSize}px;
    --vbs-entity-props-font-weight: ${e.propsFontWeight};
    --vbs-entity-props-color: ${e.propsColor};
    --vbs-entity-border-radius: ${e.borderRadius}px;
    --vbs-entity-border-width: ${e.borderWidth}px;
    --vbs-entity-name-padding-y: ${e.namePaddingY}px;
    --vbs-entity-props-padding-y: ${e.propsPaddingY}px;
    --atp-edge-stroke: ${l.color};
    --atp-edge-width: ${l.thickness}px;
    --atp-edge-stroke-selected: ${l.selectedColor};
    --atp-edge-width-selected: ${l.selectedThickness}px;
  }
  text.vbs-entity-name {
    font-family: ${e.nameFontFamily};
    font-size: ${e.nameFontSize}px;
    font-weight: ${e.nameFontWeight};
    fill: ${e.nameColor};
  }
  text.vbs-entity-props {
    font-family: ${e.propsFontFamily};
    font-size: ${e.propsFontSize}px;
    font-weight: ${e.propsFontWeight};
    fill: ${e.propsColor};
  }
  .vbs-entity-shape {
    stroke-width: ${e.borderWidth};
  }
  .vbs-entity-rect {
    rx: ${e.borderRadius}px;
    ry: ${e.borderRadius}px;
  }
  .vbs-link {
    stroke: ${l.color};
    stroke-width: ${l.thickness}px;
  }`;
};