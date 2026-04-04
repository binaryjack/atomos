import { badgeDoc } from './components/badge.doc.js'
import { buttonDoc } from './components/button.doc.js'
import { checkboxDoc } from './components/checkbox.doc.js'
import { circularProgressDoc } from './components/circular-progress.doc.js'
import { iconDoc } from './components/icon.doc.js'
import { inputDoc } from './components/input.doc.js'
import { progressBarDoc } from './components/progress-bar.doc.js'
import { skeletonDoc } from './components/skeleton.doc.js'
import { spinnerDoc } from './components/spinner.doc.js'
import { themeBuilderDoc } from './components/theme-builder.doc.js'
import { toggleDoc } from './components/toggle.doc.js'
import { typographyDoc } from './components/typography.doc.js'
import { textareaDoc } from './components/textarea.doc.js'
import { cardDoc } from './components/card.doc.js'
import { accordionDoc } from './components/accordion.doc.js'
import { dropdownDoc } from './components/dropdown.doc.js'
import { editableLabelDoc } from './components/editable-label.doc.js'

export const COMPONENT_REGISTRY = [
  themeBuilderDoc,
  accordionDoc,
  badgeDoc,
  buttonDoc,
  cardDoc,
  checkboxDoc,
  circularProgressDoc,
  dropdownDoc,
  editableLabelDoc,
  iconDoc,
  inputDoc,
  progressBarDoc,
  skeletonDoc,
  spinnerDoc,
  textareaDoc,
  toggleDoc,
  typographyDoc
];

export const getDocById = (id: string) => {
  return COMPONENT_REGISTRY.find(doc => doc.id === id);
};