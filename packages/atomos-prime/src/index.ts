export * from './core/index.js'
// Core
export type { ToolboxConfiguration, ToolboxItem, Toolset } from './types/toolbox.types.js'

// Base components
export { vbsElement, type VbsElementProps } from './base/vbs-element.js'
export { createVbsCanvas, type VbsCanvasProps } from './components/vbs-canvas.js'

// Atomic components
export { createAccordion, type AccordionProps, type AccordionResult } from './features/accordion/create-accordion.js'
export { createButton, type ButtonProps, type ButtonResult } from './features/button/create-button.js'
export { createCard, type CardProps, type CardResult } from './features/card/create-card.js'
export { createCheckbox, type CheckboxProps, type CheckboxResult } from './features/checkbox/create-checkbox.js'
export * from './features/dropdown/index.js'
export { createIcon, type IconName, type IconProps, type IconResult } from './features/icon/create-icon.js'
export { createInput, type InputProps, type InputResult } from './features/input/create-input.js'
export { createSkeleton, type SkeletonProps, type SkeletonResult } from './features/skeleton/create-skeleton.js'
export { createTextarea, type TextareaProps, type TextareaResult } from './features/textarea/create-textarea.js'
export { createTypography, type TypographyProps, type TypographyResult } from './features/typography/create-typography.js'

// Atom components (new)
export { createBadge } from './features/badge/create-badge.js'
export type { BadgeProps, BadgeResult, BadgeSize, BadgeVariant } from './features/badge/types/badge.types.js'
export { createCircularProgress } from './features/circular-progress/create-circular-progress.js'
export type { CircularProgressProps, CircularProgressResult } from './features/circular-progress/types/circular-progress.types.js'
export { createProgressBar } from './features/progress-bar/create-progress-bar.js'
export type { ProgressBarProps, ProgressBarResult } from './features/progress-bar/types/progress-bar.types.js'
export { createSpinner } from './features/spinner/create-spinner.js'
export type { SpinnerProps, SpinnerResult, SpinnerSize } from './features/spinner/types/spinner.types.js'
export { createToggle } from './features/toggle/create-toggle.js'
export type { ToggleProps, ToggleResult, ToggleSize } from './features/toggle/types/toggle.types.js'

// Layout / Pages

// Modular Features

// Date Picker
export {
    computeDaysGrid,
    computeMonthsGrid, computeRange, computeYearsGrid, createDateObject, createDatePicker, createDpDrawer,
    DateFormatsEnum,
    formatDate, getNextDate,
    getPreviousDate, MONTHS, parseDate, VbsDatePicker, WEEK_DAYS
} from './features/date-picker/index.js'
export type {
    DatePickerDisplayType, DatePickerGridModeType, DatePickerProps,
    DatePickerResult, DatePickerSelectionModeType, DpContext,
    DpDrawerOptions,
    DpDrawerResult, IDateObject,
    IDatePickerCell,
    IDatePickerRow
} from './features/date-picker/index.js'

// SVG components
export { createSvgLine, type SvgLineProps, type SvgLineResult } from './features/svg-line/create-svg-line.js'
export { createSvgRectangle, type SvgRectangleProps, type SvgRectangleResult } from './features/svg-rectangle/create-svg-rectangle.js'

// Molecule components

// Custom components from Gamify integration
export { createRangeSlider } from './features/slider/create-slider.js'
export type { RangeSliderProps, RangeSliderResult } from './features/slider/create-slider.js'
export { createTreeView } from './features/tree-view/create-tree-view.js'
export type { TreeItem, TreeViewProps, TreeViewResult } from './features/tree-view/create-tree-view.js'

export { createMenuBar } from './features/menu-bar/create-menu-bar.js'
export type { MenuBarProps, MenuBarResult, MenuDefinition, MenuItemDefinition } from './features/menu-bar/types/menu-bar.types.js'

// Edge and Anchor components
export { createAnchor, type AnchorProps, type AnchorResult } from './features/anchor/create-anchor.js'

// Preview system
export * from './components/tabs/index.js'
export { createPreviewPage } from './preview/create-preview-page.js'
export { createPreviewSection } from './preview/create-preview-section.js'

export * from './features/editable-label/create-editable-label.js'
export * from './features/formular/index.js'
export * from './features/stepper/index.js'

export * from './features/modal/atp-modal/atp-modal.js'
export * from './features/modal/create-atp-modal-footer.js'
export * from './features/modal/create-atp-modal-header.js'

