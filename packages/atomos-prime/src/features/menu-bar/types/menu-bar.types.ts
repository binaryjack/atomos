export type MenuItemType = 'action' | 'toggle' | 'separator'

export interface MenuItemDefinition {
  readonly label?: string
  readonly type: MenuItemType
  readonly action?: () => void
  readonly getChecked?: () => boolean
  readonly onToggle?: (checked: boolean) => void
  readonly shortcut?: string
  readonly disabled?: boolean
}

export interface MenuDefinition {
  readonly label: string
  readonly items: ReadonlyArray<MenuItemDefinition>
}

export interface MenuBarProps {
  readonly menus: ReadonlyArray<MenuDefinition>
  readonly className?: string
}

export interface MenuBarResult {
  readonly element: HTMLElement
  readonly cleanup: { destroy: () => void }
}
