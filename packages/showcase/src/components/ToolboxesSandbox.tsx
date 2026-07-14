"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const StructuraCanvas = dynamic(() => import("./StructuraCanvas"), { ssr: false });

type DomainConfig = {
  id: string;
  name: string;
  toolbox: any;
};

const DOMAINS: DomainConfig[] = [
  {
    id: "uml",
    name: "UML Design",
    toolbox: {
      toolsets: [
        {
          name: 'Class Diagram',
          icon: '<rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />',
          tools: [
            { id: "uml-class", name: "Class", shape: "box", baseColor: "#1c3557", icon: '<rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="16" x2="21" y2="16" />', description: "UML Class", properties: [] },
            { id: "uml-interface", name: "Interface", shape: "circle", baseColor: "#105e46", icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>', description: "UML Interface", properties: [] },
            { id: "uml-actor", name: "Actor", shape: "actor", baseColor: "#331a5c", icon: '<circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 21v-2a7 7 0 0 1 14 0v2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="5" y1="13" x2="19" y2="13" stroke="currentColor" stroke-width="2"/>', description: "UML Actor", properties: [] },
            { id: "uml-usecase", name: "Use Case", shape: "ellipse", baseColor: "#451a03", icon: '<ellipse cx="12" cy="12" rx="10" ry="6" fill="none" stroke="currentColor" stroke-width="2"/>', description: "UML Use Case", properties: [] }
          ]
        }
      ]
    }
  },
  {
    id: "database",
    name: "Database Schema",
    toolbox: {
      toolsets: [
        {
          name: 'Data Models',
          icon: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v10c0 1.66 3.58 3 8 3s8-1.34 8-3V7"/>',
          tools: [
            { id: "db-table", name: "Table", shape: "cylinder", baseColor: "#103b35", icon: '<path d="M3 3h18v18H3z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="9" y2="21" stroke="currentColor" stroke-width="2"/>', description: "Relational Table", properties: [] },
            { id: "db-view", name: "View", shape: "cylinder", baseColor: "#0f172a", icon: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>', description: "Virtual View", properties: [] },
            { id: "merise-assoc", name: "Association", shape: "diamond", baseColor: "#252060", icon: '<polygon points="12 3 21 12 12 21 3 12" fill="none" stroke="currentColor" stroke-width="2"/>', description: "N:N Association", properties: [] }
          ]
        }
      ]
    }
  },
  {
    id: "workflow",
    name: "Workflow & BPMN",
    toolbox: {
      toolsets: [
        {
          name: 'Process Flow',
          icon: '<rect x="3" y="6" width="18" height="12" rx="2" />',
          tools: [
            { id: "wf-start", name: "Start", shape: "ellipse", baseColor: "#052e16", icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>', description: "Start Event", properties: [] },
            { id: "wf-task", name: "Task", shape: "box", baseColor: "#1c3557", icon: '<rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>', description: "Process Task", properties: [] },
            { id: "wf-gateway", name: "Gateway", shape: "diamond", baseColor: "#450a0a", icon: '<polygon points="12 3 21 12 12 21 3 12" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/>', description: "Exclusive Gateway", properties: [] },
            { id: "wf-end", name: "End", shape: "ellipse", baseColor: "#3f3f46", icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/>', description: "End Event", properties: [] }
          ]
        }
      ]
    }
  },
  {
    id: "statemachine",
    name: "State Machine",
    toolbox: {
      toolsets: [
        {
          name: 'States',
          icon: '<rect x="4" y="6" width="16" height="12" rx="6" />',
          tools: [
            { id: "sm-state", name: "State", shape: "box", baseColor: "#1d4ed8", icon: '<rect x="4" y="6" width="16" height="12" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>', description: "Machine State", properties: [] },
            { id: "sm-choice", name: "Choice", shape: "diamond", baseColor: "#b45309", icon: '<polygon points="12 4 20 12 12 20 4 12" fill="none" stroke="currentColor" stroke-width="2"/>', description: "Choice Pseudo-state", properties: [] },
            { id: "sm-fork", name: "Fork/Join", shape: "cylinder", baseColor: "#1e293b", icon: '<rect x="2" y="10" width="20" height="4" fill="currentColor"/>', description: "Concurrency", properties: [] }
          ]
        }
      ]
    }
  }
];

export function ToolboxesSandbox() {
  const [activeDomain, setActiveDomain] = useState<DomainConfig>(DOMAINS[0]!);

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-4 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-xl shadow-2xl w-64">
        <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Select Domain</label>
        <select 
          className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-amber-500 transition-colors"
          value={activeDomain.id}
          onChange={(e) => {
            const domain = DOMAINS.find(d => d.id === e.target.value);
            if (domain) setActiveDomain(domain);
          }}
        >
          {DOMAINS.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-2">
          The palette on the left will instantly re-render with tools tailored specifically for the selected domain.
        </p>
      </div>

      <div className="flex-1 relative w-full h-full bg-slate-950">
        {/* We use key to force a full re-initialization of the kernel & canvas when domain changes */}
        <StructuraCanvas 
          key={`sandbox-${activeDomain.id}`}
          preset="blank" 
          toolbox={activeDomain.toolbox}
        />
      </div>
    </div>
  );
}
