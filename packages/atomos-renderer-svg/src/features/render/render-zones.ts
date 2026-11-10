// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Entity } from '@atomos-web/structura-core';
import type { ThemeConfig } from '../../themes.js';
import { escapeXml } from '../../shared/escape.js';
import { field, metaFlag } from '../../shared/fields.js';
import { entityBox } from '../../shared/geometry.js';

export function isZone(entity: Entity): boolean {
    return entity.nodeType === 'zone' || metaFlag(entity, 'isZone');
}

function renderZone(zone: Entity, theme: ThemeConfig): string {
    const b = entityBox(zone, 400, 300);
    const tint = escapeXml(field(zone, 'tintColor') || 'rgba(59, 130, 246, 0.08)');
    const boundary = escapeXml(String(field(zone, 'boundaryType') || 'VPC').toUpperCase());
    return [
        `  <g transform="translate(${b.x}, ${b.y})" class="atomos-zone">`,
        `    <rect width="${b.width}" height="${b.height}" rx="12" fill="${tint}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6 4" />`,
        `    <rect x="12" y="10" width="60" height="20" rx="10" fill="#1e40af" />`,
        `    <text x="42" y="24" fill="#93c5fd" font-size="10" font-weight="bold" text-anchor="middle">${boundary}</text>`,
        `    <text x="80" y="25" fill="${escapeXml(theme.entityText)}" font-size="12" font-weight="600">${escapeXml(zone.name)}</text>`,
        `  </g>`,
        '',
    ].join('\n');
}

/** Renders zone containers as the background layer. */
export function renderZones(entities: Entity[], theme: ThemeConfig): string {
    const zones = entities.filter(isZone);
    if (zones.length === 0) return '';
    return `<g class="atomos-zones">\n${zones.map(z => renderZone(z, theme)).join('')}</g>\n`;
}
