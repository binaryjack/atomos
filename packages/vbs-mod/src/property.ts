import type { PropertyProps } from './types/property.types';

export const property = function(this: PropertyProps, props: PropertyProps) {
  Object.defineProperty(this, 'key', { 
    value: props.key, 
    enumerable: false, 
    writable: false 
  });
  
  Object.defineProperty(this, 'value', { 
    value: props.value, 
    enumerable: false, 
    writable: true 
  });
  
  Object.defineProperty(this, 'type', { 
    value: props.type, 
    enumerable: false, 
    writable: false 
  });
  
  Object.defineProperty(this, 'componentType', { 
    value: props.componentType, 
    enumerable: false, 
    writable: false 
  });
  
  Object.defineProperty(this, 'schema', {
    value: props.schema,
    enumerable: false,
    writable: false
  });

  return this;
};