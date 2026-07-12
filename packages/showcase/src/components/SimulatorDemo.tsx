'use client'

import React, { useEffect, useRef, useState } from 'react'

interface Warning {
  rule: string;
  message: string;
}

export function SimulatorDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasPageRef = useRef<any>(null);
  const [isReadonly, setIsReadonly] = useState(false);
  const [isHeadless, setIsHeadless] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // We need to keep a ref to the latest state for the async telemetry
  const isExecutingRef = useRef(isExecuting);
  useEffect(() => {
    isExecutingRef.current = isExecuting;
  }, [isExecuting]);

  // Dynamically load Structura API
  useEffect(() => {
    let mounted = true;
    let createCanvasPage: any;
    let getEntityManager: any;

    const init = async () => {
      // Dynamic imports to bypass SSR
      const structuraEntity = await import('@atomos-web/structura/dist/core/presentation/entity-manager.js');
      const structuraCanvas = await import('@atomos-web/structura/dist/preview/create-canvas-page.js');
      
      createCanvasPage = structuraCanvas.createCanvasPage;
      getEntityManager = structuraEntity.getEntityManager;

      if (!mounted) return;

      mountCanvas();
      setTimeout(seedSchema, 100);
    };

    const mountCanvas = () => {
      if (!containerRef.current || !createCanvasPage) return;
      
      if (canvasPageRef.current) {
        canvasPageRef.current.cleanup.destroy();
      }

      containerRef.current.innerHTML = '';
      const page = createCanvasPage('simulator-instance', { readonly: isReadonly, headless: isHeadless });
      canvasPageRef.current = page;
      containerRef.current.appendChild(page.element);
    };

    const seedSchema = () => {
      if (!getEntityManager) return;
      const em = getEntityManager('simulator-instance');
      
      if (em.getAllEntities().length > 0) return;

      em.createEntity('node1', 'View', { x: -300, y: -100 }, { width: 220, height: 180 }, { shape: 'rectangle', color: '#3b82f6' });
      em.updateEntityProperties('node1', [
        { key: 'render', label: 'render()', dataType: 'function', componentType: 'input', value: '' },
        { key: 'template', label: 'template', dataType: 'string', componentType: 'input', value: 'html' }
      ]);
      
      em.createEntity('node2', 'Controller', { x: 0, y: -100 }, { width: 220, height: 180 }, { shape: 'rectangle', color: '#10b981' });
      em.updateEntityProperties('node2', [
        { key: 'handleInput', label: 'handleInput()', dataType: 'function', componentType: 'input', value: '' },
        { key: 'updateModel', label: 'updateModel()', dataType: 'function', componentType: 'input', value: '' }
      ]);

      em.createEntity('node3', 'Model', { x: 300, y: -100 }, { width: 220, height: 180 }, { shape: 'cylinder', color: '#f59e0b' });
      em.updateEntityProperties('node3', [
        { key: 'data', label: 'data', dataType: 'object', componentType: 'input', value: '{}' },
        { key: 'notifyObservers', label: 'notify()', dataType: 'function', componentType: 'input', value: '' }
      ]);
      
      em.createLink('link1', 'right', 'left', 'node1', 'node2');
      em.createLink('link2', 'right', 'left', 'node2', 'node3');
      em.createLink('link3', 'bottom', 'bottom', 'node3', 'node1');
    };

    init();

    return () => {
      mounted = false;
      if (canvasPageRef.current) {
        canvasPageRef.current.cleanup.destroy();
        canvasPageRef.current = null;
      }
    };
  }, [isReadonly, isHeadless]);

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

  const handleTelemetry = async () => {
    if (isExecuting) {
      setIsExecuting(false);
      return;
    }
    
    setIsExecuting(true);
    isExecutingRef.current = true;
    
    // We dynamically import getEntityManager here to avoid SSR issues
    const { getEntityManager } = await import('@atomos-web/structura/dist/core/presentation/entity-manager.js');
    const em = getEntityManager('simulator-instance');
    const entities = em.getAllEntities();
    const links = em.getAllLinks();
    
    const inDegree = new Map(entities.map(en => [en.id, 0]));
    const adj = new Map(entities.map(en => [en.id, [] as any[]]));
    
    links.forEach(l => {
      if(inDegree.has(l.targetEntityId)) inDegree.set(l.targetEntityId, (inDegree.get(l.targetEntityId) || 0) + 1);
      if(adj.has(l.sourceEntityId)) adj.get(l.sourceEntityId)?.push({ link: l, target: l.targetEntityId });
    });
    
    let queue = entities.filter(en => inDegree.get(en.id) === 0).map(en => en.id);
    if (queue.length === 0 && entities.length > 0) queue = [entities[0].id];
    
    // Reset visuals
    entities.forEach(en => {
      em.updateEntityMetadata(en.id, { color: undefined });
      const el = document.querySelector(`[data-entity-id="${en.id}"]`) as HTMLElement;
      if (el) {
        el.style.filter = '';
        const badge = el.querySelector('.sim-check-badge');
        if (badge) badge.remove();
      }
    });
    
    links.forEach(l => {
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
         em.updateEntityMetadata(id, { color: '#f59e0b' });
         const el = document.querySelector(`[data-entity-id="${id}"]`) as HTMLElement;
         if (el) {
           el.style.transition = 'filter 0.3s';
           el.style.filter = 'drop-shadow(0 0 12px #f59e0b)';
         }
      }
      
      await new Promise(r => setTimeout(r, 800));
      if (!isExecutingRef.current) break;
      
      // Mark Completed with Random State
      for (const id of queue) {
         const states = [
           { color: '#10b981', type: 'success', shadow: '0 0 16px #10b981' }, // Green
           { color: '#ef4444', type: 'error', shadow: '0 0 16px #ef4444' }, // Red
           { color: '#f59e0b', type: 'warning', shadow: '0 0 16px #f59e0b' }, // Orange
           { color: '#64748b', type: 'skipped', shadow: 'none' } // Gray
         ];
         
         const roll = Math.random();
         let state = states[0];
         if (roll > 0.6) state = states[1];
         if (roll > 0.8) state = states[2];
         if (roll > 0.9) state = states[3];
         
         em.updateEntityMetadata(id, { color: state.color });
         const el = document.querySelector(`[data-entity-id="${id}"]`) as HTMLElement;
         if (el) {
           el.style.filter = state.shadow ? `drop-shadow(${state.shadow})` : '';
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
      let linkPromises = [];
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

  const btnClass = "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium py-2 px-3 rounded transition-colors text-sm text-left w-full";

  return (
    <div className="flex w-full h-[700px] border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-slate-200">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes vbs-dash {
          to { stroke-dashoffset: -10; }
        }
        .sim-animated-link {
          animation: vbs-dash 0.6s linear infinite !important;
        }
      `}} />
      
      {/* Left Sidebar */}
      <div className="w-[280px] min-w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col p-4 gap-6 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold border-b border-slate-700 pb-2 mb-2 text-white">Consumer Simulator</h2>
          <p className="text-xs text-slate-400">This panel imitates an external consumer controlling Structura via MCP tools.</p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Modes</h3>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-600" checked={isReadonly} onChange={e => setIsReadonly(e.target.checked)} />
            Read-Only Mode
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-600" checked={isHeadless} onChange={e => setIsHeadless(e.target.checked)} />
            Headless (No UI)
          </label>
          <button 
            className={`mt-2 py-2 px-3 rounded font-medium text-white transition-colors text-sm w-full ${isExecuting ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-500'}`}
            onClick={handleTelemetry}
          >
            {isExecuting ? 'Stop Telemetry' : 'Start Telemetry'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Viewport</h3>
          <button className={btnClass} onClick={() => dispatchMcp('structura_set_zoom', { level: 'in' })}>Zoom In</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_set_zoom', { level: 'out' })}>Zoom Out</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_fit_to_screen', { padding: { right: 320, left: 100, top: 100, bottom: 100 } })}>Fit to Screen</button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Actions</h3>
          <button className={btnClass} onClick={() => dispatchMcp('structura_undo')}>Undo</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_redo')}>Redo</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_auto_layout')}>Auto Layout Nodes</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_optimize_connections')}>Optimize Connections</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_load_schema_preset')}>Load Schema Preset</button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Export</h3>
          <button className={btnClass} onClick={() => dispatchMcp('structura_export_svg')}>Export SVG</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_export_png')}>Export PNG</button>
          <button className={btnClass} onClick={() => dispatchMcp('structura_export_dag')}>Export DAG JSON</button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-slate-950" ref={containerRef}>
        {/* Canvas is injected here */}
      </div>

      {/* Right Sidebar */}
      <div className="w-[300px] min-w-[300px] bg-slate-900 border-l border-slate-800 flex flex-col p-4 gap-4 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold border-b border-slate-700 pb-2 mb-2 text-white">Errors & Warnings</h2>
          <p className="text-xs text-slate-400">Headless validation events propagated via MCP/DOM events.</p>
        </div>
        
        <div className="flex flex-col gap-2">
          {warnings.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No warnings</p>
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
