"use client";

import { useEffect, useState } from "react";
import StructuraCanvas from "./StructuraCanvas";
import {
  createPrismaAdapter,
  createSqlAdapter,
  toMermaid,
} from "@atomos-web/structura";
import {
  generateDockerCompose,
  generateKubernetesManifests,
  generateOpenApiSpec,
  generateTerraformHCL,
} from "@atomos-web/structura-core";

interface LiveCodePlaygroundProps {
  readonly initialPreset?: string;
}

export default function LiveCodePlayground({ initialPreset = "database" }: LiveCodePlaygroundProps) {
  const [activeFormat, setActiveFormat] = useState<
    "prisma" | "sql" | "typescript" | "mermaid" | "terraform" | "kubernetes" | "docker" | "openapi"
  >("prisma");
  const [activePreset, setActivePreset] = useState<string>(initialPreset);
  const [codeOutput, setCodeOutput] = useState<string>(
    "// Drag, drop, or edit entities on the left canvas to see live generated code here."
  );
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    // Poll window.__kernel to update generated code in real time
    const interval = setInterval(() => {
      const win = window as unknown as { __kernel?: { getSnapshot: () => any } };
      if (win.__kernel) {
        try {
          const snapshot = win.__kernel.getSnapshot();
          const entities = Object.values(snapshot.entities || {});
          const links = Object.values(snapshot.links || {});

          if (activeFormat === "prisma") {
            const adapter = createPrismaAdapter(win.__kernel as any);
            setCodeOutput(adapter.generatePrismaSchema());
          } else if (activeFormat === "sql") {
            const adapter = createSqlAdapter(win.__kernel as any);
            setCodeOutput(adapter.generateDDL());
          } else if (activeFormat === "mermaid") {
            setCodeOutput(toMermaid(snapshot));
          } else if (activeFormat === "terraform") {
            setCodeOutput(generateTerraformHCL(entities as any, links as any));
          } else if (activeFormat === "kubernetes") {
            setCodeOutput(generateKubernetesManifests(entities as any, links as any));
          } else if (activeFormat === "docker") {
            setCodeOutput(generateDockerCompose(entities as any, links as any));
          } else if (activeFormat === "openapi") {
            setCodeOutput(generateOpenApiSpec(entities as any, links as any));
          } else if (activeFormat === "typescript") {
            let ts = "// Auto-generated TypeScript Definitions\n\n";
            entities.forEach((ent: any) => {
              ts += `export interface ${ent.name} {\n`;
              ts += `  id: string;\n`;
              (ent.properties || []).forEach((prop: any) => {
                const opt = prop.validation?.required ? "" : "?";
                const typeStr =
                  prop.dataType === "integer" || prop.dataType === "float"
                    ? "number"
                    : prop.dataType === "boolean"
                    ? "boolean"
                    : prop.dataType === "date"
                    ? "Date"
                    : "string";
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
    }, 400);

    return () => clearInterval(interval);
  }, [activeFormat, activePreset]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extMap = {
      prisma: "prisma",
      sql: "sql",
      typescript: "ts",
      mermaid: "mmd",
      terraform: "tf",
      kubernetes: "yaml",
      docker: "yml",
      openapi: "json",
    };
    const blob = new Blob([codeOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schema.${extMap[activeFormat]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full bg-[#08090c] text-neutral-200 overflow-hidden font-sans">
      {/* Top Header Controls */}
      <header className="h-12 border-b border-white/[0.045] bg-[#0c0e14] px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-semibold text-xs tracking-wider text-neutral-100 font-mono">
              POLYGLOT ARCHITECTURE PLAYGROUND
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-neutral-400 font-mono">
            Bidirectional AST
          </span>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2.5">
          <label className="text-[11px] font-mono text-neutral-400">Architecture Preset:</label>
          <select
            value={activePreset}
            onChange={(e) => setActivePreset(e.target.value)}
            className="bg-[#0e1017] border border-white/[0.08] text-xs rounded px-3 py-1.5 text-neutral-200 outline-none focus:border-white/20 font-medium cursor-pointer transition-colors"
          >
            <option value="database" className="bg-[#0e1017] text-neutral-200 py-1">PostgreSQL Database</option>
            <option value="mvc" className="bg-[#0e1017] text-neutral-200 py-1">MVC Architecture</option>
            <option value="cqrs" className="bg-[#0e1017] text-neutral-200 py-1">CQRS Pattern</option>
            <option value="security-schema" className="bg-[#0e1017] text-neutral-200 py-1">Security Architecture</option>
            <option value="massive" className="bg-[#0e1017] text-neutral-200 py-1">Microservices Cloud</option>
          </select>
        </div>
      </header>

      {/* Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Visual Structura Canvas */}
        <div className="w-1/2 h-full relative border-r border-white/[0.045]">
          <StructuraCanvas key={activePreset} preset={activePreset} />
        </div>

        {/* Right Side: Live Generated Code */}
        <div className="w-1/2 h-full flex flex-col bg-[#0a0c12]">
          {/* Format Tabs & Action Buttons */}
          <div className="h-11 border-b border-white/[0.045] px-4 flex items-center justify-between shrink-0 bg-[#0c0e14] overflow-x-auto gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  "prisma",
                  "sql",
                  "typescript",
                  "mermaid",
                  "terraform",
                  "kubernetes",
                  "docker",
                  "openapi",
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setActiveFormat(fmt)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium tracking-wide transition-colors shrink-0 ${
                    activeFormat === fmt
                      ? "bg-white/[0.08] text-white border border-white/[0.1]"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]"
                  }`}
                >
                  {fmt === "sql"
                    ? "Postgres"
                    : fmt === "terraform"
                    ? "Terraform"
                    : fmt === "kubernetes"
                    ? "K8s"
                    : fmt === "docker"
                    ? "Compose"
                    : fmt === "openapi"
                    ? "OpenAPI"
                    : fmt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 text-xs font-mono text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08] rounded border border-white/[0.06] transition-colors"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="px-2.5 py-1 text-xs font-mono text-[#09090b] bg-emerald-400 hover:bg-emerald-300 font-semibold rounded border border-emerald-300/40 transition-colors"
              >
                Download
              </button>
            </div>
          </div>

          {/* Syntax Code View */}
          <div className="flex-1 p-5 overflow-auto font-mono text-xs text-neutral-300 leading-relaxed bg-[#08090c]">
            <pre className="whitespace-pre-wrap">{codeOutput}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
