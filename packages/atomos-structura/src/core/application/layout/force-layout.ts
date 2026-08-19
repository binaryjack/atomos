import type { EntityManager } from '../../presentation/entity-manager.js';
import { type LayoutOptions, type LayoutStrategy, LayoutRegistry } from './layout-strategy.js';

export class ForceLayout implements LayoutStrategy {
  readonly name = 'force';

  execute(entityManager: EntityManager, options?: LayoutOptions): void {
    const nodes = entityManager.getAllEntities();
    const edges = entityManager.getAllLinks();
    if (nodes.length === 0) return;

    const iterations = options?.iterations ?? 100;
    const k = options?.k ?? 250; // ideal spring length
    const repulsiveForceConstant = k * k;

    // Initialize positions
    const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    nodes.forEach((node, i) => {
      pos.set(node.id, {
        x: node.position.x || (i % 5) * 200 + 100,
        y: node.position.y || Math.floor(i / 5) * 200 + 100,
        vx: 0,
        vy: 0,
      });
    });

    for (let iter = 0; iter < iterations; iter++) {
      const temperature = (1 - iter / iterations) * 20;

      // 1. Repulsive forces between all node pairs
      for (let i = 0; i < nodes.length; i++) {
        const u = nodes[i]!;
        const pu = pos.get(u.id)!;

        for (let j = i + 1; j < nodes.length; j++) {
          const v = nodes[j]!;
          const pv = pos.get(v.id)!;

          let dx = pu.x - pv.x;
          let dy = pu.y - pv.y;
          let dist = Math.hypot(dx, dy);
          if (dist === 0) {
            dx = (Math.random() - 0.5) * 10;
            dy = (Math.random() - 0.5) * 10;
            dist = Math.hypot(dx, dy);
          }

          const force = repulsiveForceConstant / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          pu.vx += fx;
          pu.vy += fy;
          pv.vx -= fx;
          pv.vy -= fy;
        }
      }

      // 2. Attractive forces along edges
      edges.forEach(edge => {
        const pu = pos.get(edge.sourceEntityId);
        const pv = pos.get(edge.targetEntityId);
        if (!pu || !pv) return;

        let dx = pv.x - pu.x;
        let dy = pv.y - pu.y;
        let dist = Math.hypot(dx, dy);
        if (dist === 0) {
          dx = 1;
          dist = 1;
        }

        const force = (dist * dist) / k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        pu.vx += fx;
        pu.vy += fy;
        pv.vx -= fx;
        pv.vy -= fy;
      });

      // 3. Update positions with cooling temperature
      nodes.forEach(node => {
        const p = pos.get(node.id)!;
        const vLen = Math.hypot(p.vx, p.vy);
        if (vLen > 0) {
          const step = Math.min(vLen, temperature);
          p.x += (p.vx / vLen) * step;
          p.y += (p.vy / vLen) * step;
        }
        p.vx = 0;
        p.vy = 0;
      });
    }

    // Apply normalized positive coordinates
    let minX = Infinity;
    let minY = Infinity;
    nodes.forEach(node => {
      const p = pos.get(node.id)!;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
    });

    const PADDING = 80;
    nodes.forEach(node => {
      const p = pos.get(node.id)!;
      entityManager.moveEntity(node.id, {
        x: Math.round(p.x - minX + PADDING),
        y: Math.round(p.y - minY + PADDING),
      });
    });
  }
}

// Auto-register
LayoutRegistry.register(new ForceLayout());
