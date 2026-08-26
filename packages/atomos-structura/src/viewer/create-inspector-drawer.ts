import type {
  StructuraEntityInspectorData,
  EntityInspectorStatus,
  TaskIntention,
} from './types/inspector.types.js';

export interface InspectorDrawerController {
  open: (entityId: string, data?: StructuraEntityInspectorData) => void;
  close: () => void;
  setData: (data: StructuraEntityInspectorData) => void;
  getData: () => StructuraEntityInspectorData | null;
  isOpen: () => boolean;
  setMode: (mode: 'push' | 'overlay') => void;
  getMode: () => 'push' | 'overlay';
  element: HTMLElement;
  destroy: () => void;
}

const STATUS_CONFIG: Record<
  EntityInspectorStatus,
  { label: string; bg: string; text: string; border: string; pulse?: boolean }
> = {
  not_started: { label: 'Not Started', bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' },
  in_progress: { label: 'In Progress', bg: 'rgba(6, 182, 212, 0.15)', text: '#38bdf8', border: 'rgba(6, 182, 212, 0.4)', pulse: true },
  success: { label: 'Success', bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.4)' },
  error: { label: 'Error', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.4)' },
  pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
};

const INTENTION_CONFIG: Record<TaskIntention, { label: string; bg: string; text: string; border: string }> = {
  CreateFile: { label: 'CREATE FILE', bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
  ModifyFile: { label: 'MODIFY FILE', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  DeleteFile: { label: 'DELETE FILE', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createInspectorDrawer(parentContainer: HTMLElement): InspectorDrawerController {
  let currentData: StructuraEntityInspectorData | null = null;
  let isOpened = false;
  let activeStagedFileIndex = 0;
  let currentMode: 'push' | 'overlay' = 'push';

  const root = document.createElement('div');
  root.className = 'structura-inspector-drawer mode-push';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Entity Inspector');

  // Insert styles
  const style = document.createElement('style');
  style.textContent = `
    .structura-inspector-drawer {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 25px rgba(0, 0, 0, 0.5);
      font-family: system-ui, -apple-system, sans-serif;
      color: #f8fafc;
      overflow: hidden;
      box-sizing: border-box;
    }

    .structura-inspector-drawer.mode-overlay {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 420px;
      max-width: 90%;
      border-left: 1px solid #334155;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1000;
    }

    .structura-inspector-drawer.mode-overlay.is-open {
      transform: translateX(0);
    }

    .structura-inspector-drawer.mode-push {
      position: relative;
      height: 100%;
      flex: 0 0 0px;
      width: 0px;
      opacity: 0;
      border-left: none;
      transform: none;
      transition: flex 250ms ease, width 250ms ease, opacity 200ms ease;
      z-index: 10;
    }

    .structura-inspector-drawer.mode-push.is-open {
      flex: 0 0 360px;
      width: 360px;
      opacity: 1;
      border-left: 1px solid #334155;
    }

    .structura-drawer-header {
      padding: 16px;
      border-bottom: 1px solid #1e293b;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .structura-drawer-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .structura-drawer-title {
      font-size: 15px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0;
      word-break: break-word;
    }

    .structura-drawer-close-btn {
      background: transparent;
      border: 1px solid #334155;
      color: #94a3b8;
      border-radius: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      transition: all 0.15s ease;
    }

    .structura-drawer-close-btn:hover {
      background: #1e293b;
      color: #f8fafc;
      border-color: #475569;
    }

    .structura-drawer-badges-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 11px;
    }

    .structura-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      border: 1px solid transparent;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .structura-drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .structura-drawer-section {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .structura-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .structura-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .structura-meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .structura-meta-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
    }

    .structura-meta-val {
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .structura-file-tabs {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      border-bottom: 1px solid #334155;
      padding-bottom: 6px;
    }

    .structura-file-tab {
      background: #0f172a;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .structura-file-tab.active {
      background: #3b82f6;
      color: #ffffff;
      border-color: #60a5fa;
    }

    .structura-code-container {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      color: #38bdf8;
      max-height: 220px;
      overflow: auto;
      white-space: pre;
    }

    .structura-thinking-box {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.4;
      color: #a855f7;
      max-height: 140px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    .structura-error-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      padding: 10px;
      color: #f87171;
      font-size: 12px;
    }
  `;

  root.appendChild(style);

  // Content Wrapper
  const content = document.createElement('div');
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.height = '100%';
  root.appendChild(content);

  parentContainer.appendChild(root);

  function render() {
    if (!currentData) {
      content.innerHTML = `<div style="padding: 20px; color: #64748b;">No entity data selected</div>`;
      return;
    }

    const data = currentData;
    const statusCfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.not_started;

    content.innerHTML = `
      <div class="structura-drawer-header">
        <div class="structura-drawer-title-row">
          <h3 class="structura-drawer-title">${escapeHtml(data.title || data.entityId)}</h3>
          <button class="structura-drawer-close-btn" id="structura-close-btn" title="Close Inspector">×</button>
        </div>
        <div class="structura-drawer-badges-row">
          <span class="structura-badge" style="background: ${statusCfg.bg}; color: ${statusCfg.text}; border-color: ${statusCfg.border}">
            ${statusCfg.pulse ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor; display: inline-block;"></span>' : ''}
            ${statusCfg.label}
          </span>
          ${data.role ? `<span class="structura-badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border-color: #334155">${escapeHtml(data.role)}</span>` : ''}
          ${data.executionDurationMs !== undefined ? `<span class="structura-badge" style="background: rgba(15, 23, 42, 0.6); color: #94a3b8; border-color: #334155">${data.executionDurationMs} ms</span>` : ''}
        </div>
      </div>

      <div class="structura-drawer-body">
        <!-- LoRA & Agent Specialization Section -->
        ${data.lora ? `
          <div class="structura-drawer-section">
            <div class="structura-section-title">
              <span>LoRA & Specialist Agent</span>
              <span class="structura-badge" style="${data.lora.isVramResident
                ? 'background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.3);'
                : 'background: rgba(6, 182, 212, 0.15); color: #38bdf8; border-color: rgba(6, 182, 212, 0.3);'}">
                ${data.lora.isVramResident ? '● VRAM Resident' : '⚡ JIT Auto-Trained'}
              </span>
            </div>
            <div class="structura-meta-item">
              <span class="structura-meta-label">Safetensors Adapter</span>
              <span class="structura-meta-val" style="color: #60a5fa;">${escapeHtml(data.lora.adapterName)}</span>
            </div>
            ${data.lora.specialtyDomain ? `
              <div class="structura-meta-item">
                <span class="structura-meta-label">Specialty Domain</span>
                <span class="structura-meta-val" style="color: #f1f5f9;">${escapeHtml(data.lora.specialtyDomain)}</span>
              </div>
            ` : ''}
            <div class="structura-grid-2">
              ${data.lora.rank !== undefined ? `
                <div class="structura-meta-item">
                  <span class="structura-meta-label">Rank (r) / Alpha (α)</span>
                  <span class="structura-meta-val">r=${data.lora.rank} / α=${data.lora.alpha ?? data.lora.rank * 2}</span>
                </div>
              ` : ''}
              ${data.lora.swapLatencyUs !== undefined ? `
                <div class="structura-meta-item">
                  <span class="structura-meta-label">Swap Latency</span>
                  <span class="structura-meta-val" style="color: #a7f3d0;">${data.lora.swapLatencyUs} µs</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <!-- Task & Intention Section -->
        ${data.task ? `
          <div class="structura-drawer-section">
            <div class="structura-section-title">
              <span>Task & Operation Intention</span>
              ${data.task.intention ? `
                <span class="structura-badge" style="background: ${(INTENTION_CONFIG[data.task.intention] || INTENTION_CONFIG.ModifyFile).bg}; color: ${(INTENTION_CONFIG[data.task.intention] || INTENTION_CONFIG.ModifyFile).text}; border-color: ${(INTENTION_CONFIG[data.task.intention] || INTENTION_CONFIG.ModifyFile).border};">
                  ${(INTENTION_CONFIG[data.task.intention] || INTENTION_CONFIG.ModifyFile).label}
                </span>
              ` : ''}
            </div>
            <div style="font-size: 12px; color: #e2e8f0; line-height: 1.5;">
              ${escapeHtml(data.task.description)}
            </div>
            ${data.task.filePath ? `
              <div class="structura-meta-item">
                <span class="structura-meta-label">Target File Path</span>
                <span class="structura-meta-val" style="color: #f59e0b; word-break: break-all;">${escapeHtml(data.task.filePath)}</span>
              </div>
            ` : ''}
            ${data.task.hints ? `
              <div style="font-size: 11px; color: #94a3b8; background: #020617; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #3b82f6;">
                💡 ${escapeHtml(data.task.hints)}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Virtual RAM Staged Files Section -->
        ${data.stagedFiles && data.stagedFiles.length > 0 ? `
          <div class="structura-drawer-section">
            <div class="structura-section-title">
              <span>Virtual RAM Staged Files (${data.stagedFiles.length})</span>
            </div>
            <div class="structura-file-tabs">
              ${data.stagedFiles.map((file, idx) => `
                <button class="structura-file-tab ${idx === activeStagedFileIndex ? 'active' : ''}" data-file-idx="${idx}">
                  ${escapeHtml(file.relativePath.split('/').pop() || file.relativePath)}
                </button>
              `).join('')}
            </div>
            ${renderStagedFile(data.stagedFiles[activeStagedFileIndex] || data.stagedFiles[0]!)}
          </div>
        ` : ''}

        <!-- Thinking Log & Errors Section -->
        ${data.thinkingLog ? `
          <div class="structura-drawer-section">
            <div class="structura-section-title">
              <span>Thinking Stream</span>
            </div>
            <div class="structura-thinking-box">${escapeHtml(data.thinkingLog)}</div>
          </div>
        ` : ''}

        ${data.error ? `
          <div class="structura-error-box">
            <strong>⚠️ Execution Error:</strong>
            <div style="margin-top: 4px; font-family: monospace;">${escapeHtml(data.error)}</div>
          </div>
        ` : ''}
      </div>
    `;

    // Attach listener for close button
    const closeBtn = content.querySelector('#structura-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => close());
    }

    // Attach listeners for staged file tabs
    const tabBtns = content.querySelectorAll('.structura-file-tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-file-idx'));
        if (!isNaN(idx)) {
          activeStagedFileIndex = idx;
          render();
        }
      });
    });

    // Attach copy button listener
    const copyBtn = content.querySelector('#structura-copy-code-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const file = data.stagedFiles?.[activeStagedFileIndex];
        if (file) {
          navigator.clipboard.writeText(file.content).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
          }).catch(() => {});
        }
      });
    }
  }

  function renderStagedFile(file: { relativePath: string; sizeBytes: number; content: string; language?: string }) {
    const lines = file.content.split('\n');
    const numberedCode = lines.map((line, i) =>
      `<span style="color: #475569; user-select: none; width: 28px; display: inline-block; text-align: right; margin-right: 8px;">${i + 1}</span>${escapeHtml(line)}`
    ).join('\n');

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b;">
        <span>${escapeHtml(file.relativePath)}</span>
        <span>${formatBytes(file.sizeBytes)} • ${file.language || 'text'}</span>
      </div>
      <div style="position: relative;">
        <button id="structura-copy-code-btn" style="position: absolute; top: 6px; right: 6px; background: rgba(15,23,42,0.8); border: 1px solid #334155; color: #94a3b8; font-size: 10px; padding: 2px 6px; border-radius: 4px; cursor: pointer; z-index: 10;">Copy</button>
        <div class="structura-code-container">${numberedCode}</div>
      </div>
    `;
  }

  function open(entityId: string, data?: StructuraEntityInspectorData) {
    if (data) {
      currentData = data;
    } else if (!currentData || currentData.entityId !== entityId) {
      // Default placeholder data if none supplied
      currentData = {
        entityId,
        title: `Entity ${entityId}`,
        status: 'in_progress',
      };
    }
    activeStagedFileIndex = 0;
    render();
    root.classList.add('is-open');
    isOpened = true;
  }

  function close() {
    root.classList.remove('is-open');
    isOpened = false;
  }

  function setData(data: StructuraEntityInspectorData) {
    currentData = data;
    render();
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setMode(mode: 'push' | 'overlay') {
    currentMode = mode === 'overlay' ? 'overlay' : 'push';
    root.classList.remove('mode-push', 'mode-overlay');
    root.classList.add(`mode-${currentMode}`);
  }

  return {
    open,
    close,
    setData,
    getData: () => currentData,
    isOpen: () => isOpened,
    setMode,
    getMode: () => currentMode,
    element: root,
    destroy: () => {
      root.remove();
    },
  };
}
