export interface InteractionContext {
  readonly entityId: string;
  readonly anchorId?: string;
  readonly position: { x: number; y: number };
  readonly event: PointerEvent | MouseEvent;
}
