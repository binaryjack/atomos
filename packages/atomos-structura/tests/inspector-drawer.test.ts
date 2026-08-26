/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInspectorDrawer } from '../src/viewer/create-inspector-drawer.js';
import type { StructuraEntityInspectorData } from '../src/viewer/types/inspector.types.js';
import { AtomosStructuraViewerElement } from '../src/viewer/atomos-structura-viewer.js';

describe('Contextual Entity Inspector Drawer', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates and toggles drawer visibility', () => {
    const drawer = createInspectorDrawer(container);
    expect(drawer.isOpen()).toBe(false);
    expect(drawer.element.classList.contains('is-open')).toBe(false);

    drawer.open('entity-1');
    expect(drawer.isOpen()).toBe(true);
    expect(drawer.element.classList.contains('is-open')).toBe(true);

    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    expect(drawer.element.classList.contains('is-open')).toBe(false);
  });

  it('renders LoRA specialization, task intention, staged files, and thinking log', () => {
    const drawer = createInspectorDrawer(container);

    const testData: StructuraEntityInspectorData = {
      entityId: 'agent-slot-0',
      title: 'C# .NET 9 Specialist Agent',
      role: 'WPF Architecture Specialist',
      status: 'in_progress',
      executionDurationMs: 342,
      lora: {
        adapterName: 'csharp_wpf_mvvm_v1.safetensors',
        specialtyDomain: 'C# .NET 9 WPF MVVM & XAML',
        isVramResident: true,
        rank: 16,
        alpha: 32,
        swapLatencyUs: 45,
      },
      task: {
        description: 'Refactor MainWindowViewModel.cs with reactive signals',
        filePath: 'src/ViewModels/MainWindowViewModel.cs',
        intention: 'ModifyFile',
        hints: 'Use CommunityToolkit.Mvvm source generators',
      },
      stagedFiles: [
        {
          relativePath: 'src/ViewModels/MainWindowViewModel.cs',
          sizeBytes: 1024,
          content: 'public class MainWindowViewModel { }',
          language: 'csharp',
        },
      ],
      thinkingLog: '[10:42:01] Parsing AST for MainWindowViewModel...\n[10:42:02] Injecting reactive properties.',
    };

    drawer.open('agent-slot-0', testData);
    const html = drawer.element.innerHTML;

    expect(html).toContain('C# .NET 9 Specialist Agent');
    expect(html).toContain('csharp_wpf_mvvm_v1.safetensors');
    expect(html).toContain('● VRAM Resident');
    expect(html).toContain('MODIFY FILE');
    expect(html).toContain('MainWindowViewModel.cs');
    expect(html).toContain('Parsing AST for MainWindowViewModel');
  });

  it('renders JIT Auto-Trained badge when isVramResident is false', () => {
    const drawer = createInspectorDrawer(container);
    drawer.open('agent-slot-1', {
      entityId: 'agent-slot-1',
      title: 'JIT Agent',
      status: 'success',
      lora: {
        adapterName: 'python_fastapi_v2.safetensors',
        isVramResident: false,
      },
    });

    expect(drawer.element.innerHTML).toContain('⚡ JIT Auto-Trained');
  });

  it('supports drawer mode configuration (push vs overlay)', () => {
    const drawer = createInspectorDrawer(container);
    expect(drawer.getMode()).toBe('push');
    expect(drawer.element.classList.contains('mode-push')).toBe(true);

    drawer.setMode('overlay');
    expect(drawer.getMode()).toBe('overlay');
    expect(drawer.element.classList.contains('mode-overlay')).toBe(true);

    const viewer = new AtomosStructuraViewerElement();
    container.appendChild(viewer);

    expect(viewer.drawerMode).toBe('push');
    expect(viewer.getAttribute('drawer-mode')).toBe('push');

    viewer.drawerMode = 'overlay';
    expect(viewer.drawerMode).toBe('overlay');
    expect(viewer.getAttribute('drawer-mode')).toBe('overlay');
  });

  it('custom element exposes openInspector, closeInspector, setInspectorData, and enableInspectorDrawer', () => {
    const viewer = new AtomosStructuraViewerElement();
    container.appendChild(viewer);

    expect(viewer.enableInspectorDrawer).toBe(true);

    const testData: StructuraEntityInspectorData = {
      entityId: 'e1',
      title: 'Test Entity E1',
      status: 'success',
    };

    viewer.openInspector('e1', testData);
    viewer.setInspectorData({ ...testData, title: 'Updated E1 Title' });
    viewer.closeInspector();

    viewer.enableInspectorDrawer = false;
    expect(viewer.enableInspectorDrawer).toBe(false);
    expect(viewer.getAttribute('enable-inspector-drawer')).toBe('false');
  });
});
