// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Entity } from '@atomos-web/structura-core';
import type { ThemeConfig } from '../../themes.js';
import { escapeXml } from '../../shared/escape.js';
import { field, metaFlag } from '../../shared/fields.js';
import { entityBox } from '../../shared/geometry.js';
import { isZone } from './render-zones.js';

function renderStickyNote(entity: Entity): string {
    const b = entityBox(entity);
    const content = String(field(entity, 'content') || entity.name || '').slice(0, 40);
    const noteBg = escapeXml(field(entity, 'noteColor') || '#fef08a');
    return [
        `  <g transform="translate(${b.x}, ${b.y})" class="atomos-sticky-note">`,
        `    <rect width="${b.width}" height="${b.height}" rx="6" fill="${noteBg}" stroke="rgba(0,0,0,0.15)" stroke-width="1" />`,
        `    <rect width="${b.width}" height="24" rx="6" fill="rgba(0,0,0,0.06)" />`,
        `    <text x="10" y="16" fill="#475569" font-size="10" font-weight="bold">📌 ${escapeXml(entity.name)}</text>`,
        `    <text x="10" y="44" fill="#0f172a" font-size="11">${escapeXml(content)}</text>`,
        `  </g>`,
        '',
    ].join('\n');
}

function renderProperties(entity: Entity, theme: ThemeConfig): string {
    const fill = escapeXml(theme.propertyText);
    return (entity.properties ?? [])
        .map((prop, i) => {
            const label = prop.label || prop.key;
            const value = prop.value ? `: ${prop.value}` : ` (${prop.dataType})`;
            return `    <text x="16" y="${56 + i * 20}" fill="${fill}" font-size="12">${escapeXml(label)}${escapeXml(value)}</text>\n`;
        })
        .join('');
}

function renderEntity(entity: Entity, theme: ThemeConfig): string {
    const b = entityBox(entity);
    const isGroup = entity.nodeType === 'group' || Boolean(field(entity, 'isGroup'));
    const border = escapeXml(isGroup ? '#06b6d4' : theme.entityBorder);
    return [
        `  <g transform="translate(${b.x}, ${b.y})" class="atomos-entity">`,
        `    <rect width="${b.width}" height="${b.height}" rx="8" fill="${escapeXml(theme.entityBg)}" stroke="${border}" stroke-width="${isGroup ? 3 : 2}" />`,
        `    <text x="16" y="24" fill="${escapeXml(theme.entityText)}" font-size="14" font-weight="bold">${escapeXml(entity.name)}</text>`,
        `    <line x1="0" y1="36" x2="${b.width}" y2="36" stroke="${escapeXml(theme.entityBorder)}" stroke-width="1" />`,
        renderProperties(entity, theme) + '  </g>',
        '',
    ].join('\n');
}

/** Renders every non-zone entity (sticky notes, groups and regular nodes). */
export function renderEntities(entities: Entity[], theme: ThemeConfig): string {
    const body = entities
        .filter(e => !isZone(e))
        .map(e => {
            const sticky = e.nodeType === 'sticky-note' || metaFlag(e, 'isStickyNote');
            return sticky ? renderStickyNote(e) : renderEntity(e, theme);
        })
        .join('');
    return `<g class="atomos-nodes">\n${body}</g>\n`;
}
