import { iconDoc } from './components/icon.doc.js'

export const COMPONENT_REGISTRY = [
  iconDoc
];

export const getDocById = (id: string) => {
  return COMPONENT_REGISTRY.find(doc => doc.id === id);
};