// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { escapeXml, renderToSVG } from '../../index.js';

const PAYLOAD = '<script>alert(1)</script>"onload="x';

function entity(id: string, name: string, x: number): Entity {
    return {
        id,
        name,
        shape: 'rectangle',
        position: { x, y: 0 },
        dimensions: { width: 200, height: 100 },
        properties: [{ id: `${id}-p`, key: 'k', label: PAYLOAD, value: PAYLOAD, dataType: 'string' }],
        edges: [],
    } as unknown as Entity;
}

describe('renderToSVG escaping', () => {
    it('escapes every XML special character', () => {
        expect(escapeXml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;');
    });

    it('never emits raw markup from entity names, properties or link labels', () => {
        const link = { id: `l"1`, leftEntityId: 'a', rightEntityId: 'b', label: PAYLOAD } as unknown as LinkProps;
        const svg = renderToSVG({ entities: [entity('a', PAYLOAD, 0), entity('b', 'B', 400)], links: [link] });
        expect(svg).not.toContain('<script>');
        expect(svg).not.toContain('"onload="');
        expect(svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(svg).toContain('id="link-l&quot;1"');
    });

    it('ignores non-numeric coordinates instead of injecting them', () => {
        const bad = entity('a', 'A', 0);
        (bad as unknown as { position: { x: unknown } }).position.x = '0" onclick="evil';
        const svg = renderToSVG({ entities: [bad], links: [] });
        expect(svg).not.toContain('onclick');
    });
});
