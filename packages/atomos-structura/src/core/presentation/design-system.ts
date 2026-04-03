export const injectDesignSystemTokens = () => {
  if (document.getElementById('vbs-design-system')) return;
  const style = document.createElement('style');
  style.id = 'vbs-design-system';
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
    }
  `;
  document.head.appendChild(style);
};