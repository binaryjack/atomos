export type EntityState = {
  id: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  data: Record<string, unknown>;
};

export type LinkState = {
  id: string;
  sourceId: string;
  targetId: string;
  anchorFrom: string;
  anchorTo: string;
};

export type ViewportState = {
  zoom: number;
  panX: number;
  panY: number;
};

export type CanvasState = {
  entities: Record<string, EntityState>;
  links: Record<string, LinkState>;
  viewport: ViewportState;
  selectedEntityId: string | null;
};

export type StoreAction = 
  | { type: 'entity/add'; payload: EntityState }
  | { type: 'entity/update'; payload: { id: string; changes: Partial<EntityState> } }
  | { type: 'entity/remove'; payload: { id: string } }
  | { type: 'entity/select'; payload: { id: string | null } }
  | { type: 'link/add'; payload: LinkState }
  | { type: 'link/remove'; payload: { id: string } }
  | { type: 'viewport/update'; payload: Partial<ViewportState> }
  | { type: 'canvas/load'; payload: CanvasState }
  | { type: 'canvas/clear' };

export type Store = {
  getState(): CanvasState;
  dispatch(action: StoreAction): void;
  subscribe(listener: (state: CanvasState) => void): () => void;
};