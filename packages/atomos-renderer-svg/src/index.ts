import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { themes } from './themes.js';
import type { ThemeMode } from './themes.js';

export { themes };
export type { ThemeMode };

export interface RenderOptions {
    theme?: ThemeMode;
    padding?: number;
    responsive?: boolean;
}

export interface GraphSnapshot {
    entities: Record<string, Entity>;
    links: Record<string, LinkProps>;
}

export function renderToSVG(snapshot: GraphSnapshot, options: RenderOptions = {}): string {
    const themeName = options.theme || 'sovereign-dark';
    const theme = themes[themeName];
    const padding = options.padding ?? 40;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const entities = Object.values(snapshot.entities);
    const links = Object.values(snapshot.links);

    if (entities.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>`;
    }

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

    // Definitions for gradients/markers
    svg += `
    <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="${theme.edgeColor}" />
        </marker>
    </defs>\n`;

    // Draw Links
    svg += `<g class="atomos-edges">\n`;
    links.forEach(link => {
        const source = snapshot.entities[link.leftEntityId];
        const target = snapshot.entities[link.rightEntityId];
        if (!source || !target) return;

        // Simple straight line calculation from centers
        const sx = (source.position?.x ?? 0) + (source.dimensions?.width ?? 250) / 2;
        const sy = (source.position?.y ?? 0) + (source.dimensions?.height ?? 150) / 2;
        const tx = (target.position?.x ?? 0) + (target.dimensions?.width ?? 250) / 2;
        const ty = (target.position?.y ?? 0) + (target.dimensions?.height ?? 150) / 2;

        svg += `  <path d="M ${sx} ${sy} L ${tx} ${ty}" stroke="${theme.edgeColor}" stroke-width="${theme.edgeWidth}" fill="none" marker-end="url(#arrowhead)" />\n`;
    });
    svg += `</g>\n`;

    // Draw Entities
    svg += `<g class="atomos-nodes">\n`;
    entities.forEach(entity => {
        const x = entity.position?.x ?? 0;
        const y = entity.position?.y ?? 0;
        const width = entity.dimensions?.width ?? 250;
        const height = entity.dimensions?.height ?? 150;
        
        svg += `  <g transform="translate(${x}, ${y})">\n`;
        svg += `    <rect width="${width}" height="${height}" rx="6" fill="${theme.entityBg}" stroke="${theme.entityBorder}" stroke-width="2" />\n`;
        svg += `    <text x="16" y="24" fill="${theme.entityText}" font-size="14" font-weight="bold">${entity.name}</text>\n`;
        svg += `    <line x1="0" y1="36" x2="${width}" y2="36" stroke="${theme.entityBorder}" stroke-width="1" />\n`;
        
        if (entity.properties && entity.properties.length > 0) {
            let propY = 56;
            entity.properties.forEach(prop => {
                svg += `    <text x="16" y="${propY}" fill="${theme.propertyText}" font-size="12">${prop.key}: ${prop.dataType}</text>\n`;
                propY += 20;
            });
        }
        svg += `  </g>\n`;
    });
    svg += `</g>\n`;

    svg += `</svg>`;
    return svg;
}
