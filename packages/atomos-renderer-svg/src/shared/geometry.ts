// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Entity } from '@atomos-web/structura-core';
import { finite } from './escape.js';

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function entityBox(entity: Entity, defaultWidth = 250, defaultHeight = 150): Box {
    return {
        x: finite(entity.position?.x, 0),
        y: finite(entity.position?.y, 0),
        width: finite(entity.dimensions?.width, defaultWidth),
        height: finite(entity.dimensions?.height, defaultHeight),
    };
}

export function computeViewBox(entities: Entity[], padding: number): Box {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const entity of entities) {
        const b = entityBox(entity);
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
    }
    return {
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
    };
}
