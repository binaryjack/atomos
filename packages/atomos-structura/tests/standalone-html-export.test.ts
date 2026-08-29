import { describe, expect, it } from 'vitest';
import { generateStandaloneHtml } from '../src/features/export/create-standalone-html-exporter.js';
import type { DAGExchange } from '../src/core/application/dag-service.js';

describe('Standalone HTML Exporter', () => {
  it('generates valid self-contained HTML with embedded DAG schema', () => {
    const dummySchema: DAGExchange = {
      type: 'DAGExchange',
      version: '1.0.0',
      nodes: [{ id: 'node-1', name: 'Web Server', x: 0, y: 0, collapsed: false, properties: [] }],
      edges: [],
    };

    const html = generateStandaloneHtml({ title: 'Test System Architecture', schema: dummySchema });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<atomos-structura-viewer');
    expect(html).toContain('Web Server');
    expect(html).toContain('Test System Architecture');
  });
});
