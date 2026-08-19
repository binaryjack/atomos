"use client";

import { useEffect, useState } from "react";
import StructuraCanvas from "./StructuraCanvas";
import { createPrismaAdapter, createSqlAdapter, createSchemaGraphKernel, toMermaid } from "@atomos-web/structura";

interface LiveCodePlaygroundProps {
  readonly initialPreset?: string;
}

export default function LiveCodePlayground({ initialPreset = "database" }: LiveCodePlaygroundProps) {
  const [activeFormat, setActiveFormat] = useState<"prisma" | "sql" | "typescript" | "mermaid">("prisma");
  const [activePreset, setActivePreset] = useState<string>(initialPreset);
  const [codeOutput, setCodeOutput] = useState<string>("// Drag, drop, or edit entities on the left canvas to see live generated code here.");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    // Poll or hook into window.__kernel to update generated code in real time
    const interval = setInterval(() => {
      const win = window as unknown as { __kernel?: { getSnapshot: () => any } };
      if (win.__kernel) {
        try {
          const snapshot = win.__kernel.getSnapshot();
          if (activeFormat === "prisma") {
            const adapter = createPrismaAdapter(win.__kernel as any);
            setCodeOutput(adapter.generatePrismaSchema());
          } else if (activeFormat === "sql") {
            const adapter = createSqlAdapter(win.__kernel as any);
            setCodeOutput(adapter.generateDDL());
          } else if (activeFormat === "mermaid") {
            setCodeOutput(toMermaid(snapshot));
          } else if (activeFormat === "typescript") {
            let ts = "// Auto-generated TypeScript Definitions\n\n";
            Object.values(snapshot.entities || {}).forEach((ent: any) => {
              ts += `export interface ${ent.name} {\n`;
              ts += `  id: string;\n`;
              (ent.properties || []).forEach((prop: any) => {
                const opt = prop.validation?.required ? "" : "?";
                const typeStr = prop.dataType === "integer" || prop.dataType === "float" ? "number" : prop.dataType === "boolean" ? "boolean" : prop.dataType === "date" ? "Date" : "string";
                ts += `  ${prop.key}${opt}: ${typeStr};\n`;
              });
              ts += `}\n\n`;
            });
            setCodeOutput(ts);
          }
        } catch (e) {
          // Keep previous output if parsing error
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeFormat, activePreset]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap = { prisma: "prisma", sql: "sql", typescript: "ts", mermaid: "mmd" };
    const blob = new Blob([codeOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schema.${extMap[activeFormat]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header Controls */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            ⚡ Live Code Generation Playground
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
            Bidirectional AST
          </span>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Architecture Preset:</label>
          <select
            value={activePreset}
            onChange={(e) => setActivePreset(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="database">PostgreSQL Database</option>
            <option value="mvc">MVC Architecture</option>
            <option value="cqrs">CQRS Pattern</option>
            <option value="security-schema">Security Architecture</option>
          </select>
        </div>
      </header>

      {/* Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Visual Structura Canvas */}
        <div className="w-1/2 h-full relative border-r border-slate-800">
          <StructuraCanvas key={activePreset} preset={activePreset} />
        </div>

        {/* Right Side: Live Generated Code */}
        <div className="w-1/2 h-full flex flex-col bg-slate-900/60">
          {/* Format Tabs & Action Buttons */}
          <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-slate-900">
            <div className="flex items-center gap-1">
              {(["prisma", "sql", "typescript", "mermaid"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setActiveFormat(fmt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                    activeFormat === fmt
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {fmt === "sql" ? "PostgreSQL DDL" : fmt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition"
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition"
              >
                ⬇ Download
              </button>
            </div>
          </div>

          {/* Syntax Code View */}
          <div className="flex-1 p-4 overflow-auto font-mono text-xs text-blue-200/90 leading-relaxed bg-[#0b101b]">
            <pre className="whitespace-pre-wrap">{codeOutput}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
