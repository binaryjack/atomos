export default function UsagePage() {
  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <header className="border-b border-slate-800 pb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4">How to Use Atomos Structura</h1>
        <p className="text-slate-400 leading-relaxed text-lg">Step-by-step guide to installing, configuring, and rendering the visual canvas engine.</p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-blue-400 mb-4">1. Package Installation</h2>
        <p className="text-slate-300 text-[15px] leading-7 mb-4">
          Atomos Structura is distributed as a suite of decoupled packages depending on your needs.
        </p>
        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-hidden text-sm text-slate-300 font-mono leading-relaxed">
{`pnpm add @atomos-web/structura
pnpm add @atomos-web/structura-core
pnpm add @atomos-web/prime-style`}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-blue-400 mb-4">2. Initialization & Bootstrapping</h2>
        <p className="text-slate-300 text-[15px] leading-7 mb-4">
          To render the canvas inside your DOM, simply call the <code>createCanvasPage()</code> factory and attach its element to your container. You also need to boot the schema kernel for core entity interactions.
        </p>
        <pre className="bg-slate-950 p-5 rounded-xl border border-slate-800 overflow-hidden text-sm text-slate-300 font-mono leading-relaxed mt-4">
{`import '@atomos-web/prime-style/dist/styles.css';
import { createCanvasPage } from '@atomos-web/structura/dist/preview/create-canvas-page.js';
import { getEntityManager } from '@atomos-web/structura/dist/core/presentation/entity-manager.js';
import { createSchemaGraphKernel } from '@atomos-web/structura/dist/core/create-schema-graph-kernel.js';
import { createKernelAdapter } from '@atomos-web/structura/dist/adapters/create-kernel-adapter.js';

export function mountCanvas(containerDiv) {
  // 1. Create the UI page
  const page = createCanvasPage();
  containerDiv.appendChild(page.element);

  // 2. Boot the headless schema AST kernel
  const kernel = createSchemaGraphKernel();

  // 3. Connect the kernel back to the visual Canvas
  const bridge = createKernelAdapter(kernel, getEntityManager());

  return () => {
    bridge.destroy();
    page.cleanup.destroy();
  };
}`}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-blue-400 mb-4">3. Operating the Kernel</h2>
        <p className="text-slate-300 text-[15px] leading-7 mb-4">
          With the bridge established, you can command the graph directly using the <code>kernel</code> instance. Updates will instantly sync to the Redux state and auto-render inside the Canvas.
        </p>
        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-hidden text-[13px] text-slate-300 font-mono leading-relaxed">
{`// Add a new box shape to the graph payload programmatically
kernel.execute({
  type: 'add-entity',
  schemaId: 'schema-1',
  entity: {
    id: \`entity-\${Date.now()}\`,
    position: { x: 100, y: 100 },
    dimensions: { width: 250, height: 150 },
    type: 'box',
    data: {
      name: 'UserDatabase',
      baseColor: '#2563eb'
    }
  }
});`}
        </pre>
      </section>
    </div>
  )
}
