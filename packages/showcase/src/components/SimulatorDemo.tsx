'use client'

import React, { useEffect, useRef, useState } from 'react'
import { load_preset } from '../schema/presets'

interface Warning {
  rule: string;
  message: string;
}

export function SimulatorDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasPageRef = useRef<any>(null);
  const kernelRef = useRef<any>(null);
  const bridgeRef = useRef<any>(null);

  const [selectedPreset, setSelectedPreset] = useState<string>('mvc');
  const [isReadonly, setIsReadonly] = useState(false);
  const [isHeadless, setIsHeadless] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isMouseZoomEnabled, setIsMouseZoomEnabled] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // Keep a ref to latest execution state for async loops
  const isExecutingRef = useRef(isExecuting);
  useEffect(() => {
    isExecutingRef.current = isExecuting;
  }, [isExecuting]);

  // Dynamically load Structura API
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const structura = await import('@atomos-web/structura');
      if (!mounted || !containerRef.current) return;

      const instanceId = 'simulator-instance';

      // Clean up previous canvas page if it exists
      if (canvasPageRef.current) {
        if (typeof canvasPageRef.current.cleanup === 'function') {
          canvasPageRef.current.cleanup();
        } else if (canvasPageRef.current.cleanup?.destroy) {
          canvasPageRef.current.cleanup.destroy();
        }
        if (bridgeRef.current?.destroy) {
          bridgeRef.current.destroy();
        }
      }

      structura.initToolboxConfigManager(instanceId);

      const canvasPage = structura.createCanvasPage(instanceId, { 
        readonly: isReadonly, 
        headless: isHeadless, 
        allow_multiple_schemas: false 
      });
      
      canvasPage.element.style.position = 'absolute';
      canvasPage.element.style.inset = '0';
      canvasPageRef.current = canvasPage;

      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(canvasPage.element);

      const em = structura.getEntityManager(instanceId);
      const kernel = structura.createSchemaGraphKernel();
      const bridge = structura.createKernelAdapter(kernel, em);

      kernelRef.current = kernel;
      bridgeRef.current = bridge;

      // Seed with selected preset
      load_preset(kernel, em, selectedPreset);

      // Center and fit canvas
      setTimeout(() => {
        dispatchMcp('structura_fit_to_screen', { padding: { top: 100, bottom: 100, left: 100, right: 100 } });
      }, 200);
    };

    init();

    return () => {
      mounted = false;
      if (canvasPageRef.current) {
        if (typeof canvasPageRef.current.cleanup === 'function') {
          canvasPageRef.current.cleanup();
        } else if (canvasPageRef.current.cleanup?.destroy) {
          canvasPageRef.current.cleanup.destroy();
        }
        canvasPageRef.current = null;
      }
      if (bridgeRef.current?.destroy) {
        bridgeRef.current.destroy();
        bridgeRef.current = null;
      }
    };
  }, [isReadonly, isHeadless, selectedPreset]);

  // Listen for warnings
  useEffect(() => {
    const handleWarnings = (e: any) => {
      setWarnings(e.detail?.warnings || []);
    };
    window.addEventListener('vbs-validation-warnings', handleWarnings);
    return () => window.removeEventListener('vbs-validation-warnings', handleWarnings);
  }, []);

  const dispatchMcp = (action: string, args: any = {}) => {
    console.log(`[Simulator] Executing ${action}`);
    if (action === 'structura_undo') {
      document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'z' }));
    } else if (action === 'structura_redo') {
      document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'y' }));
    } else {
      window.dispatchEvent(new CustomEvent('vbs-mcp-action', {
        detail: { reqId: `sim-req-${Date.now()}`, action, args },
        sendResult: (data: any) => console.log('[Simulator] Received tool result payload:', data)
      } as any));
    }
  };

  // Re-center canvas when sidebars open/close
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatchMcp('structura_fit_to_screen', { padding: { top: 100, bottom: 100, left: 100, right: 100 } });
    }, 350);
    return () => clearTimeout(timer);
  }, [isLeftSidebarOpen, isRightSidebarOpen]);

  const handleTelemetry = async () => {
    if (isExecuting) {
      setIsExecuting(false);
      return;
    }
    
    setIsExecuting(true);
    isExecutingRef.current = true;
    
    const { getEntityManager } = await import('@atomos-web/structura');
    const em = getEntityManager('simulator-instance');
    const entities = em.getAllEntities();
    const links = em.getAllLinks();
    
    if (entities.length === 0) {
      setIsExecuting(false);
      return;
    }

    const inDegree = new Map<string, number>(entities.map((en: any) => [en.id, 0]));
    const adj = new Map<string, any[]>(entities.map((en: any) => [en.id, [] as any[]]));
    
    links.forEach((l: any) => {
      if (inDegree.has(l.targetEntityId)) inDegree.set(l.targetEntityId, (inDegree.get(l.targetEntityId) || 0) + 1);
      if (adj.has(l.sourceEntityId)) adj.get(l.sourceEntityId)?.push({ link: l, target: l.targetEntityId });
    });
    
    let queue = entities.filter((en: any) => inDegree.get(en.id) === 0).map((en: any) => en.id);
    if (queue.length === 0 && entities.length > 0) queue = [entities[0].id];
    
    // Reset visuals
    entities.forEach((en: any) => {
      const el = document.querySelector(`[data-entity-id="${en.id}"]`) as HTMLElement;
      if (el) {
        el.style.filter = '';
        const defaultColor = en.color || 'var(--vbs-bg-panel, #111111)';
        el.style.setProperty('--vbs-entity-color', defaultColor);
        import('@atomos-web/prime').then(({ computeContrastColor }) => {
          const contrast = computeContrastColor(defaultColor);
          el.style.setProperty('--vbs-entity-text-color', contrast.textColor);
          el.style.setProperty('--vbs-entity-muted-color', contrast.mutedColor);
        });
        const badge = el.querySelector('.sim-check-badge');
        if (badge) badge.remove();
      }
    });
    
    links.forEach((l: any) => {
      const linkEl = document.getElementById(l.id);
      if (linkEl) {
        const p = linkEl.querySelector('path');
        if (p) {
          p.style.stroke = '';
          p.style.strokeDasharray = '';
          p.style.strokeDashoffset = '';
        }
        linkEl.querySelector('.sim-progress-path')?.remove();
        linkEl.querySelector('.sim-travel-dot')?.remove();
      }
    });

    while (queue.length > 0 && isExecutingRef.current) {
      // Glow (Processing state)
      for (const id of queue) {
         const el = document.querySelector(`[data-entity-id="${id}"]`) as HTMLElement;
         if (el) {
           el.style.transition = 'filter 0.3s';
           el.style.filter = 'drop-shadow(0 0 16px #f59e0b)';
           el.style.setProperty('--vbs-entity-color', '#f59e0b');
           import('@atomos-web/prime').then(({ computeContrastColor }) => {
             const contrast = computeContrastColor('#f59e0b');
             el.style.setProperty('--vbs-entity-text-color', contrast.textColor);
             el.style.setProperty('--vbs-entity-muted-color', contrast.mutedColor);
           });
         }
      }
      
      await new Promise(r => setTimeout(r, 800));
      if (!isExecutingRef.current) break;
      
      // Mark Completed with Success/Warning/Error states
      for (const id of queue) {
         const states = [
           { color: '#10b981', type: 'success', shadow: '0 0 16px #10b981' }, // Green
           { color: '#ef4444', type: 'error', shadow: '0 0 16px #ef4444' }, // Red
           { color: '#f59e0b', type: 'warning', shadow: '0 0 16px #f59e0b' }, // Orange
           { color: '#64748b', type: 'skipped', shadow: 'none' } // Gray
         ];
         
         const roll = Math.random();
         let state = states[0]!;
         if (roll > 0.7) state = states[1]!;
         if (roll > 0.85) state = states[2]!;
         if (roll > 0.95) state = states[3]!;
         
         const el = document.querySelector(`[data-entity-id="${id}"]`) as HTMLElement;
         if (el) {
           el.style.filter = state.shadow ? `drop-shadow(${state.shadow})` : '';
           el.style.setProperty('--vbs-entity-color', state.color);
           import('@atomos-web/prime').then(({ computeContrastColor }) => {
             const contrast = computeContrastColor(state.color);
             el.style.setProperty('--vbs-entity-text-color', contrast.textColor);
             el.style.setProperty('--vbs-entity-muted-color', contrast.mutedColor);
           });

           const badge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
           badge.setAttribute('class', 'sim-check-badge');
           const entity = em.getEntity(id);
           const w = entity?.dimensions?.width ?? 200;
           badge.setAttribute('transform', `translate(${w - 12}, -12)`);
           
           if (state.type === 'success') {
             badge.innerHTML = `
               <circle cx="12" cy="12" r="12" fill="${state.color}" />
               <path d="M7 12l3 3l7-7" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
             `;
           } else if (state.type === 'error') {
             badge.innerHTML = `
               <circle cx="12" cy="12" r="12" fill="${state.color}" />
               <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" />
             `;
           } else if (state.type === 'warning') {
             badge.innerHTML = `
               <circle cx="12" cy="12" r="12" fill="${state.color}" />
               <path d="M12 6v6M12 16v2" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" />
             `;
           } else {
             badge.innerHTML = `
               <circle cx="12" cy="12" r="12" fill="${state.color}" />
               <path d="M7 12h10" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" />
             `;
           }
           el.appendChild(badge);
         }
      }
      
      let nextQueue: string[] = [];
      let linkPromises: Promise<unknown>[] = [];
      for (const id of queue) {
         const outgoing = adj.get(id) || [];
         for (const out of outgoing) {
           nextQueue.push(out.target);
           linkPromises.push(new Promise(resolve => {
              const linkEl = document.getElementById(out.link.id);
              if (!linkEl) return resolve(null);
              
              const mainPath = linkEl.querySelector('path');
              if (!mainPath) return resolve(null);
              
              const pathLength = mainPath.getTotalLength();
              
              const progPath = mainPath.cloneNode(false) as SVGPathElement;
              progPath.setAttribute('class', 'sim-progress-path');
              progPath.style.stroke = '#10b981';
              progPath.style.strokeWidth = '4';
              progPath.style.strokeDasharray = pathLength.toString();
              progPath.style.strokeDashoffset = pathLength.toString();
              progPath.style.transition = 'stroke-dashoffset 1s linear';
              linkEl.appendChild(progPath);
              
              const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              dot.setAttribute('class', 'sim-travel-dot');
              dot.setAttribute('r', '6');
              dot.setAttribute('fill', '#fff');
              dot.setAttribute('filter', 'drop-shadow(0 0 6px #10b981)');
              
              const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
              motion.setAttribute('dur', '1s');
              motion.setAttribute('fill', 'freeze');
              
              const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath');
              const pathId = 'path-' + out.link.id;
              mainPath.setAttribute('id', pathId);
              mpath.setAttribute('href', '#' + pathId);
              
              motion.appendChild(mpath);
              dot.appendChild(motion);
              linkEl.appendChild(dot);
              
              setTimeout(() => {
                progPath.style.strokeDashoffset = '0';
              }, 50);
              
              setTimeout(() => {
                progPath.style.transition = 'opacity 0.3s';
                progPath.style.opacity = '0';
                dot.style.transition = 'opacity 0.3s';
                dot.style.opacity = '0';
                setTimeout(() => { 
                  progPath.remove(); 
                  dot.remove(); 
                  resolve(null); 
                }, 300);
              }, 1000);
           }));
         }
      }
      
      if (linkPromises.length > 0) {
        await Promise.all(linkPromises);
      }
      
      queue = [...new Set(nextQueue)];
    }
    
    if (isExecutingRef.current) {
       setIsExecuting(false);
    }
  };

  const btnClass = "px-3 py-2 text-sm text-left w-full justify-start mt-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors";

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#020617] text-slate-200 relative">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes vbs-dash {
          to { stroke-dashoffset: -10; }
        }
        .sim-animated-link {
          animation: vbs-dash 0.6s linear infinite !important;
        }
      `}} />

      {/* Floating Toggle Buttons */}
      <div className={`absolute top-6 left-6 z-50 transition-opacity duration-200 ${isLeftSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button 
          onClick={() => setIsLeftSidebarOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800/90 hover:bg-slate-700 backdrop-blur rounded-md border border-slate-700 text-white shadow-lg transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          Simulator
        </button>
      </div>

      <div className={`absolute top-6 right-6 z-50 transition-opacity duration-200 ${isRightSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button 
          onClick={() => setIsRightSidebarOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800/90 hover:bg-slate-700 backdrop-blur rounded-md border border-slate-700 text-white shadow-lg transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          Logs
        </button>
      </div>

      {/* Left Sidebar */}
      <div className={`
        flex-none relative w-72 sm:w-[320px] 
        bg-[#020617] border-r border-white/5 flex flex-col p-4 gap-6 overflow-y-auto
        transition-[margin] duration-300 ease-in-out z-30
        ${isLeftSidebarOpen ? "ml-0" : "-ml-72 sm:-ml-[320px]"}
      `}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Consumer Simulator</h2>
          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors" onClick={() => setIsLeftSidebarOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="border-b border-slate-700 pb-2 -mt-4">
          <p className="text-xs text-slate-400">Control Structura in real-time via simulated MCP commands & telemetry.</p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Architecture Preset</h3>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-xs rounded-md px-3 py-2 text-slate-200 outline-none focus:border-blue-500 font-medium"
          >
            <option value="mvc">MVC Architecture</option>
            <option value="cqrs">CQRS Pattern</option>
            <option value="flux">FLUX Architecture</option>
            <option value="database">Relational Database</option>
            <option value="security-schema">Security Architecture</option>
            <option value="activity-workflow">Activity Workflow</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Execution Simulation</h3>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-600" checked={isReadonly} onChange={e => setIsReadonly(e.target.checked)} />
            Read-Only Mode
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-600" checked={isHeadless} onChange={e => setIsHeadless(e.target.checked)} />
            Headless (No UI)
          </label>
          <button 
            className={`w-full mt-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isExecuting ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}
            onClick={handleTelemetry}
          >
            {isExecuting ? '⏹ Stop Telemetry' : '▶ Start Telemetry'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Viewport & Layout</h3>
          <div className="grid grid-cols-2 gap-2">
            <button className={btnClass} onClick={() => dispatchMcp('structura_set_zoom', { level: 'in' })}>🔍 Zoom In</button>
            <button className={btnClass} onClick={() => dispatchMcp('structura_set_zoom', { level: 'out' })}>🔍 Zoom Out</button>
          </div>
          <button className={btnClass} onClick={() => dispatchMcp('structura_fit_to_screen', { padding: { right: 100, left: 100, top: 100, bottom: 100 } })}>🎯 Fit to Screen</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_auto_layout', { layout_template: 'sugiyama' })}>⚡ Auto Layout (Sugiyama)</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_optimize_connections')}>🔗 Optimize Connections</button>
          <button className={btnClass} onClick={() => {
            const newState = !isMouseZoomEnabled;
            setIsMouseZoomEnabled(newState);
            dispatchMcp('structura_toggle_mouse_zoom', { enabled: newState });
          }}>
            {isMouseZoomEnabled ? '🖱 Disable Scroll Zoom' : '🖱 Enable Scroll Zoom'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">MCP Protocol</h3>
          <div className="grid grid-cols-2 gap-2">
            <button className={btnClass} onClick={() => dispatchMcp('structura_undo')}>↩ Undo</button>
            <button className={btnClass} onClick={() => dispatchMcp('structura_redo')}>↪ Redo</button>
          </div>
          <button className={`${btnClass} !bg-purple-700 hover:!bg-purple-600 text-white`} onClick={() => dispatchMcp('structura_discovery', { topic: 'all' })}>🔮 Discover Capabilities</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_export_svg')}>📐 Export SVG</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_export_dag')}>💾 Export DAG JSON</button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative bg-[#020617] overflow-hidden" ref={containerRef}>
        {/* Structura Canvas is injected here */}
      </div>

      {/* Right Sidebar */}
      <div className={`
        flex-none relative w-72 sm:w-[320px] 
        bg-[#020617] border-l border-white/5 flex flex-col p-4 gap-4 overflow-y-auto
        transition-[margin] duration-300 ease-in-out z-30
        ${isRightSidebarOpen ? "mr-0" : "-mr-72 sm:-mr-[320px]"}
      `}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Diagnostics & Events</h2>
          <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors" onClick={() => setIsRightSidebarOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="border-b border-slate-700 pb-2 -mt-2">
          <p className="text-xs text-slate-400">Real-time telemetry and validation events emitted from Structura kernel.</p>
        </div>
        
        <div className="flex flex-col gap-2">
          {warnings.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">✓ Graph topology healthy</p>
              <p className="text-[10px] text-slate-500 mt-1">No violations or deadlocks detected</p>
            </div>
          ) : (
            warnings.map((w, idx) => (
              <div key={idx} className="bg-red-900/20 border-l-4 border-red-500 p-3 rounded text-sm text-red-200">
                <strong className="block mb-1">{w.rule}</strong>
                <span className="opacity-80">{w.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
