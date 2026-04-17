import type { ToolboxConfiguration } from '@atomos-web/prime'
import type { AppSettings, CustomShape } from '../../features/settings-page/types/settings-page.types.js'
import { defaultShapes, defaultToolboxConfig } from '../default-toolbox.config.js'

let STORAGE_KEY_CONFIG = 'atomos_toolbox_config';
let STORAGE_KEY_SHAPES = 'atomos_custom_shapes';
let STORAGE_KEY_GENERAL = 'atomos_general_settings';
let STORAGE_KEY_APPEARANCE = 'atomos_appearance_settings';

let currentConfig: ToolboxConfiguration = defaultToolboxConfig;
let currentShapes: CustomShape[] = JSON.parse(JSON.stringify(defaultShapes));
let currentGeneral: AppSettings['general'] = {
  gridSize: 20,
  enableSnapping: true,
  defaultLinkStyle: 'bezier',
  gridPrimaryColor: '#334155',
  gridSecondaryColor: '#1e293b',
  canvasBackgroundColor: '#0f172a'
};
let currentAppearance: AppSettings['appearance'] = {};

/**
 * Initialize the toolbox config manager with an instanceId (REQUIRED).
 * MUST be called before any other toolbox-config functions.
 * Throws if instanceId is empty or missing.
 * v2.0.0 breaks backward compatibility: instanceId is now mandatory.
 */
export const initToolboxConfigManager = (instanceId: string): void => {
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error(
      'initToolboxConfigManager(instanceId) requires a non-empty instanceId. ' +
      'v2.0.0 breaks backward compatibility to enforce proper isolation.'
    )
  }
  const prefix = `${instanceId}:`
  STORAGE_KEY_CONFIG = `${prefix}atomos_toolbox_config`;
  STORAGE_KEY_SHAPES = `${prefix}atomos_custom_shapes`;
  STORAGE_KEY_GENERAL = `${prefix}atomos_general_settings`;
  STORAGE_KEY_APPEARANCE = `${prefix}atomos_appearance_settings`;

  // Reset in-memory state to defaults
  currentConfig = defaultToolboxConfig;
  currentShapes = JSON.parse(JSON.stringify(defaultShapes));
  currentGeneral = {
    gridSize: 20,
    enableSnapping: true,
    defaultLinkStyle: 'bezier',
    gridPrimaryColor: '#334155',
    gridSecondaryColor: '#1e293b',
    canvasBackgroundColor: '#0f172a'
  };
  currentAppearance = {};

  // Load from the new namespaced keys
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
    const storedAppearance = localStorage.getItem(STORAGE_KEY_APPEARANCE);
    if (storedAppearance) {
      currentAppearance = JSON.parse(storedAppearance);
    }
  } catch (e) {
    // Ignored
  }
};

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

export const setAppearanceSettings = function(appearance: AppSettings['appearance']): void {
  currentAppearance = appearance;
  try {
    localStorage.setItem(STORAGE_KEY_APPEARANCE, JSON.stringify(appearance));
  } catch (e) {}
};

export const getAppearanceSettings = function(): AppSettings['appearance'] {
  return currentAppearance;
};
