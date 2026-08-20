import type { Entity } from '../types/entity.types.js';
import type { LinkProps } from '../types/link.types.js';
import { findCycles } from './cycle-detector.js';

export interface ArchitectureViolation {
  readonly ruleId: string;
  readonly severity: 'critical' | 'warning' | 'info';
  readonly entityIds: readonly string[];
  readonly message: string;
  readonly suggestedFix: string;
}

export interface ArchitectureAuditResult {
  readonly score: number; // 0 to 100
  readonly passed: boolean;
  readonly violations: readonly ArchitectureViolation[];
  readonly metrics: {
    readonly totalEntities: number;
    readonly totalLinks: number;
    readonly criticalCount: number;
    readonly warningCount: number;
  };
}

/**
 * Headless topological and architectural rule linter.
 */
export const auditArchitecture = (
  entities: readonly Entity[],
  links: readonly LinkProps[]
): ArchitectureAuditResult => {
  const violations: ArchitectureViolation[] = [];
  const entityMap = new Map<string, Entity>(entities.map(e => [e.id, e]));

  // Adjacency and degrees
  const inDegree = new Map<string, number>(entities.map(e => [e.id, 0]));
  const outDegree = new Map<string, number>(entities.map(e => [e.id, 0]));

  links.forEach(l => {
    inDegree.set(l.rightEntityId, (inDegree.get(l.rightEntityId) ?? 0) + 1);
    outDegree.set(l.leftEntityId, (outDegree.get(l.leftEntityId) ?? 0) + 1);
  });

  // 1. Rule: No Direct Internet to Database (Security Violation)
  const isPublicNode = (name: string) => /internet|public|web|client|browser/i.test(name);
  const isDatabaseNode = (name: string, shape?: string) =>
    shape === 'cylinder' || /db|database|postgres|mysql|mongo|redis|aurora|sql/i.test(name);

  links.forEach(l => {
    const src = entityMap.get(l.leftEntityId);
    const dst = entityMap.get(l.rightEntityId);
    if (!src || !dst) return;

    if (isPublicNode(src.name) && isDatabaseNode(dst.name, src.nodeType)) {
      violations.push({
        ruleId: 'SEC-001-UNPROTECTED-DATABASE',
        severity: 'critical',
        entityIds: [src.id, dst.id],
        message: `Public node '${src.name}' is directly connected to database '${dst.name}' without WAF, API Gateway, or backend service.`,
        suggestedFix: `Route traffic through an API Gateway or Backend service with authentication guards.`,
      });
    }
  });

  // 2. Rule: Single Point of Failure (SPOF Reliability Violation)
  entities.forEach(e => {
    const inDeg = inDegree.get(e.id) ?? 0;
    const isGatewayOrBus = /gateway|bus|broker|router/i.test(e.name);
    // If a standard service has high in-degree without clustering or redundancy
    if (inDeg >= 4 && !isGatewayOrBus && e.nodeType !== 'zone') {
      violations.push({
        ruleId: 'REL-002-SPOF-BOTTLENECK',
        severity: 'warning',
        entityIds: [e.id],
        message: `Entity '${e.name}' has high dependency coupling (${inDeg} incoming connections) and may constitute a Single Point of Failure.`,
        suggestedFix: `Consider introducing a load balancer or message queue in front of '${e.name}'.`,
      });
    }
  });

  // 3. Rule: Circular Dependencies (Architecture Cycle Violation)
  const cycleResult = findCycles(entities, links);
  if (cycleResult.hasCycles) {
    cycleResult.cycles.forEach((cycle, idx) => {
      const names = cycle.map(id => entityMap.get(id)?.name ?? id).join(' → ');
      violations.push({
        ruleId: `ARCH-003-CIRCULAR-DEPENDENCY-${idx + 1}`,
        severity: 'critical',
        entityIds: cycle,
        message: `Circular dependency detected: ${names}`,
        suggestedFix: `Decouple cyclic components using event-driven communication or dependency inversion.`,
      });
    });
  }

  // 4. Rule: Orphaned Isolated Nodes
  entities.forEach(e => {
    const inDeg = inDegree.get(e.id) ?? 0;
    const outDeg = outDegree.get(e.id) ?? 0;
    if (inDeg === 0 && outDeg === 0 && e.nodeType !== 'zone' && e.nodeType !== 'sticky-note') {
      violations.push({
        ruleId: 'ARCH-004-ORPHAN-NODE',
        severity: 'info',
        entityIds: [e.id],
        message: `Entity '${e.name}' is completely disconnected from the rest of the architecture.`,
        suggestedFix: `Connect '${e.name}' to relevant upstream or downstream components, or remove it if unused.`,
      });
    }
  });

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  // Calculate score (100 base, -25 per critical, -10 per warning, -2 per info)
  let score = 100 - (criticalCount * 25) - (warningCount * 10) - (violations.length - criticalCount - warningCount) * 2;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: criticalCount === 0,
    violations,
    metrics: {
      totalEntities: entities.length,
      totalLinks: links.length,
      criticalCount,
      warningCount,
    },
  };
};
