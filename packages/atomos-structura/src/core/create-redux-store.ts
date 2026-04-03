import type { Cardinality, LinkProps, RenderType } from '@atomos/structura-core';
import type { ReduxAction, ReduxState, ReduxStore } from '../types/redux-state.types.js';

const initial_state: ReduxState = {
  schemas: {},
  active_schema_id: 'schema-default',
  canvas_viewport: { pan: { x: 0, y: 0 }, zoom: 1 }
};

const reduce_state = function(state: ReduxState, action: ReduxAction): ReduxState {
  console.log('🏪 Redux action:', action.type, action);
  
  switch (action.type) {
    case 'entity-moved': {
      const schema = state.schemas[action.schema_id];
      if (!schema) return state;
      
      const entities = schema.entities.map(e =>
        e.id === action.entity_id 
          ? { ...e, position: { x: action.x, y: action.y } }
          : e
      );
      
      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, entities }
        }
      };
    }
    
    case 'entity-resized': {
      const schema = state.schemas[action.schema_id];
      if (!schema) return state;
      
      const entities = schema.entities.map(e =>
        e.id === action.entity_id 
          ? { ...e, dimensions: { width: action.width, height: action.height } }
          : e
      );
      
      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, entities }
        }
      };
    }
    
    case 'entity-updated': {
      console.log(`🏬 [REDUX-STORE] entity-updated action received for: ${action.entity.id}`);
      console.log(`🏬 [REDUX-STORE] Entity properties:`, action.entity.properties?.map(p => `${p.key}:${p.dataType}`));
      
      const schema = state.schemas[action.schema_id];
      if (!schema) {
        console.error(`🏬 [REDUX-STORE] Schema ${action.schema_id} not found!`);
        return state;
      }
      
      const entities = schema.entities.map(e =>
        e.id === action.entity.id ? action.entity : e
      );
      
      console.log(`🏬 [REDUX-STORE] ✓ Entity updated in Redux store`);
      
      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, entities }
        }
      };
    }
    
    case 'entity-added': {
      const schema = state.schemas[action.schema_id] || {
        id: action.schema_id,
        name: 'Default Schema',
        entities: [],
        links: []
      };
      
      const entities = [...schema.entities, action.entity];
      
      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, entities }
        }
      };
    }
    
    case 'entity-removed': {
      console.log(`🏬 [REDUX-STORE] entity-removed action received: ${action.entity_id}`);
      const schema = state.schemas[action.schema_id];
      if (!schema) {
        console.error(`🏬 [REDUX-STORE] Schema ${action.schema_id} not found!`);
        return state;
      }
      
      const entitiesBeforeFilter = schema.entities.length;
      const linksBeforeFilter = schema.links.length;
      
      const entities = schema.entities.filter(e => e.id !== action.entity_id);
      const links = schema.links.filter(l => 
        l.leftEntityId !== action.entity_id && l.rightEntityId !== action.entity_id
      );
      
      console.log(`🏬 [REDUX-STORE] Entity removal: ${entitiesBeforeFilter} → ${entities.length} entities`);
      console.log(`🏬 [REDUX-STORE] Link cascade: ${linksBeforeFilter} → ${links.length} links`);
      
      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, entities, links }
        }
      };
    }
    
    case 'link-created': {
      const schema = state.schemas[action.schema_id] || {
        id: action.schema_id,
        name: 'Default Schema',
        entities: [],
        links: []
      };

      const link: LinkProps = {
        id: action.link_id || `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        leftEntityId: action.from_id,
        rightEntityId: action.to_id,
        leftAnchorId: action.from_anchor || 'center',
        rightAnchorId: action.to_anchor || 'center',
        leftCardinality: (action.leftCardinality || '1') as Cardinality,
        rightCardinality: (action.rightCardinality || '1') as Cardinality,
        ...(action.leftProperty ? { leftProperty: action.leftProperty } : {}),
        ...(action.rightProperty ? { rightProperty: action.rightProperty } : {}),
        renderType: 'linear' as RenderType
      };
      
      const links = [...schema.links, link];
      
      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, links }
        }
      };
    }

    case 'link-updated': {
      const schema = state.schemas[action.schema_id];
      if (!schema) return state;

      const links = schema.links.map(l =>
        l.id === action.link.id ? { ...l, ...action.link } : l
      );

      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, links }
        }
      };
    }

    case 'link-removed': {
      const schema = state.schemas[action.schema_id];
      if (!schema) return state;
      
      const links = schema.links.filter(l => l.id !== action.link_id);
      
      return {
        ...state,
        schemas: {
          ...state.schemas,
          [action.schema_id]: { ...schema, links }
        }
      };
    }
    
    case 'viewport-updated': {
      return {
        ...state,
        canvas_viewport: action.viewport
      };
    }
    
    case 'state-loaded': {
      return action.state;
    }
    
    default:
      return state;
  }
};

export const create_redux_store = function(): ReduxStore {
  let current_state = initial_state;
  const listeners = new Set<(state: ReduxState) => void>();

  const persist = function(): void {
    const serialized = JSON.stringify(current_state);
    try {
      localStorage.setItem('vbe2:redux-state', serialized);
      console.log('💾 Redux state persisted:', current_state);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded - cleaning up old data...');
        // Clear old persistence data to make room
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('vbe2:') && key !== 'vbe2:redux-state') {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🧹 Removed ${key} to free localStorage space`);
        });
        
        // Try persisting again after cleanup
        try {
          localStorage.setItem('vbe2:redux-state', serialized);
          console.log('💾 Redux state persisted after cleanup');
        } catch (retryError) {
          console.error('❌ Still failed to persist after cleanup - state too large:', retryError);
        }
      } else {
        console.error('❌ Failed to persist Redux state:', error);
      }
    }
  };

  const load = function(): void {
    try {
      const raw = localStorage.getItem('vbe2:redux-state');
      if (raw) {
        const loaded_state = JSON.parse(raw) as ReduxState;
        current_state = loaded_state;
        console.log('📂 Redux state loaded:', current_state);
      } else {
        console.log('📝 No persisted Redux state found, using defaults');
      }
    } catch (error) {
      console.error('❌ Failed to load Redux state:', error);
      current_state = initial_state;
    }
  };

  const get_state = function(): ReduxState {
    return current_state;
  };

  const dispatch = function(action: ReduxAction): void {
    const previous_state = current_state;
    current_state = reduce_state(current_state, action);
    
    if (current_state !== previous_state) {
      persist();
      listeners.forEach(listener => listener(current_state));
    }
  };

  const subscribe = function(listener: (state: ReduxState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // Load initial state
  load();

  return { get_state, dispatch, subscribe };
};

let globalReduxStore: ReduxStore | null = null;

export const getGlobalReduxStore = function(): ReduxStore {
  if (!globalReduxStore) {
    globalReduxStore = create_redux_store();
  }
  return globalReduxStore;
};
