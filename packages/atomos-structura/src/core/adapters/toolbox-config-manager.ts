import type { CustomShape, AppSettings } from '../../features/settings-page/types/settings-page.types.js'
import type { ToolboxConfiguration } from '@atomos/prime'
import { defaultToolboxConfig, defaultShapes } from '../default-toolbox.config.js'

const STORAGE_KEY_CONFIG = 'atomos_toolbox_config';
const STORAGE_KEY_SHAPES = 'atomos_custom_shapes';
const STORAGE_KEY_GENERAL = 'atomos_general_settings';

let currentConfig: ToolboxConfiguration = defaultToolboxConfig;
let currentShapes: CustomShape[] = JSON.parse(JSON.stringify(defaultShapes));   
let currentGeneral: AppSettings['general'] = {
  gridSize: 20,
  enableSnapping: true,
  defaultLinkStyle: 'orthogonal',
  gridPrimaryColor: '#334155',
  gridSecondaryColor: '#1e293b'
};

try {
  const storedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (storedConfig) {
    currentConfig = JSON.parse(storedConfig);
  }
  const storedShapes = localStorage.getItem(STORAGE_KEY_SHAPES);
  if (storedShapes) {
    currentShapes = JSON.parse(storedShapes);
  }
  const storedGeneral = localStorage.getItem(STORAGE_KEY_GENERAL);
  if (storedGeneral) {
    currentGeneral = { ...currentGeneral, ...JSON.parse(storedGeneral) };
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

export const setGeneralSettings = function(general: AppSettings['general']): void {
  currentGeneral = general;
  try {
    localStorage.setItem(STORAGE_KEY_GENERAL, JSON.stringify(general));
  } catch (e) {}
};

export const getGeneralSettings = function(): AppSettings['general'] {
  return currentGeneral;
};
