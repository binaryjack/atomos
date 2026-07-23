"use client";

import { useState, useEffect } from "react";

export default function MermaidPage() {
  const [mermaidText, setMermaidText] = useState<string>(
    `graph TD\n  ent_1["Auth Service"] -->|"Queries"| ent_2["User Store"]\n  ent_1 -->|"Logs"| ent_3["Audit Log"]`
  );

  const [convertedSnapshot, setConvertedSnapshot] = useState<string>("");
  const [exportedMermaid, setExportedMermaid] = useState<string>("");

  useEffect(() => {
    import("@atomos-web/structura").then(({ toMermaid }) => {
      const dummySnapshot = {
        entities: [
          { id: "A", code: "A", name: "Client Application", shape: "rectangle" as const, position: { x: 0, y: 0 }, dimensions: { width: 100, height: 50 }, properties: [], edges: [], createdAt: 0, updatedAt: 0 },
          { id: "B", code: "B", name: "API Gateway", shape: "rectangle" as const, position: { x: 0, y: 0 }, dimensions: { width: 100, height: 50 }, properties: [], edges: [], createdAt: 0, updatedAt: 0 }
        ],
        links: [
          { id: "L1", leftEntityId: "A", rightEntityId: "B", label: "HTTP REST", thickness: 3 as const, isHighlighted: false }
        ],
        settings: { theme: "sovereign-dark", grid: true, zoom: 1 }
      };

      setExportedMermaid(toMermaid(dummySnapshot as any));
    });
  }, []);

  const handleConvertFromMermaid = async () => {
    try {
      const { fromMermaid } = await import("@atomos-web/structura");
      const kernel = fromMermaid(mermaidText);
      setConvertedSnapshot(JSON.stringify(kernel.getSnapshot(), null, 2));
    } catch (e: any) {
      setConvertedSnapshot(`Error converting Mermaid: ${e.message}`);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 max-w-4xl">
      <header className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Mermaid.js Adapter & Exporter</h1>
        <p className="text-slate-400 text-lg">
          Bidirectional conversion between Mermaid flowchart DSL and Atomos Structura Schema Graphs.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4 bg-slate-900/60 p-6 rounded-xl border border-slate-800">
          <h2 className="text-lg font-bold text-cyan-400">1. Mermaid DSL → Structura AST</h2>
          <textarea
            value={mermaidText}
            onChange={(e) => setMermaidText(e.target.value)}
            className="w-full h-40 bg-[#020617] border border-slate-800 rounded p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleConvertFromMermaid}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded transition-all shadow-lg"
          >
            Parse to Structura Snapshot
          </button>

          {convertedSnapshot && (
            <pre className="w-full h-48 bg-[#020617] border border-slate-800 rounded p-3 text-[11px] text-slate-300 font-mono overflow-auto">
              {convertedSnapshot}
            </pre>
          )}
        </div>

        <div className="flex flex-col gap-4 bg-slate-900/60 p-6 rounded-xl border border-slate-800">
          <h2 className="text-lg font-bold text-cyan-400">2. Structura AST → Mermaid DSL</h2>
          <p className="text-xs text-slate-400">
            Exporting a sample Graph Snapshot directly into Mermaid.js format:
          </p>
          <pre className="w-full h-40 bg-[#020617] border border-slate-800 rounded p-3 text-xs text-emerald-400 font-mono overflow-auto">
            {exportedMermaid}
          </pre>
        </div>
      </section>
    </div>
  );
}
