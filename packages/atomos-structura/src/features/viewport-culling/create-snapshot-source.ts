// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * SVG source for exports (SVG / PNG / share card): re-mounts every culled element first so
 * snapshots always contain the whole graph. Culling resumes on the next pan / zoom / edit.
 */
export const createSnapshotSource = (getSvg: () => SVGSVGElement, restoreAll: () => void): (() => SVGSVGElement) =>
  () => {
    restoreAll();
    return getSvg();
  };
