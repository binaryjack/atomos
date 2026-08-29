export interface ShareCardOptions {
  readonly title?: string;
  readonly subtitle?: string;
  readonly returnContent?: boolean;
}

export interface CanvasSnapshot {
  readonly exportSVG: (returnContent?: boolean) => string | void;
  readonly exportPNG: (returnContent?: boolean) => Promise<string> | void;
  readonly exportShareCard: (options?: ShareCardOptions) => Promise<string> | void;
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

  const exportShareCard = (options?: ShareCardOptions): Promise<string> | void => {
    const CARD_W = 1200;
    const CARD_H = 630;
    const HEADER_H = 80;
    const FOOTER_H = 40;

    const { clone, w, h } = buildClone();
    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const renderCard = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const cnv = document.createElement('canvas');
          cnv.width = CARD_W;
          cnv.height = CARD_H;
          const ctx = cnv.getContext('2d');
          if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas 2D context not available')); return; }

          // 1. Background Fill (#020617)
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, CARD_W, CARD_H);

          // 2. Header Bar Background
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, CARD_W, HEADER_H);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, HEADER_H);
          ctx.lineTo(CARD_W, HEADER_H);
          ctx.stroke();

          // 3. Header Text
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
          ctx.fillText(options?.title || 'System Architecture Diagram', 30, 48);

          // Header Badge
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.fillText('ATOMOS STRUCTURA v5.0.0', CARD_W - 220, 48);

          // 4. Center Graph SVG Image
          const availableW = CARD_W - 60;
          const availableH = CARD_H - HEADER_H - FOOTER_H - 40;
          const scale = Math.min(availableW / w, availableH / h, 1);
          const drawW = w * scale;
          const drawH = h * scale;
          const drawX = (CARD_W - drawW) / 2;
          const drawY = HEADER_H + 20 + (availableH - drawH) / 2;

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          URL.revokeObjectURL(url);

          // 5. Footer Bar
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, CARD_H - FOOTER_H, CARD_W, FOOTER_H);
          ctx.strokeStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(0, CARD_H - FOOTER_H);
          ctx.lineTo(CARD_W, CARD_H - FOOTER_H);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '12px system-ui, -apple-system, sans-serif';
          ctx.fillText(`Generated on ${new Date().toISOString().split('T')[0]} • Verified Architecture Topology`, 30, CARD_H - 15);

          resolve(cnv.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image for share card export'));
        img.src = url;
      });
    };

    if (options?.returnContent) {
      return renderCard();
    }

    renderCard().then(dataUrl => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `share-card-${Date.now()}.png`;
      a.click();
    });
  };

  return { exportSVG, exportPNG, exportShareCard };
};
