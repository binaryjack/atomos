import { describe, expect, it } from 'vitest';
import {
  auditArchitecture,
  computeGraphMetrics,
  generateDockerCompose,
  generateKubernetesManifests,
  generateOpenApiSpec,
  generateTerraformHCL,
} from '../src/index.js';

describe('SOTA Architecture Linter & Polyglot IaC Generators', () => {
  const sampleEntities = [
    {
      id: 'web-client',
      name: 'Public Web Client',
      code: 'WEB',
      createdAt: 0,
      updatedAt: 0,
      position: { x: 0, y: 0 },
      dimensions: { width: 200, height: 100 },
      properties: [],
      edges: [],
    },
    {
      id: 'core-api',
      name: 'API Gateway',
      code: 'API',
      createdAt: 0,
      updatedAt: 0,
      position: { x: 300, y: 0 },
      dimensions: { width: 200, height: 100 },
      properties: [{ key: 'port', label: 'Port', dataType: 'integer' as const, componentType: 'input' as const, value: '8080' }],
      edges: [],
    },
    {
      id: 'main-db',
      name: 'PostgreSQL Database',
      code: 'DB',
      nodeType: 'cylinder',
      createdAt: 0,
      updatedAt: 0,
      position: { x: 600, y: 0 },
      dimensions: { width: 200, height: 100 },
      properties: [{ key: 'username', label: 'Username', dataType: 'string' as const, componentType: 'input' as const }],
      edges: [],
    },
  ];

  const safeLinks = [
    { id: 'l1', leftEntityId: 'web-client', rightEntityId: 'core-api', leftAnchorId: 'a1', rightAnchorId: 'a2', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
    { id: 'l2', leftEntityId: 'core-api', rightEntityId: 'main-db', leftAnchorId: 'a3', rightAnchorId: 'a4', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
  ];

  const insecureLinks = [
    { id: 'l1', leftEntityId: 'web-client', rightEntityId: 'main-db', leftAnchorId: 'a1', rightAnchorId: 'a2', leftCardinality: '1' as const, rightCardinality: '1' as const, renderType: 'bezier' as const },
  ];

  it('audits safe architecture with high score', () => {
    const audit = auditArchitecture(sampleEntities, safeLinks);
    expect(audit.passed).toBe(true);
    expect(audit.score).toBeGreaterThanOrEqual(90);
    expect(audit.violations.filter(v => v.severity === 'critical')).toHaveLength(0);
  });

  it('detects direct internet-to-database security violation', () => {
    const audit = auditArchitecture(sampleEntities, insecureLinks);
    expect(audit.passed).toBe(false);
    expect(audit.violations.some(v => v.ruleId === 'SEC-001-UNPROTECTED-DATABASE')).toBe(true);
  });

  it('computes accurate graph metrics & degree centrality hubs', () => {
    const metrics = computeGraphMetrics(sampleEntities, safeLinks);
    expect(metrics.nodeCount).toBe(3);
    expect(metrics.edgeCount).toBe(2);
    expect(metrics.hubs.length).toBeGreaterThan(0);
    expect(metrics.connectedComponentsCount).toBe(1);
  });

  it('generates Terraform HCL correctly', () => {
    const hcl = generateTerraformHCL(sampleEntities, safeLinks);
    expect(hcl).toContain('provider "aws"');
    expect(hcl).toContain('aws_db_instance');
    expect(hcl).toContain('aws_instance');
  });

  it('generates Kubernetes & Docker Compose manifests correctly', () => {
    const k8s = generateKubernetesManifests(sampleEntities, safeLinks);
    expect(k8s).toContain('kind: Deployment');
    expect(k8s).toContain('kind: Service');

    const compose = generateDockerCompose(sampleEntities, safeLinks);
    expect(compose).toContain('version: \'3.8\'');
    expect(compose).toContain('services:');
  });

  it('generates OpenAPI 3.1 JSON specification correctly', () => {
    const openapi = generateOpenApiSpec(sampleEntities, safeLinks);
    const parsed = JSON.parse(openapi);
    expect(parsed.openapi).toBe('3.1.0');
    expect(parsed.paths).toHaveProperty('/api-gateway');
  });
});
