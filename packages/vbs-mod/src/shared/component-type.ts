export type ComponentType = 'input' | 'select' | 'checkbox' | 'textarea';

export const COMPONENT_TYPES: readonly ComponentType[] = [
  'input',
  'select',
  'checkbox',
  'textarea'
] as const;
