import type { AppSettings, EntityStyleSettings, FontFamily, FontWeight, LinkStyleSettings } from './types/settings-page.types.js'
import { applyAppearanceTokens, DEFAULT_ENTITY_STYLE, DEFAULT_LINK_STYLE } from '../../core/presentation/design-system.js'

export interface AppearanceTabResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}

const FONT_FAMILIES: Array<{ value: FontFamily; label: string }> = [
  { value: 'sans-serif', label: 'Sans-serif (default)' },
  { value: 'system-ui', label: 'System UI' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'serif', label: 'Serif' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'Courier New, monospace', label: 'Courier New' },
]

const FONT_WEIGHTS: Array<{ value: FontWeight; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: '600', label: 'Semi-bold' },
  { value: 'bold', label: 'Bold' },
]

const inputClass = 'bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500'
const labelClass = 'text-sm font-medium text-slate-300'
const rowClass = 'flex flex-col gap-2'
const sectionTitleClass = 'text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3 mt-1'

const makeLabel = (text: string): HTMLLabelElement => {
  const el = document.createElement('label')
  el.className = labelClass
  el.textContent = text
  return el
}

const makeSelect = <T extends string>(
  options: Array<{ value: T; label: string }>,
  current: T,
  onChange: (v: T) => void
): HTMLSelectElement => {
  const sel = document.createElement('select')
  sel.className = `${inputClass} w-64`
  options.forEach(o => {
    const opt = document.createElement('option')
    opt.value = o.value
    opt.textContent = o.label
    if (o.value === current) opt.selected = true
    sel.appendChild(opt)
  })
  sel.addEventListener('change', () => onChange(sel.value as T))
  return sel
}

const makeNumberInput = (value: number, min: number, max: number, onChange: (v: number) => void): HTMLInputElement => {
  const inp = document.createElement('input')
  inp.type = 'number'
  inp.min = min.toString()
  inp.max = max.toString()
  inp.value = value.toString()
  inp.className = `${inputClass} w-24`
  inp.addEventListener('input', () => onChange(parseInt(inp.value, 10) || 0))
  return inp
}

const makeColorRow = (label: string, value: string, onChange: (v: string) => void): HTMLDivElement => {
  const row = document.createElement('div')
  row.className = rowClass
  row.appendChild(makeLabel(label))
  const wrap = document.createElement('div')
  wrap.className = 'flex gap-2 items-center max-w-xs'
  const picker = document.createElement('input')
  picker.type = 'color'
  picker.value = value.startsWith('#') ? value : '#a1a1aa'
  picker.className = 'w-10 h-10 p-0.5 rounded border border-slate-700 cursor-pointer bg-slate-950 appearance-none shrink-0'
  const text = document.createElement('input')
  text.type = 'text'
  text.value = value
  text.className = `${inputClass} w-full font-mono`
  const handle = (v: string) => {
    onChange(v)
    picker.value = v.startsWith('#') ? v : picker.value
    if (text.value !== v) text.value = v
  }
  picker.addEventListener('input', () => handle(picker.value))
  text.addEventListener('input', () => handle(text.value))
  wrap.appendChild(picker)
  wrap.appendChild(text)
  row.appendChild(wrap)
  return row
}

const makeSectionTitle = (text: string): HTMLParagraphElement => {
  const p = document.createElement('p')
  p.className = sectionTitleClass
  p.textContent = text
  return p
}

const makeDivider = (): HTMLHRElement => {
  const hr = document.createElement('hr')
  hr.className = 'border-slate-800 my-4'
  return hr
}

