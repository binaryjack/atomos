export interface TelemetryReport {
  entities?: {
    id: string;
    state: 'not_started' | 'in_progress' | 'info' | 'warning' | 'error' | 'success' | 'cancelled' | 'escalation' | 'skipped' | 'paused';
    color?: string;
    effect?: 'none' | 'glow' | 'pulse' | 'blink' | 'shake';
  }[];
  links?: {
    id: string;
    direction: 'source-to-target' | 'target-to-source';
  }[];
}

const STATE_COLORS: Record<string, string> = {
  not_started: 'text-gray-400',
  in_progress: 'text-blue-500',
  info: 'text-blue-400',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  success: 'text-green-500',
  cancelled: 'text-gray-600',
  escalation: 'text-orange-600',
  skipped: 'text-gray-300',
  paused: 'text-yellow-300'
};

const STATE_ICONS: Record<string, string> = {
  not_started: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>',
  in_progress: '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  info: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  warning: '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  error: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  success: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  cancelled: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="2"/>',
  escalation: '<path d="M13 10V3L4 14h7v7l9-11h-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  skipped: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  paused: '<rect x="6" y="4" width="4" height="16" fill="none" stroke="currentColor" stroke-width="2"/><rect x="14" y="4" width="4" height="16" fill="none" stroke="currentColor" stroke-width="2"/>'
};

const DEFAULT_EFFECTS: Record<string, string> = {
  in_progress: 'glow',
  error: 'shake',
  warning: 'pulse',
  escalation: 'pulse'
};

// Insert base CSS
const insertTelemetryStyles = () => {
  if (document.getElementById('structura-telemetry-styles')) return;
  const style = document.createElement('style');
  style.id = 'structura-telemetry-styles';
  style.textContent = `
    @keyframes telemetry-glow {
      0% { filter: drop-shadow(0 0 2px currentColor); }
      50% { filter: drop-shadow(0 0 12px currentColor); }
      100% { filter: drop-shadow(0 0 2px currentColor); }
    }
    @keyframes telemetry-pulse {
      0% { filter: brightness(1) drop-shadow(0 0 2px currentColor); }
      50% { filter: brightness(1.3) drop-shadow(0 0 8px currentColor); }
      100% { filter: brightness(1) drop-shadow(0 0 2px currentColor); }
    }
    @keyframes telemetry-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes telemetry-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .telemetry-effect-glow { animation: telemetry-glow 2s infinite ease-in-out; }
    .telemetry-effect-pulse { animation: telemetry-pulse 1s infinite ease-in-out; }
    .telemetry-effect-blink { animation: telemetry-blink 1s infinite ease-in-out; }
    .telemetry-effect-shake { animation: telemetry-shake 0.4s infinite ease-in-out; }
  `;
  document.head.appendChild(style);
};

export const applyTelemetry = (report: TelemetryReport) => {
  insertTelemetryStyles();

  if (report.entities) {
    report.entities.forEach(entity => {
      const el = document.querySelector(`[data-testid="structura-canvas-svg"] [data-entity-id="${entity.id}"]`);
      if (!el) return;

      const targetEl = el.querySelector('.sim-telemetry-target') || el;

      // 1. Remove old badges
      const oldBadge = el.querySelector('.sim-telemetry-badge');
      if (oldBadge) oldBadge.remove();

      // 2. Remove old effects
      targetEl.classList.remove('telemetry-effect-glow', 'telemetry-effect-pulse', 'telemetry-effect-blink', 'telemetry-effect-shake');
      (targetEl as HTMLElement).style.filter = '';

      // 3. Determine effect
      let effect = entity.effect;
      if (!effect) effect = DEFAULT_EFFECTS[entity.state] as any || 'none';
      
      // Update DOM Observability Attributes
      el.setAttribute('data-entity-state', entity.state);
      if (effect === 'none') {
        el.removeAttribute('data-entity-effect');
      } else {
        el.setAttribute('data-entity-effect', effect as string);
      }
      
      // 4. Determine color and CSS variable based color injection
      const baseClass = STATE_COLORS[entity.state] || 'text-gray-500';
      
      if (effect !== 'none') {
         targetEl.classList.add(`telemetry-effect-${effect}`);
         if (entity.color) {
            (targetEl as HTMLElement).style.color = entity.color;
         } else {
             // Fallback coloring trick if they want to use tailwind classes natively 
             // We can just rely on the badge for color or inject a currentColor to filter
             const tempColor = getComputedStyle(document.body).getPropertyValue('--' + baseClass.replace('text-', ''));
             if(tempColor) (targetEl as HTMLElement).style.color = tempColor;
         }
      }

      // 5. Add SVG badge
      const badgeSize = 24;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'sim-telemetry-badge');
      g.setAttribute('transform', `translate(-12, -12)`);
      
      const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgIcon.setAttribute('width', badgeSize.toString());
      svgIcon.setAttribute('height', badgeSize.toString());
      svgIcon.setAttribute('viewBox', '0 0 24 24');
      svgIcon.setAttribute('class', entity.color ? '' : baseClass);
      if (entity.color) svgIcon.style.color = entity.color;
      
      const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bgCircle.setAttribute('cx', '12');
      bgCircle.setAttribute('cy', '12');
      bgCircle.setAttribute('r', '11');
      bgCircle.setAttribute('fill', 'white');
      
      svgIcon.appendChild(bgCircle);
      svgIcon.innerHTML += STATE_ICONS[entity.state] || STATE_ICONS.info;
      
      g.appendChild(svgIcon);
      el.appendChild(g);
    });
  }

  if (report.links) {
    report.links.forEach(link => {
      const pathEl = document.querySelector(`[data-link-id="${link.id}"]`) as SVGPathElement;
      if (!pathEl) return;

      const parent = pathEl.parentNode;
      if (!parent) return;

      // Ensure we don't duplicate animations on the same link
      const existingDot = parent.querySelector(`.telemetry-link-dot[data-for="${link.id}"]`);
      if (existingDot) existingDot.remove();

      const pathData = pathEl.getAttribute('d');
      if (!pathData) return;

      const animatedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      animatedPath.setAttribute('d', pathData);
      animatedPath.setAttribute('class', 'telemetry-link-dot');
      animatedPath.setAttribute('data-for', link.id);
      animatedPath.setAttribute('fill', 'none');
      animatedPath.setAttribute('stroke', '#3b82f6'); // tailwind blue-500
      animatedPath.setAttribute('stroke-width', '4');
      animatedPath.setAttribute('stroke-dasharray', '8 1000');
      animatedPath.setAttribute('stroke-linecap', 'round');
      // Prevent pointer events so it doesn't block hover
      animatedPath.style.pointerEvents = 'none';
      
      // We animate the stroke-dashoffset to simulate a moving dot
      const len = pathEl.getTotalLength ? pathEl.getTotalLength() : 500;
      
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      animate.setAttribute('attributeName', 'stroke-dashoffset');
      if (link.direction === 'target-to-source') {
        animate.setAttribute('values', `-${len};0`);
      } else {
        animate.setAttribute('values', `0;-${len}`);
      }
      animate.setAttribute('dur', '1.5s');
      animate.setAttribute('repeatCount', 'indefinite');
      
      animatedPath.appendChild(animate);
      parent.appendChild(animatedPath);
    });
  }
};
