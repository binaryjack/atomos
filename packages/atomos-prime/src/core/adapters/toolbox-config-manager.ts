import type { CustomShape } from '../../features/settings-page/types/settings-page.types.js'
import type { ToolboxConfiguration } from '../../types/toolbox.types.js'
import { defaultToolboxConfig } from '../default-toolbox.config.js'

const STORAGE_KEY_CONFIG = 'atomos_toolbox_config';
const STORAGE_KEY_SHAPES = 'atomos_custom_shapes';

let currentConfig: ToolboxConfiguration = defaultToolboxConfig;
let currentShapes: CustomShape[] = [];

try {
  const storedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (storedConfig) {
    currentConfig = JSON.parse(storedConfig);
  }
  const storedShapes = localStorage.getItem(STORAGE_KEY_SHAPES);
  if (storedShapes) {
    currentShapes = JSON.parse(storedShapes);
  }
} catch (e) {
  // Ignored
}

export const setToolboxConfig = function(config: ToolboxConfiguration): void {
  currentConfig = config;
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {}
};

export const getToolboxConfig = function(): ToolboxConfiguration {
  return currentConfig;
};

export const setCustomShapes = function(shapes: CustomShape[]): void {
  currentShapes = shapes;
  try {
    localStorage.setItem(STORAGE_KEY_SHAPES, JSON.stringify(shapes));
  } catch (e) {}
};

export const getCustomShapes = function(): CustomShape[] {
  return currentShapes;
};
