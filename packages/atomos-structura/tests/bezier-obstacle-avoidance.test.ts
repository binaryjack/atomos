import { describe, expect, it } from 'vitest';
import { bezierPath, getBezierControlPoints } from '../src/core/bezier.js';

describe('Bézier Multi-Obstacle Collision Avoidance', () => {
  it('routes around multiple collinear intermediate obstacles with guaranteed clearance', () => {
    // Endpoints: Node A at (100, 100), Node D at (800, 100)
    const src = { x: 100, y: 100 };
    const dst = { x: 800, y: 100 };
    const srcRect = { x: 0, y: 50, width: 100, height: 100 };
    const dstRect = { x: 800, y: 50, width: 100, height: 100 };

    // Intermediate collinear obstacles in a row: B and C
    const obstacleB = { x: 250, y: 50, width: 120, height: 100 }; // y range: 50..150
    const obstacleC = { x: 450, y: 50, width: 120, height: 100 }; // y range: 50..150
    const obstacles = [obstacleB, obstacleC];

    const { cp1, cp2 } = getBezierControlPoints(
      src,
      'right',
      dst,
      'left',
      srcRect,
      dstRect,
      undefined,
      obstacles
    );

    // Control points should be elevated above the top of the obstacles (y <= 50 - 40 = 10)
    expect(cp1.y).toBeLessThanOrEqual(10);
    expect(cp2.y).toBeLessThanOrEqual(10);

    // Verify sampled curve B(t) at 20 steps
    for (let i = 1; i <= 20; i++) {
      const t = i / 21;
      const mt = 1 - t;
      const x = mt * mt * mt * src.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * dst.x;
      const y = mt * mt * mt * src.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * dst.y;

      // When within horizontal bounds of obstacle B or C, the curve must clear the obstacle
      if (x >= obstacleB.x && x <= obstacleB.x + obstacleB.width) {
        expect(y).toBeLessThan(obstacleB.y); // safely above obstacle B
      }
      if (x >= obstacleC.x && x <= obstacleC.x + obstacleC.width) {
        expect(y).toBeLessThan(obstacleC.y); // safely above obstacle C
      }
    }

    const pathString = bezierPath(src, 'right', dst, 'left', srcRect, dstRect, obstacles);
    expect(pathString).toMatch(/^M 100 100 C/);
  });

  it('routes predominantly vertical links horizontally around intermediate obstacles', () => {
    // Endpoints: Top to Bottom
    const src = { x: 200, y: 50 };
    const dst = { x: 200, y: 700 };
    const srcRect = { x: 150, y: 0, width: 100, height: 50 };
    const dstRect = { x: 150, y: 700, width: 100, height: 50 };

    // Obstacle blocking vertical line at (150, 300, 100, 100) -> x: 150..250
    const obstacle = { x: 150, y: 300, width: 100, height: 100 };

    const { cp1, cp2 } = getBezierControlPoints(
      src,
      'bottom',
      dst,
      'top',
      srcRect,
      dstRect,
      undefined,
      [obstacle]
    );

    // Detour should be horizontal (either clearly to the left < 150 or to the right > 250)
    const routedLeft = cp1.x < 150 && cp2.x < 150;
    const routedRight = cp1.x > 250 && cp2.x > 250;
    expect(routedLeft || routedRight).toBe(true);
  });
});
