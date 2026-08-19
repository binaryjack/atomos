import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { computeLinkSvgPath } from './routing/render-link-paths.js';
import { themes } from './themes.js';
import type { ThemeMode } from './themes.js';

export { themes };
export type { ThemeMode };
export { computeLinkSvgPath } from './routing/render-link-paths.js';

export interface RenderOptions {
    theme?: ThemeMode;
    padding?: number;
    responsive?: boolean;
}

export interface GraphSnapshot {
    entities: Record<string, Entity> | Entity[];
    links: Record<string, LinkProps> | LinkProps[];
}

export function renderToSVG(snapshot: GraphSnapshot, options: RenderOptions = {}): string {
    const themeName = options.theme || 'sovereign-dark';
    const theme = themes[themeName] || themes['sovereign-dark'];
    const padding = options.padding ?? 40;

    const entities: Entity[] = Array.isArray(snapshot.entities)
        ? snapshot.entities
        : Object.values(snapshot.entities || {});

    const links: LinkProps[] = Array.isArray(snapshot.links)
        ? snapshot.links
        : Object.values(snapshot.links || {});

    if (entities.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>`;
    }

    const entityMap = new Map<string, Entity>();
    entities.forEach(e => entityMap.set(e.id, e));

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    entities.forEach(entity => {
        const x = entity.position?.x ?? 0;
        const y = entity.position?.y ?? 0;
        const width = entity.dimensions?.width ?? 250;
        const height = entity.dimensions?.height ?? 150;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    });

    const viewBoxX = minX - padding;
    const viewBoxY = minY - padding;
    const viewBoxWidth = (maxX - minX) + (padding * 2);
    const viewBoxHeight = (maxY - minY) + (padding * 2);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" ${options.responsive ? 'width="100%" height="100%"' : `width="${viewBoxWidth}" height="${viewBoxHeight}"`} style="background-color: ${theme.background}; font-family: 'Inter', system-ui, sans-serif;">\n`;

    // Definitions for arrow markers
    svg += `
    <defs>
        <!-- Arrowhead Right (End) -->
        <marker id="arrow-right" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="${theme.edgeColor}" />
        </marker>
        <!-- Arrowhead Left (Start) -->
        <marker id="arrow-left" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
            <polygon points="10 0, 0 3.5, 10 7" fill="${theme.edgeColor}" />
        </marker>
    </defs>\n`;

    // Draw Zones first (Background layer)
    const zones = entities.filter(e => e.nodeType === 'zone' || (e as any).metadata?.isZone);
    if (zones.length > 0) {
        svg += `<g class="atomos-zones">\n`;
        zones.forEach(zone => {
            const x = zone.position?.x ?? 0;
            const y = zone.position?.y ?? 0;
            const width = zone.dimensions?.width ?? 400;
            const height = zone.dimensions?.height ?? 300;
            const tint = (zone as any).tintColor || 'rgba(59, 130, 246, 0.08)';
            const bType = ((zone as any).boundaryType || 'VPC').toUpperCase();

            svg += `  <g transform="translate(${x}, ${y})" class="atomos-zone">\n`;
            svg += `    <rect width="${width}" height="${height}" rx="12" fill="${tint}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="6 4" />\n`;
            svg += `    <rect x="12" y="10" width="60" height="20" rx="10" fill="#1e40af" />\n`;
            svg += `    <text x="42" y="24" fill="#93c5fd" font-size="10" font-weight="bold" text-anchor="middle">${bType}</text>\n`;
            svg += `    <text x="80" y="25" fill="${theme.entityText}" font-size="12" font-weight="600">${zone.name}</text>\n`;
            svg += `  </g>\n`;
        });
        svg += `</g>\n`;
    }

    // Draw Links
    svg += `<g class="atomos-edges">\n`;
    links.forEach(link => {
        const leftId = link.leftEntityId || (link as any).fromEntityId || (link as any).sourceEntityId;
        const rightId = link.rightEntityId || (link as any).toEntityId || (link as any).targetEntityId;

        const source = entityMap.get(leftId);
        const target = entityMap.get(rightId);
        if (!source || !target) return;

        const sx = (source.position?.x ?? 0) + (source.dimensions?.width ?? 250);
        const sy = (source.position?.y ?? 0) + (source.dimensions?.height ?? 150) / 2;
        const tx = (target.position?.x ?? 0);
        const ty = (target.position?.y ?? 0) + (target.dimensions?.height ?? 150) / 2;

        const linkStyle = link.style || (link.renderType === 'orthogonal' ? 'orthogonal' : link.renderType === 'linear' ? 'straight' : 'bezier');
        const { pathData, midX, midY } = computeLinkSvgPath({
            src: { x: sx, y: sy },
            dst: { x: tx, y: ty },
            style: linkStyle,
            ...(link.waypoints ? { waypoints: link.waypoints } : {}),
        });

        const direction = link.direction || (link as any).direction || 'right';
        let markerAttrs = '';
        if (direction === 'right' || direction === 'default') {
            markerAttrs = 'marker-end="url(#arrow-right)"';
        } else if (direction === 'left') {
            markerAttrs = 'marker-start="url(#arrow-left)"';
        } else if (direction === 'both' || direction === 'bidirectional') {
            markerAttrs = 'marker-start="url(#arrow-left)" marker-end="url(#arrow-right)"';
        }

        const edgeWidth = (link as any).thickness ?? theme.edgeWidth;
        const edgeColor = (link as any).isHighlighted ? '#F59E0B' : theme.edgeColor;

        svg += `  <g class="atomos-link" id="link-${link.id}">\n`;
        svg += `    <path d="${pathData}" stroke="${edgeColor}" stroke-width="${edgeWidth}" fill="none" ${markerAttrs} />\n`;

        // Render Link Label if present
        const label = (link as any).label || (link as any).name || (link as any).leftProperty;
        if (label) {
            svg += `    <rect x="${midX - 35}" y="${midY - 10}" width="70" height="18" rx="4" fill="${theme.entityBg}" stroke="${theme.entityBorder}" stroke-width="1" />\n`;
            svg += `    <text x="${midX}" y="${midY + 3}" fill="${theme.propertyText}" font-size="10" font-weight="600" text-anchor="middle">${label}</text>\n`;
        }

        svg += `  </g>\n`;
    });
    svg += `</g>\n`;

    // Draw Entities (excluding zones)
    const standardEntities = entities.filter(e => e.nodeType !== 'zone' && !(e as any).metadata?.isZone);
    svg += `<g class="atomos-nodes">\n`;
    standardEntities.forEach(entity => {
        const x = entity.position?.x ?? 0;
        const y = entity.position?.y ?? 0;
        const width = entity.dimensions?.width ?? 250;
        const height = entity.dimensions?.height ?? 150;
        const isStickyNote = entity.nodeType === 'sticky-note' || (entity as any).metadata?.isStickyNote;
        const isGroup = entity.nodeType === 'group' || (entity as any).isGroup;

        if (isStickyNote) {
            const noteBg = (entity as any).noteColor || '#fef08a';
            const noteContent = (entity as any).content || entity.name;
            svg += `  <g transform="translate(${x}, ${y})" class="atomos-sticky-note">\n`;
            svg += `    <rect width="${width}" height="${height}" rx="6" fill="${noteBg}" stroke="rgba(0,0,0,0.15)" stroke-width="1" />\n`;
            svg += `    <rect width="${width}" height="24" rx="6" fill="rgba(0,0,0,0.06)" />\n`;
            svg += `    <text x="10" y="16" fill="#475569" font-size="10" font-weight="bold">📌 ${entity.name}</text>\n`;
            svg += `    <text x="10" y="44" fill="#0f172a" font-size="11">${noteContent.slice(0, 40)}</text>\n`;
            svg += `  </g>\n`;
            return;
        }

        svg += `  <g transform="translate(${x}, ${y})" class="atomos-entity">\n`;
        svg += `    <rect width="${width}" height="${height}" rx="8" fill="${theme.entityBg}" stroke="${isGroup ? '#06b6d4' : theme.entityBorder}" stroke-width="${isGroup ? '3' : '2'}" />\n`;
        svg += `    <text x="16" y="24" fill="${theme.entityText}" font-size="14" font-weight="bold">${entity.name}</text>\n`;
        svg += `    <line x1="0" y1="36" x2="${width}" y2="36" stroke="${theme.entityBorder}" stroke-width="1" />\n`;

        if (entity.properties && entity.properties.length > 0) {
            let propY = 56;
            entity.properties.forEach(prop => {
                const labelStr = prop.label || prop.key;
                const valStr = prop.value ? `: ${prop.value}` : ` (${prop.dataType})`;
                svg += `    <text x="16" y="${propY}" fill="${theme.propertyText}" font-size="12">${labelStr}${valStr}</text>\n`;
                propY += 20;
            });
        }
        svg += `  </g>\n`;
    });
    svg += `</g>\n`;

    svg += `</svg>`;
    return svg;
}
