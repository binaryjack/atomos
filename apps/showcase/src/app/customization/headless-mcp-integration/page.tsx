import React from 'react';

export default function HeadlessMcpIntegrationPage() {
  return (
    <div className="p-4 md:p-8 p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Headless API & MCP Integration</h1>
      
      <p className="text-lg text-slate-300 mb-8">
        Atomos Structura supports powerful headless embedding and external control mechanisms. This allows host applications to bypass the built-in user interfaces and build entirely custom, agentic, or highly restricted environments.
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">Responsive Compact Read-Only Mode</h2>
        <p className="mb-4 text-slate-300">
          Atomos Structura uses CSS Container Queries to be extremely resilient in embedded widget environments. When the canvas container shrinks below <strong>400px</strong> in width, it automatically enters a <em>Compact Read-Only Mode</em> where toolbars disappear and editing is disabled.
        </p>
        
        <h3 className="text-xl font-semibold mb-2">Hover Zones</h3>
        <p className="mb-4 text-slate-300">
          To provide UX guidance when the widget shrinks, you can inject an invisible hover zone. When hovered, this zone reveals a tooltip to the user, for example: "Enlarge the canvas to regain editability".
        </p>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <pre className="text-sm text-green-300">
{`const config = {
  hoverZoneMessage: {
    zone: 'bottom',
    text: 'Enlarge the canvas to regain editability'
  }
};`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">Headless Mode & Custom Menus</h2>
        <p className="mb-4 text-slate-300">
          You can granularly control or completely disable the default toolbars using the <code>menu</code> property inside <code>WorkspaceConfig</code>.
        </p>
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
          <pre className="text-sm text-green-300">
{`const config = {
  menu: {
    zoom: { available: false },
    export: { available: false }
  }
};`}
          </pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">MCP External Control</h2>
        <p className="mb-4 text-slate-300">
          By combining the Headless API (to hide the default palette) and MCP (to manipulate the graph from the outside), you can build completely custom toolboxes or chat-driven entity generation interfaces that directly mutate the canvas state.
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
          <li><code>atomos-structura/create-entity</code></li>
          <li><code>atomos-structura/create-link</code></li>
          <li><code>atomos-structura/delete-entity</code></li>
        </ul>
      </section>
    </div>
  );
}
