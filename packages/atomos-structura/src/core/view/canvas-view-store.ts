/**
 * View Layer - UI State Management
 * Separate from domain logic, handles pure UI concerns
 */

export interface ViewportState {
  readonly zoom: number;
  readonly panX: number; 
  readonly panY: number;
}

export interface SelectionState {
  readonly selectedEntityId: string | null;
  readonly multiSelection: readonly string[];
}

export interface CanvasViewState {
  readonly viewport: ViewportState;
  readonly selection: SelectionState;
  readonly isDragging: boolean;
  readonly isPanning: boolean;
}

// View Commands
export interface SetViewportCommand {
  readonly type: 'SetViewport';
  readonly viewport: Partial<ViewportState>;
}

export interface SelectEntityCommand {
  readonly type: 'SelectEntity';
  readonly entityId: string | null;
}

export interface AddToSelectionCommand {
  readonly type: 'AddToSelection';
  readonly entityId: string;
}

export interface SetDraggingCommand {
  readonly type: 'SetDragging';
  readonly isDragging: boolean;
}

export interface SetPanningCommand {
  readonly type: 'SetPanning';
  readonly isPanning: boolean;
}

export type ViewCommand = 
  | SetViewportCommand
  | SelectEntityCommand  
  | AddToSelectionCommand
  | SetDraggingCommand
  | SetPanningCommand;

// View Events
export interface ViewportChangedEvent {
  readonly type: 'ViewportChanged';
  readonly viewport: ViewportState;
}

export interface SelectionChangedEvent {
  readonly type: 'SelectionChanged';
  readonly selection: SelectionState;
}

export type ViewEvent = ViewportChangedEvent | SelectionChangedEvent;

export interface ViewEventBus {
  readonly publish: (event: ViewEvent) => void;
  readonly subscribe: (handler: (event: ViewEvent) => void) => () => void;
}

// View Store (like Redux but simpler)
export interface CanvasViewStore {
  readonly getState: () => CanvasViewState;
  readonly dispatch: (command: ViewCommand) => void;
  readonly subscribe: (listener: (state: CanvasViewState) => void) => () => void;
  readonly onViewEvent: (handler: (event: ViewEvent) => void) => () => void;
}

export const createCanvasViewStore = function(): CanvasViewStore {
  const initialState: CanvasViewState = {
    viewport: { zoom: 1, panX: 0, panY: 0 },
    selection: { selectedEntityId: null, multiSelection: [] },
    isDragging: false,
    isPanning: false
  };
  
  let state = initialState;
  const listeners = new Set<(state: CanvasViewState) => void>();
  const eventHandlers = new Set<(event: ViewEvent) => void>();
  
  const publishEvent = function(event: ViewEvent): void {
    setTimeout(() => {
      eventHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[ViewStore] Event handler failed:`, error);
        }
      });
    }, 0);
  };
  
  const notifyListeners = function(): void {
    listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error(`[ViewStore] Listener failed:`, error);
      }
    });
  };
  
  const dispatch = function(command: ViewCommand): void {
    const previousState = state;
    
    switch (command.type) {
      case 'SetViewport': {
        const newViewport = { ...state.viewport, ...command.viewport };
        state = { ...state, viewport: newViewport };
        
        publishEvent({
          type: 'ViewportChanged',
          viewport: newViewport
        });
        break;
      }
      
      case 'SelectEntity': {
        const newSelection: SelectionState = {
          selectedEntityId: command.entityId,
          multiSelection: command.entityId ? [command.entityId] : []
        };
        state = { ...state, selection: newSelection };
        
        publishEvent({
          type: 'SelectionChanged', 
          selection: newSelection
        });
        break;
      }
      
      case 'AddToSelection': {
        const multiSelection = state.selection.multiSelection.includes(command.entityId)
          ? state.selection.multiSelection // Already selected
          : [...state.selection.multiSelection, command.entityId];
          
        const newSelection: SelectionState = {
          selectedEntityId: multiSelection[0] || null,
          multiSelection
        };
        state = { ...state, selection: newSelection };
        
        publishEvent({
          type: 'SelectionChanged',
          selection: newSelection  
        });
        break;
      }
      
      case 'SetDragging': {
        state = { ...state, isDragging: command.isDragging };
        break;
      }
      
      case 'SetPanning': {
        state = { ...state, isPanning: command.isPanning };
        break;
      }
      
      default:
        // @ts-ignore - Exhaustive check
        console.warn(`[ViewStore] Unknown command: ${command.type}`);
        return;
    }
    
    // Only notify if state actually changed
    if (state !== previousState) {
      notifyListeners();
    }
  };
  
  const getState = function(): CanvasViewState {
    return state;
  };
  
  const subscribe = function(listener: (state: CanvasViewState) => void): () => void {
    listeners.add(listener);
    
    return function unsubscribe() {
      listeners.delete(listener);
    };
  };
  
  const onViewEvent = function(handler: (event: ViewEvent) => void): () => void {
    eventHandlers.add(handler);
    
    return function unsubscribe() {
      eventHandlers.delete(handler);
    };
  };
  
  return { getState, dispatch, subscribe, onViewEvent };
};