export const createAppearanceTab = (
  settings: AppSettings,
  onDirty: () => void
): AppearanceTabResult => {
  const entity: EntityStyleSettings = { ...DEFAULT_ENTITY_STYLE, ...settings.appearance?.entity }
  const link: LinkStyleSettings = { ...DEFAULT_LINK_STYLE, ...settings.appearance?.link }

  const ensureAppearance = () => {
    if (!settings.appearance) (settings as { appearance: AppSettings['appearance'] }).appearance = {}
  }

  const patchEntity = <K extends keyof EntityStyleSettings>(key: K, val: EntityStyleSettings[K]) => {
    entity[key] = val
    ensureAppearance()
    if (!settings.appearance!.entity) (settings.appearance as { entity: Partial<EntityStyleSettings> }).entity = {}
    ;(settings.appearance!.entity as Record<string, unknown>)[key] = val
    applyAppearanceTokens(settings.appearance?.entity, settings.appearance?.link)
    onDirty()
  }

  const patchLink = <K extends keyof LinkStyleSettings>(key: K, val: LinkStyleSettings[K]) => {
    link[key] = val
    ensureAppearance()
    if (!settings.appearance!.link) (settings.appearance as { link: Partial<LinkStyleSettings> }).link = {}
    ;(settings.appearance!.link as Record<string, unknown>)[key] = val
    applyAppearanceTokens(settings.appearance?.entity, settings.appearance?.link)
    onDirty()
  }

  const pane = document.createElement('div')
  pane.className = 'flex flex-col flex-1 p-6 w-full h-full overflow-y-auto gap-2'

  // Header
  const header = document.createElement('div')
  const title = document.createElement('h3')
  title.className = 'text-lg font-medium text-slate-200'
  title.textContent = 'Appearance'
  const desc = document.createElement('p')
  desc.className = 'text-slate-400 text-sm mt-1'
  desc.textContent = 'Customize fonts, colors, borders, and link styles. Changes apply live to the canvas.'
  header.appendChild(title)
  header.appendChild(desc)
  pane.appendChild(header)

  const form = document.createElement('div')
  form.className = 'flex flex-col max-w-2xl mt-4 gap-1'

  // ── Entity Name ──────────────────────────────────────────────
  form.appendChild(makeSectionTitle('Entity — Name Label'))

  const nameFontRow = document.createElement('div')
  nameFontRow.className = 'grid grid-cols-3 gap-4 items-end'

  const nameFontFamilyWrap = document.createElement('div')
  nameFontFamilyWrap.className = rowClass
  nameFontFamilyWrap.appendChild(makeLabel('Font'))
  nameFontFamilyWrap.appendChild(makeSelect(FONT_FAMILIES, entity.nameFontFamily, v => patchEntity('nameFontFamily', v)))

  const nameFontSizeWrap = document.createElement('div')
  nameFontSizeWrap.className = rowClass
  nameFontSizeWrap.appendChild(makeLabel('Size (px)'))
  nameFontSizeWrap.appendChild(makeNumberInput(entity.nameFontSize, 8, 48, v => patchEntity('nameFontSize', v)))

  const nameFontWeightWrap = document.createElement('div')
  nameFontWeightWrap.className = rowClass
  nameFontWeightWrap.appendChild(makeLabel('Weight'))
  nameFontWeightWrap.appendChild(makeSelect(FONT_WEIGHTS, entity.nameFontWeight, v => patchEntity('nameFontWeight', v)))

  nameFontRow.appendChild(nameFontFamilyWrap)
  nameFontRow.appendChild(nameFontSizeWrap)
  nameFontRow.appendChild(nameFontWeightWrap)
  form.appendChild(nameFontRow)

  form.appendChild(makeColorRow('Name Color', entity.nameColor.startsWith('var') ? '#f4f4f5' : entity.nameColor, v => patchEntity('nameColor', v)))

  const namePaddingWrap = document.createElement('div')
  namePaddingWrap.className = rowClass
  namePaddingWrap.appendChild(makeLabel('Vertical offset from center (px)'))
  namePaddingWrap.appendChild(makeNumberInput(entity.namePaddingY, -50, 50, v => patchEntity('namePaddingY', v)))
  form.appendChild(namePaddingWrap)

  form.appendChild(makeDivider())

  // ── Entity Properties ─────────────────────────────────────────
  form.appendChild(makeSectionTitle('Entity — Properties Label'))

  const propsFontRow = document.createElement('div')
  propsFontRow.className = 'grid grid-cols-3 gap-4 items-end'

  const propsFontFamilyWrap = document.createElement('div')
  propsFontFamilyWrap.className = rowClass
  propsFontFamilyWrap.appendChild(makeLabel('Font'))
  propsFontFamilyWrap.appendChild(makeSelect(FONT_FAMILIES, entity.propsFontFamily, v => patchEntity('propsFontFamily', v)))

  const propsFontSizeWrap = document.createElement('div')
  propsFontSizeWrap.className = rowClass
  propsFontSizeWrap.appendChild(makeLabel('Size (px)'))
  propsFontSizeWrap.appendChild(makeNumberInput(entity.propsFontSize, 6, 32, v => patchEntity('propsFontSize', v)))

  const propsFontWeightWrap = document.createElement('div')
  propsFontWeightWrap.className = rowClass
  propsFontWeightWrap.appendChild(makeLabel('Weight'))
  propsFontWeightWrap.appendChild(makeSelect(FONT_WEIGHTS, entity.propsFontWeight, v => patchEntity('propsFontWeight', v)))

  propsFontRow.appendChild(propsFontFamilyWrap)
  propsFontRow.appendChild(propsFontSizeWrap)
  propsFontRow.appendChild(propsFontWeightWrap)
  form.appendChild(propsFontRow)

  form.appendChild(makeColorRow('Properties Color', entity.propsColor.startsWith('var') ? '#a1a1aa' : entity.propsColor, v => patchEntity('propsColor', v)))

  const propsPaddingWrap = document.createElement('div')
  propsPaddingWrap.className = rowClass
  propsPaddingWrap.appendChild(makeLabel('Vertical offset from center (px)'))
  propsPaddingWrap.appendChild(makeNumberInput(entity.propsPaddingY, -50, 50, v => patchEntity('propsPaddingY', v)))
  form.appendChild(propsPaddingWrap)

  form.appendChild(makeDivider())

  // ── Shape Border ──────────────────────────────────────────────
  form.appendChild(makeSectionTitle('Entity — Shape Border'))

  const borderRow = document.createElement('div')
  borderRow.className = 'grid grid-cols-2 gap-4 items-end'

  const borderRadiusWrap = document.createElement('div')
  borderRadiusWrap.className = rowClass
  borderRadiusWrap.appendChild(makeLabel('Corner radius (px) — rect only'))
  borderRadiusWrap.appendChild(makeNumberInput(entity.borderRadius, 0, 40, v => patchEntity('borderRadius', v)))

  const borderWidthWrap = document.createElement('div')
  borderWidthWrap.className = rowClass
  borderWidthWrap.appendChild(makeLabel('Border thickness (px)'))
  borderWidthWrap.appendChild(makeNumberInput(entity.borderWidth, 0, 10, v => patchEntity('borderWidth', v)))

  borderRow.appendChild(borderRadiusWrap)
  borderRow.appendChild(borderWidthWrap)
  form.appendChild(borderRow)

  form.appendChild(makeDivider())

  // ── Link / Edge ───────────────────────────────────────────────
  form.appendChild(makeSectionTitle('Links / Edges'))

  const linkRow = document.createElement('div')
  linkRow.className = 'grid grid-cols-2 gap-4 items-end'

  const linkThickWrap = document.createElement('div')
  linkThickWrap.className = rowClass
  linkThickWrap.appendChild(makeLabel('Line thickness (px)'))
  linkThickWrap.appendChild(makeNumberInput(link.thickness, 1, 10, v => patchLink('thickness', v)))

  const linkSelThickWrap = document.createElement('div')
  linkSelThickWrap.className = rowClass
  linkSelThickWrap.appendChild(makeLabel('Selected thickness (px)'))
  linkSelThickWrap.appendChild(makeNumberInput(link.selectedThickness, 1, 12, v => patchLink('selectedThickness', v)))

  linkRow.appendChild(linkThickWrap)
  linkRow.appendChild(linkSelThickWrap)
  form.appendChild(linkRow)

  form.appendChild(makeColorRow('Line color', link.color, v => patchLink('color', v)))
  form.appendChild(makeColorRow('Selected color', link.selectedColor, v => patchLink('selectedColor', v)))

  form.appendChild(makeDivider())

  // ── Reset All ─────────────────────────────────────────────────
  const resetBtn = document.createElement('button')
  resetBtn.type = 'button'
  resetBtn.className = 'self-start mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-medium transition-colors border border-slate-700 hover:border-slate-500'
  resetBtn.textContent = 'Reset to defaults'
  resetBtn.addEventListener('click', () => {
    ensureAppearance()
    settings.appearance!.entity = { ...DEFAULT_ENTITY_STYLE }
    settings.appearance!.link = { ...DEFAULT_LINK_STYLE }
    applyAppearanceTokens(settings.appearance!.entity, settings.appearance!.link)
    onDirty()
    // Reload pane by forcing re-render from settings page
    pane.dispatchEvent(new CustomEvent('appearance-reset', { bubbles: true }))
  })
  form.appendChild(resetBtn)

  pane.appendChild(form)

  return {
    element: pane,
    cleanup: { destroy: () => {} }
  }
}
