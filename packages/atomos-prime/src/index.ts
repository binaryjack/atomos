// Core
export { createSignal } from './core/create-signal';
export { createComputed } from './core/create-computed';
export { createToggleable } from './core/create-toggleable.js';
export type { Toggleable, ToggleState } from './core/create-toggleable.js';
export { createKeyBindings } from './core/create-key-bindings.js';
export type { KeyBindings, KeyBindingHandlers } from './core/create-key-bindings.js';
export { createPortalRegistry } from './core/create-portal-registry.js';
export type { PortalRegistry } from './core/create-portal-registry.js';
export { getToolboxConfig, setToolboxConfig } from './core/adapters/toolbox-config-manager.js';
export { defaultToolboxConfig } from './core/default-toolbox.config.js';
export type { Signal, ComputedSignal } from './core/types/signal.types';
export type { ToolboxConfiguration, Toolset, ToolboxItem } from './types/toolbox.types.js';

export { getEntityManager, createEntityManager, type EntityManager } from './core/presentation/entity-manager.js';
export type { DomainEntity, DomainLink, EntityPosition, EntityDimensions } from './core/domain/entity-aggregate.js';
// Base components
export { vbsElement, type VbsElementProps } from './base/vbs-element';
export { createVbsCanvas, type VbsCanvasProps } from './components/vbs-canvas';

// Atomic components
export { createTypography, type TypographyProps, type TypographyResult } from './features/typography/create-typography';
export { createInput, type InputProps, type InputResult } from './features/input/create-input';
export { createButton, type ButtonProps, type ButtonResult } from './features/button/create-button';
export { createCheckbox, type CheckboxProps, type CheckboxResult } from './features/checkbox/create-checkbox';
export { createTextarea, type TextareaProps, type TextareaResult } from './features/textarea/create-textarea';
export { createSkeleton, type SkeletonProps, type SkeletonResult } from './features/skeleton/create-skeleton';
export * from './features/dropdown/index.js';
export { createCard, type CardProps, type CardResult } from './features/card/create-card';
export { createAccordion, type AccordionProps, type AccordionResult } from './features/accordion/create-accordion';
export { createIcon, type IconProps, type IconResult, type IconName } from './features/icon/create-icon';

// Atom components (new)
export { createBadge } from './features/badge/create-badge.js';
export type { BadgeProps, BadgeResult, BadgeVariant, BadgeSize } from './features/badge/types/badge.types.js';
export { createSpinner } from './features/spinner/create-spinner.js';
export type { SpinnerProps, SpinnerResult, SpinnerSize } from './features/spinner/types/spinner.types.js';
export { createToggle } from './features/toggle/create-toggle.js';
export type { ToggleProps, ToggleResult, ToggleSize } from './features/toggle/types/toggle.types.js';
export { createProgressBar } from './features/progress-bar/create-progress-bar.js';
export type { ProgressBarProps, ProgressBarResult } from './features/progress-bar/types/progress-bar.types.js';
export { createCircularProgress } from './features/circular-progress/create-circular-progress.js';
export type { CircularProgressProps, CircularProgressResult } from './features/circular-progress/types/circular-progress.types.js';

// Layout / Pages
export { createSettingsPage } from './features/settings-page/create-settings-page.js';
export type { SettingsPageProps, SettingsPageResult } from './features/settings-page/types/settings-page.types.js';

// Modular Features
export { createModularTable } from './features/modular-table/create-modular-table.js';
export type { ModularTableProps, ModularTableResult, ColumnDef } from './features/modular-table/types/modular-table.types.js';

// Date Picker
export {
  createDatePicker,
  VbsDatePicker,
  createDpDrawer,
  DateFormatsEnum,
  formatDate,
  parseDate,
  createDateObject,
  MONTHS,
  WEEK_DAYS,
  computeDaysGrid,
  computeMonthsGrid,
  computeYearsGrid,
  computeRange,
  getNextDate,
  getPreviousDate,
} from './features/date-picker/index.js';
export type {
  DatePickerProps,
  DatePickerResult,
  DatePickerGridModeType,
  DatePickerSelectionModeType,
  DatePickerDisplayType,
  IDateObject,
  IDatePickerCell,
  IDatePickerRow,
  DpContext,
  DpDrawerOptions,
  DpDrawerResult,
} from './features/date-picker/index.js';

// SVG components
export { createSvgRectangle, type SvgRectangleProps, type SvgRectangleResult } from './features/svg-rectangle/create-svg-rectangle';
export { createSvgLine, type SvgLineProps, type SvgLineResult } from './features/svg-line/create-svg-line';

// Molecule components
export { createEntityFrame, type EntityFrameProps, type EntityFrameResult } from './features/entity-frame/create-entity-frame';
export { createEntityWithEdges, type EntityWithEdgesProps, type EntityWithEdgesResult } from './features/entity-with-edges/create-entity-with-edges';

// Edge and Anchor components
export { createEdge, type EdgeProps, type EdgeResult } from './features/edge/create-edge';
export { createAnchor, type AnchorProps, type AnchorResult } from './features/anchor/create-anchor';

// Preview system
export { createPreviewPage } from './preview/create-preview-page';
export { createPreviewSection } from './preview/create-preview-section';export * from './components/tabs/index.js';

export * from './features/stepper/index.js';
