export interface CanvasSnapshot {
  readonly exportSVG: (returnContent?: boolean) => string | void;
  readonly exportPNG: (returnContent?: boolean) => Promise<string> | void;
}

export const createCanvasSnapshot = (getSvg: () => SVGSVGElement): CanvasSnapshot => {
  const buildClone = (): { clone: SVGSVGElement; w: number; h: number } => {
    const live = getSvg();
    const rect = live.getBoundingClientRect();
    const clone = live.cloneNode(true) as SVGSVGElement;

    // Remove UI chrome — selection rings, resize handles, anchor groups
    clone.querySelectorAll('.selection-ring, .resize-handle, [data-anchor]').forEach(el => el.remove());

    // Set explicit dimensions so the SVG renders correctly as a standalone file
    clone.setAttribute('width', String(rect.width));
    clone.setAttribute('height', String(rect.height));

    // Inline resolved CSS variables so colors are preserved outside the document context
    const cs = getComputedStyle(live);
    const vars = [
      '--vbs-bg-canvas', '--vbs-primary', '--vbs-border',
      '--vbs-text-primary', '--vbs-text-secondary', '--vbs-bg-panel',
      '--atp-edge-stroke', '--vbs-grid-primary-color', '--vbs-grid-secondary-color',
    ];
    const resolved = vars
      .map(v => ({ v, val: cs.getPropertyValue(v).trim() }))
      .filter(({ val }) => val.length > 0)
      .map(({ v, val }) => `${v}:${val}`)
      .join(';');
    if (resolved.length > 0) {
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = `:root{${resolved}}`;
      clone.insertBefore(styleEl, clone.firstChild);
    }

    return { clone, w: rect.width, h: rect.height };
  };

  const exportSVG = (returnContent?: boolean): string | void => {
    const { clone } = buildClone();
    const svgStr = new XMLSerializer().serializeToString(clone);
    if (returnContent) return svgStr;

    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = (returnContent?: boolean): Promise<string> | void => {
    const { clone, w, h } = buildClone();
    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    if (returnContent) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const cnv = document.createElement('canvas');
          cnv.width = w;
          cnv.height = h;
          const ctx = cnv.getContext('2d');
          if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas 2D context not available')); return; }
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(cnv.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image for PNG export'));
        img.src = url;
      });
    }

    const img = new Image();
    img.onload = () => {
      const cnv = document.createElement('canvas');
      cnv.width = w;
      cnv.height = h;
      const ctx = cnv.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); return; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      cnv.toBlob(pngBlob => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `canvas-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = url;
  };

  return { exportSVG, exportPNG };
};
