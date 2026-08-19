import type { Signal } from '@atomos-web/prime';
import { createSignal } from '@atomos-web/prime';
import type { BoundaryType, ZoneEntity } from '@atomos-web/structura-core';

export interface ZoneBoundaryProps {
  readonly zone: ZoneEntity;
  readonly isReadonly?: boolean;
  readonly onNameChange?: (name: string) => void;
  readonly onDelete?: () => void;
}

export interface ZoneBoundaryResult {
  readonly rootElement: SVGGElement;
  readonly updateSize: (width: number, height: number) => void;
  readonly updatePosition: (x: number, y: number) => void;
  readonly cleanup: { destroy: () => void };
}

const BOUNDARY_COLORS: Record<BoundaryType, { border: string; bg: string; pillBg: string; text: string }> = {
  vpc: {
    border: 'rgba(59, 130, 246, 0.6)',
    bg: 'rgba(59, 130, 246, 0.05)',
    pillBg: '#1e40af',
    text: '#93c5fd',
  },
  cluster: {
    border: 'rgba(168, 85, 247, 0.6)',
    bg: 'rgba(168, 85, 247, 0.05)',
    pillBg: '#6b21a8',
    text: '#d8b4fe',
  },
  subnet: {
    border: 'rgba(16, 185, 129, 0.6)',
    bg: 'rgba(16, 185, 129, 0.05)',
    pillBg: '#065f46',
    text: '#6ee7b7',
  },
  domain: {
    border: 'rgba(245, 158, 11, 0.6)',
    bg: 'rgba(245, 158, 11, 0.05)',
    pillBg: '#92400e',
    text: '#fde68a',
  },
  custom: {
    border: 'rgba(148, 163, 184, 0.6)',
    bg: 'rgba(148, 163, 184, 0.05)',
    pillBg: '#334155',
    text: '#cbd5e1',
  },
};

export const createZoneBoundary = (props: ZoneBoundaryProps): ZoneBoundaryResult => {
  const cleanups: Array<() => void> = [];
  const bType: BoundaryType = props.zone.boundaryType || 'vpc';
  const palette = BOUNDARY_COLORS[bType] || BOUNDARY_COLORS.vpc;

  const rootElement = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  rootElement.classList.add('vbs-zone-boundary');
  rootElement.dataset.zoneId = props.zone.id;

  // Background rect with dashed outline
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(props.zone.dimensions.width));
  bgRect.setAttribute('height', String(props.zone.dimensions.height));
  bgRect.setAttribute('rx', '12');
  bgRect.setAttribute('ry', '12');
  bgRect.setAttribute('fill', props.zone.tintColor || palette.bg);
  bgRect.setAttribute('stroke', palette.border);
  bgRect.setAttribute('stroke-width', '2');
  bgRect.setAttribute('stroke-dasharray', '6 4');
  bgRect.style.pointerEvents = 'all';
  rootElement.appendChild(bgRect);

  // Header ForeignObject for badge pill and title
  const headerFO = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  headerFO.setAttribute('x', '12');
  headerFO.setAttribute('y', '10');
  headerFO.setAttribute('width', String(Math.max(160, props.zone.dimensions.width - 24)));
  headerFO.setAttribute('height', '32');
  headerFO.style.overflow = 'visible';

  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = [
    'display: flex;',
    'align-items: center;',
    'gap: 8px;',
    'font-family: system-ui, sans-serif;',
    'user-select: none;',
  ].join('');

  // Pill badge
  const pill = document.createElement('span');
  pill.textContent = bType.toUpperCase();
  pill.style.cssText = [
    `background: ${palette.pillBg};`,
    `color: ${palette.text};`,
    'font-size: 10px;',
    'font-weight: 700;',
    'letter-spacing: 0.05em;',
    'padding: 2px 8px;',
    'border-radius: 9999px;',
    'text-transform: uppercase;',
    'flex-shrink: 0;',
  ].join('');
  headerDiv.appendChild(pill);

  // Title
  const titleSpan = document.createElement('span');
  titleSpan.textContent = props.zone.name;
  titleSpan.style.cssText = [
    'color: #f1f5f9;',
    'font-size: 13px;',
    'font-weight: 600;',
    'overflow: hidden;',
    'text-overflow: ellipsis;',
    'white-space: nowrap;',
  ].join('');
  headerDiv.appendChild(titleSpan);

  headerFO.appendChild(headerDiv);
  rootElement.appendChild(headerFO);

  const updateSize = (width: number, height: number): void => {
    bgRect.setAttribute('width', String(width));
    bgRect.setAttribute('height', String(height));
    headerFO.setAttribute('width', String(Math.max(160, width - 24)));
  };

  const updatePosition = (x: number, y: number): void => {
    rootElement.setAttribute('transform', `translate(${x}, ${y})`);
  };

  updatePosition(props.zone.position.x, props.zone.position.y);

  return {
    rootElement,
    updateSize,
    updatePosition,
    cleanup: {
      destroy: () => {
        cleanups.forEach(fn => fn());
        rootElement.remove();
      },
    },
  };
};
