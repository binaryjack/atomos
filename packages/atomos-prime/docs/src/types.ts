// Core Doc Definition Interface
export interface DocDefinition<TState> {
  id: string;               
  title: string;            
  description: string;      
  
  defaultState: TState;     
  
  controls: Array<{
    key: keyof TState;
    label: string;
    type: 'string' | 'boolean' | 'number' | 'select' | 'color';
    options?: string[];     
  }>;
  
  // A function that returns a DOM element for rendering the preview
  renderPreview: (state: TState) => HTMLElement | { element: HTMLElement; cleanup: { destroy: () => void } };
  
  // A function that returns the code as a string
  renderCode: (state: TState) => string;
}

export type AnyDocDefinition = DocDefinition<any>;