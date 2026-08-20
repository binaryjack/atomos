"use client";

import React, { useEffect, useRef, useState } from "react";
import StructuraCanvas from "./StructuraCanvas";

export interface TraceSpan {
  readonly spanId: string;
  readonly entityId: string;
  readonly operation: string;
  readonly durationMs: number;
  readonly status: "ok" | "error" | "warning";
  readonly linkId?: string;
  readonly logs?: string;
}

export interface TraceScenario {
  readonly name: string;
  readonly preset: string;
  readonly traceId: string;
  readonly spans: readonly TraceSpan[];
}

const TRACE_SCENARIOS: readonly TraceScenario[] = [
  {
    name: "E-Commerce Checkout Flow (HTTP 200)",
    preset: "cqrs",
    traceId: "trace-98f3b-01",
    spans: [
      { spanId: "s1", entityId: "cqrs-client", operation: "POST /checkout", durationMs: 15, status: "ok", logs: "Client submitted payment form" },
      { spanId: "s2", entityId: "cqrs-command", operation: "ProcessPaymentCommand", durationMs: 45, status: "ok", logs: "Validating cart items & idempotency key" },
      { spanId: "s3", entityId: "cqrs-write-db", operation: "INSERT INTO orders", durationMs: 65, status: "ok", logs: "Committed transaction in DB" },
      { spanId: "s4", entityId: "cqrs-bus", operation: "PUBLISH OrderCreatedEvent", durationMs: 20, status: "ok", logs: "Event emitted to Kafka topic 'orders'" },
      { spanId: "s5", entityId: "cqrs-read-db", operation: "SyncOrderReadProjection", durationMs: 50, status: "ok", logs: "Read model updated successfully" },
      { spanId: "s6", entityId: "cqrs-query", operation: "GET /orders/{id}/status", durationMs: 12, status: "ok", logs: "Order status queried: PAID" },
    ],
  },
  {
    name: "Auth Pipeline with Token Expired (HTTP 401)",
    preset: "security-schema",
    traceId: "trace-auth-err-02",
    spans: [
      { spanId: "s1", entityId: "sec-internet", operation: "GET /api/v1/profile", durationMs: 10, status: "ok", logs: "Incoming request from 198.51.100.4" },
      { spanId: "s2", entityId: "sec-waf", operation: "InspectHeaders", durationMs: 25, status: "ok", logs: "WAF passed: No SQLi or XSS patterns" },
      { spanId: "s3", entityId: "sec-api", operation: "RouteToAuthGateway", durationMs: 18, status: "ok", logs: "Forwarding Bearer token" },
      { spanId: "s4", entityId: "sec-auth", operation: "VerifyJWT", durationMs: 85, status: "error", logs: "JWT Expired: exp claim 1787109000 < current time" },
    ],
  },
];

export function TimeTravelDebugger() {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 0.5, 1, 2

  const scenario = TRACE_SCENARIOS[selectedScenarioIdx]!;
  const spans = scenario.spans;

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Apply visual telemetry state to nodes on canvas based on currentStep
  useEffect(() => {
    const activeSpan = spans[currentStep];
    spans.forEach((span, idx) => {
      const el = document.querySelector(`[data-entity-id="${span.entityId}"]`) as HTMLElement | null;
      if (!el) return;

      if (idx === currentStep) {
        // Active node
        const glowColor = span.status === "error" ? "#ef4444" : "#10b981";
        el.style.transition = "filter 0.3s, transform 0.2s";
        el.style.filter = `drop-shadow(0 0 18px ${glowColor})`;
        el.style.transform = "scale(1.02)";
      } else if (idx < currentStep) {
        // Completed node
        const color = span.status === "error" ? "#ef4444" : "#10b981";
        el.style.filter = `drop-shadow(0 0 8px ${color}88)`;
        el.style.transform = "scale(1)";
      } else {
        // Pending node
        el.style.filter = "";
        el.style.transform = "scale(1)";
      }
    });
  }, [currentStep, spans, selectedScenarioIdx]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = Math.max(200, 1200 / speed);
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= spans.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, speed, spans.length]);

  return (
    <div className="flex flex-col h-[750px] w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header & Scenario Switcher */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Distributed Tracing & Time-Travel Player
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
            OTel / Jaeger Compatible
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Trace Scenario:</label>
          <select
            value={selectedScenarioIdx}
            onChange={(e) => {
              setSelectedScenarioIdx(Number(e.target.value));
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-emerald-500 font-medium"
          >
            {TRACE_SCENARIOS.map((sc, i) => (
              <option key={i} value={i}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Visual Structura Canvas */}
        <div className="w-2/3 h-full relative border-r border-slate-800">
          <StructuraCanvas key={scenario.preset} preset={scenario.preset} />
        </div>

        {/* Right Side: Step-by-Step Span Timeline & Logs */}
        <div className="w-1/3 h-full flex flex-col bg-slate-900/70 p-4 gap-4 overflow-y-auto">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Trace Details</span>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-bold">{scenario.traceId}</span>
              <span className="text-xs text-slate-400">
                {spans.reduce((acc, s) => acc + s.durationMs, 0)}ms total
              </span>
            </div>
          </div>

          {/* Span Step List */}
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
            {spans.map((s, idx) => {
              const isCurrent = idx === currentStep;
              const isDone = idx < currentStep;
              return (
                <div
                  key={s.spanId}
                  onClick={() => setCurrentStep(idx)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isCurrent
                      ? "bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                      : isDone
                      ? "bg-slate-900/60 border-slate-700/60 opacity-80"
                      : "bg-slate-950/40 border-slate-800/40 opacity-40 hover:opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200">
                      {idx + 1}. {s.operation}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        s.status === "error"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {s.durationMs}ms
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">{s.logs}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Timeline Controls */}
      <div className="h-16 border-t border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else {
                if (currentStep >= spans.length - 1) setCurrentStep(0);
                setIsPlaying(true);
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            }`}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play Trace"}
          </button>

          <button
            onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
            disabled={currentStep === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition"
          >
            ⏮ Step Back
          </button>

          <button
            onClick={() => setCurrentStep((p) => Math.min(spans.length - 1, p + 1))}
            disabled={currentStep === spans.length - 1}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition"
          >
            ⏭ Step Forward
          </button>

          <div className="flex items-center gap-1 ml-4 border-l border-slate-800 pl-4">
            {[0.5, 1, 2].map((sVal) => (
              <button
                key={sVal}
                onClick={() => setSpeed(sVal)}
                className={`px-2 py-1 rounded text-[10px] font-bold ${
                  speed === sVal
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {sVal}x
              </button>
            ))}
          </div>
        </div>

        {/* Scrubber Slider */}
        <div className="flex items-center gap-3 w-1/3">
          <span className="text-xs text-slate-400 font-mono">
            Step {currentStep + 1} / {spans.length}
          </span>
          <input
            type="range"
            min={0}
            max={spans.length - 1}
            value={currentStep}
            onChange={(e) => setCurrentStep(Number(e.target.value))}
            className="flex-1 accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
