// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { renderEntities } from './features/render/render-entities.js';
import { renderDefs, renderLinks } from './features/render/render-links.js';
import { renderZones } from './features/render/render-zones.js';
import { escapeXml } from './shared/escape.js';
import { computeViewBox } from './shared/geometry.js';
import { themes } from './themes.js';
import type { ThemeMode } from './themes.js';

export { themes };
export type { ThemeMode };
export { computeLinkSvgPath } from './routing/render-link-paths.js';
export { escapeXml } from './shared/escape.js';

export interface RenderOptions {
    theme?: ThemeMode;
    padding?: number;
    responsive?: boolean;
}

export interface GraphSnapshot {
    entities: Record<string, Entity> | Entity[];
    links: Record<string, LinkProps> | LinkProps[];
}

function toArray<T>(value: Record<string, T> | T[] | undefined): T[] {
    if (Array.isArray(value)) return value;
    return Object.values(value ?? {});
}

/** Renders a graph snapshot to a standalone SVG string. All model text is XML-escaped. */
export function renderToSVG(snapshot: GraphSnapshot, options: RenderOptions = {}): string {
    const theme = themes[options.theme ?? 'sovereign-dark'] ?? themes['sovereign-dark'];
    const entities = toArray(snapshot.entities);
    const links = toArray(snapshot.links);
    if (entities.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>`;
    }
    const entityMap = new Map<string, Entity>(entities.map(e => [e.id, e]));
    const vb = computeViewBox(entities, options.padding ?? 40);
    const size = options.responsive ? 'width="100%" height="100%"' : `width="${vb.width}" height="${vb.height}"`;
    const style = `background-color: ${escapeXml(theme.background)}; font-family: 'Inter', system-ui, sans-serif;`;
    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}" ${size} style="${style}">\n`,
        renderDefs(theme),
        renderZones(entities, theme),
        renderLinks(links, entityMap, theme),
        renderEntities(entities, theme),
        `</svg>`,
    ].join('');
}
