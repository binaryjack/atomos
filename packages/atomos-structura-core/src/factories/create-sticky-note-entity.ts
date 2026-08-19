import type { Dimensions, Position, StickyNoteEntity } from '../types/entity.types.js';

export interface CreateStickyNoteOptions {
  readonly id: string;
  readonly name?: string;
  readonly code?: string;
  readonly position: Position;
  readonly dimensions?: Dimensions;
  readonly noteColor?: string;
  readonly content?: string;
  readonly author?: string;
}

export const createStickyNoteEntity = (opts: CreateStickyNoteOptions): StickyNoteEntity => {
  const noteColor = opts.noteColor ?? '#fef08a'; // Tailwind yellow-200
  const content = opts.content ?? '## Architecture Note\nAdd your architectural decision or ADR reference here.';
  const dimensions = opts.dimensions ?? { width: 220, height: 160 };

  return {
    id: opts.id,
    code: opts.code ?? opts.id,
    name: opts.name ?? 'Sticky Note',
    nodeType: 'sticky-note',
    noteColor,
    content,
    ...(opts.author !== undefined ? { author: opts.author } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    position: opts.position,
    dimensions,
    properties: [],
    edges: [],
    metadata: {
      isStickyNote: true,
      noteColor,
      content,
    },
  };
};
