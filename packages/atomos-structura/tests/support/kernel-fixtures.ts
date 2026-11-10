// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps, Property } from '@atomos-web/structura-core';
import { createSchemaGraphKernel } from '../../src/shared/core/create-schema-graph-kernel.js';

export const prop = (key: string): Property => ({
  key,
  label: key,
  value: '',
  dataType: 'string',
  componentType: 'input',
});

export const makeEntity = (id: string, nodeType = 'table', props: string[] = []): Entity => ({
  id,
  code: id,
  createdAt: 0,
  updatedAt: 0,
  name: id,
  nodeType,
  properties: props.map(p => prop(p)),
  position: { x: 0, y: 0 },
  dimensions: { width: 120, height: 60 },
  edges: [],
});

export const makeLink = (id: string, left: string, right: string): LinkProps => ({
  id,
  leftEntityId: left,
  rightEntityId: right,
  leftCardinality: '1',
  rightCardinality: '*',
  renderType: 'bezier',
  leftAnchorId: 'right',
  rightAnchorId: 'left',
});

/** Kernel pre-populated with the given entity ids and `[id, from, to]` links. */
export const kernelWith = (ids: readonly string[], links: ReadonlyArray<readonly [string, string, string]> = []) => {
  const kernel = createSchemaGraphKernel();
  ids.forEach(id => kernel.addEntity(makeEntity(id)));
  links.forEach(([id, from, to]) => kernel.addLink(makeLink(id, from, to)));
  return kernel;
};
