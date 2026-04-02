export const atpModalStyle = `
  :host { display: contents; }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.78);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* wrapper is pass-through: pointer-events: none → clicks outside dialog hit the backdrop */
  .wrapper {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    pointer-events: none;
  }

  .dialog {
    background: var(--vbs-bg-panel, #111111);
    border: 1px solid var(--vbs-border, #27272a);
    border-radius: var(--vbs-radius, 2px);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    width: var(--atp-modal-width, 480px);
    max-width: 100%;
    max-height: 85vh;
    overflow: hidden;
    pointer-events: all;
    will-change: transform, opacity;
  }

  .body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    color: var(--vbs-text-primary, #f4f4f5);
    font-family: system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    scrollbar-width: thin;
    scrollbar-color: var(--vbs-border, #27272a) transparent;
  }
  .body::-webkit-scrollbar { width: 6px; }
  .body::-webkit-scrollbar-track { background: transparent; }
  .body::-webkit-scrollbar-thumb { background: var(--vbs-border, #27272a); border-radius: var(--vbs-radius, 2px); }

  .dialog.spotlight-border {
    position: relative;
    border: 1px solid transparent;
    background: linear-gradient(var(--vbs-bg-panel, #111111), var(--vbs-bg-panel, #111111)) padding-box,
                var(--vbs-border, #27272a) border-box;
    z-index: 1;
  }
  .dialog.spotlight-border::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: radial-gradient(
      150px circle at var(--mouse-x, 0%) var(--mouse-y, 0%),
      rgba(255, 255, 255, 0.9) 0%,
      rgba(59, 130, 246, 1) 10%,
      rgba(59, 130, 246, 0.2) 40%,
      transparent 60%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
    pointer-events: none;
  }
  .dialog.spotlight-border:hover::before {
    opacity: 1;
  }
`;
