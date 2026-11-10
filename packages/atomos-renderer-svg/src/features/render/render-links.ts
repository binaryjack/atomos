// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Entity, LinkProps } from '@atomos-web/structura-core';
import type { ThemeConfig } from '../../themes.js';
import { computeLinkSvgPath } from '../../routing/render-link-paths.js';
import { escapeXml, finite } from '../../shared/escape.js';
import { field, firstField } from '../../shared/fields.js';
import { entityBox } from '../../shared/geometry.js';

const BOTH = 'marker-start="url(#arrow-left)" marker-end="url(#arrow-right)"';
const MARKERS: Record<string, string> = {
    right: 'marker-end="url(#arrow-right)"',
    default: 'marker-end="url(#arrow-right)"',
    left: 'marker-start="url(#arrow-left)"',
    both: BOTH,
    bidirectional: BOTH,
};

export function renderDefs(theme: ThemeConfig): string {
    const fill = escapeXml(theme.edgeColor);
    return [
        '<defs>',
        `  <marker id="arrow-right" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${fill}" /></marker>`,
        `  <marker id="arrow-left" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="${fill}" /></marker>`,
        '</defs>',
        '',
    ].join('\n');
}

function linkEnds(link: LinkProps, entityMap: Map<string, Entity>): [Entity, Entity] | null {
    const sourceId = String(firstField(link, ['leftEntityId', 'fromEntityId', 'sourceEntityId']) ?? '');
    const targetId = String(firstField(link, ['rightEntityId', 'toEntityId', 'targetEntityId']) ?? '');
    const source = entityMap.get(sourceId);
    const target = entityMap.get(targetId);
    return source && target ? [source, target] : null;
}

function renderLabel(label: unknown, midX: number, midY: number, theme: ThemeConfig): string {
    if (!label) return '';
    return [
        `    <rect x="${midX - 35}" y="${midY - 10}" width="70" height="18" rx="4" fill="${escapeXml(theme.entityBg)}" stroke="${escapeXml(theme.entityBorder)}" stroke-width="1" />`,
        `    <text x="${midX}" y="${midY + 3}" fill="${escapeXml(theme.propertyText)}" font-size="10" font-weight="600" text-anchor="middle">${escapeXml(label)}</text>`,
        '',
    ].join('\n');
}

function linkStyle(link: LinkProps): 'bezier' | 'orthogonal' | 'straight' {
    if (link.style) return link.style as 'bezier' | 'orthogonal' | 'straight';
    if (link.renderType === 'orthogonal') return 'orthogonal';
    return link.renderType === 'linear' ? 'straight' : 'bezier';
}

function renderLink(link: LinkProps, ends: [Entity, Entity], theme: ThemeConfig): string {
    const [s, t] = [entityBox(ends[0]), entityBox(ends[1])];
    const { pathData, midX, midY } = computeLinkSvgPath({
        src: { x: s.x + s.width, y: s.y + s.height / 2 },
        dst: { x: t.x, y: t.y + t.height / 2 },
        style: linkStyle(link),
        ...(link.waypoints ? { waypoints: link.waypoints } : {}),
    });
    const markers = MARKERS[String(link.direction || 'right')] ?? '';
    const width = finite(field(link, 'thickness'), theme.edgeWidth);
    const color = escapeXml(field(link, 'isHighlighted') ? '#F59E0B' : theme.edgeColor);
    const label = firstField(link, ['label', 'name', 'leftProperty']);
    return [
        `  <g class="atomos-link" id="link-${escapeXml(link.id)}">`,
        `    <path d="${escapeXml(pathData)}" stroke="${color}" stroke-width="${width}" fill="none" ${markers} />`,
        renderLabel(label, midX, midY, theme) + '  </g>',
        '',
    ].join('\n');
}

/** Renders all links whose endpoints exist in the entity map. */
export function renderLinks(links: LinkProps[], entityMap: Map<string, Entity>, theme: ThemeConfig): string {
    const body = links
        .map(link => {
            const ends = linkEnds(link, entityMap);
            return ends ? renderLink(link, ends, theme) : '';
        })
        .join('');
    return `<g class="atomos-edges">\n${body}</g>\n`;
}
