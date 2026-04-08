import type { MenuBarProps, MenuBarResult, MenuItemDefinition } from './types/menu-bar.types.js'
export type { MenuBarProps, MenuBarResult, MenuItemDefinition }

const DROPDOWN_STYLE = 'position:absolute;top:100%;left:0;min-width:224px;background:#1e293b;border:1px solid #334155;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.6);z-index:9999;overflow:hidden;padding:4px 0;'
const ENTRY_BASE_STYLE = 'display:flex;align-items:center;padding:6px 14px;font-size:13px;color:#e2e8f0;gap:8px;cursor:pointer;transition:background .1s;user-select:none;'
const SHORTCUT_STYLE = 'font-size:11px;color:#475569;margin-left:auto;padding-left:16px;'
const CHECK_STYLE = 'width:14px;flex-shrink:0;color:#34d399;font-size:11px;text-align:center;'
const SPACER_STYLE = 'width:14px;flex-shrink:0;'

function buildDropdown(items: ReadonlyArray<MenuItemDefinition>, closeAll: () => void): HTMLElement {
    const dropdown = document.createElement('div')
    dropdown.style.cssText = DROPDOWN_STYLE

    for (const item of items) {
        if (item.type === 'separator') {
            const sep = document.createElement('div')
            sep.style.cssText = 'height:1px;background:#334155;margin:4px 0;'
            dropdown.appendChild(sep)
            continue
        }

        const entry = document.createElement('div')
        entry.style.cssText = ENTRY_BASE_STYLE

        if (item.disabled) {
            entry.style.opacity = '0.4'
            entry.style.cursor = 'not-allowed'
            entry.style.pointerEvents = 'none'
        } else {
            entry.addEventListener('mouseenter', () => { entry.style.background = 'rgba(255,255,255,.07)' })
            entry.addEventListener('mouseleave', () => { entry.style.background = 'transparent' })
        }

        if (item.type === 'toggle') {
            const check = document.createElement('span')
            check.style.cssText = CHECK_STYLE
            const refreshCheck = () => { check.textContent = item.getChecked?.() ? '✓' : '' }
            refreshCheck()

            const label = document.createElement('span')
            label.textContent = item.label ?? ''
            label.style.flex = '1'

            entry.appendChild(check)
            entry.appendChild(label)

            if (item.shortcut) {
                const sc = document.createElement('span')
                sc.style.cssText = SHORTCUT_STYLE
                sc.textContent = item.shortcut
                entry.appendChild(sc)
            }

            entry.addEventListener('click', () => {
                if (item.disabled) return
                const next = !(item.getChecked?.() ?? false)
                item.onToggle?.(next)
                refreshCheck()
            })
        } else {
            const spacer = document.createElement('span')
            spacer.style.cssText = SPACER_STYLE

            const label = document.createElement('span')
            label.style.flex = '1'
            label.textContent = item.label ?? ''

            entry.appendChild(spacer)
            entry.appendChild(label)

            if (item.shortcut) {
                const sc = document.createElement('span')
                sc.style.cssText = SHORTCUT_STYLE
                sc.textContent = item.shortcut
                entry.appendChild(sc)
            }

            entry.addEventListener('click', () => {
                if (item.disabled) return
                item.action?.()
                closeAll()
            })
        }

        dropdown.appendChild(entry)
    }

    return dropdown
}

export function createMenuBar(props: MenuBarProps): MenuBarResult {
    const cleanups: Array<() => void> = []

    const root = document.createElement('div')
    root.style.cssText = `display:flex;align-items:stretch;${props.className ?? ''}`

    let activeDropdown: HTMLElement | null = null
    let activeTrigger: HTMLElement | null = null

    const closeAll = () => {
        activeDropdown?.remove()
        activeDropdown = null
        if (activeTrigger) {
            activeTrigger.style.background = 'transparent'
            activeTrigger = null
        }
    }

    const outsideHandler = (e: MouseEvent) => {
        if (!root.contains(e.target as Node)) closeAll()
    }
    document.addEventListener('mousedown', outsideHandler)
    cleanups.push(() => document.removeEventListener('mousedown', outsideHandler))

    for (const menu of props.menus) {
        const menuWrapper = document.createElement('div')
        menuWrapper.style.cssText = 'position:relative;display:flex;align-items:stretch;'

        const trigger = document.createElement('button')
        trigger.type = 'button'
        trigger.style.cssText = 'background:transparent;border:none;color:#94a3b8;font-size:13px;padding:0 12px;height:100%;cursor:pointer;border-radius:3px;transition:color .15s,background .15s;white-space:nowrap;font-family:inherit;'
        trigger.textContent = menu.label

        trigger.addEventListener('mouseenter', () => {
            trigger.style.color = '#f1f5f9'
            if (activeDropdown && activeTrigger !== trigger) openMenu()
        })
        trigger.addEventListener('mouseleave', () => {
            if (activeTrigger !== trigger) trigger.style.color = '#94a3b8'
        })

        const openMenu = () => {
            closeAll()
            const dd = buildDropdown(menu.items, closeAll)
            menuWrapper.appendChild(dd)
            activeDropdown = dd
            activeTrigger = trigger
            trigger.style.background = 'rgba(255,255,255,.08)'
            trigger.style.color = '#f1f5f9'
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation()
            if (activeDropdown && activeTrigger === trigger) {
                closeAll()
            } else {
                openMenu()
            }
        })

        menuWrapper.appendChild(trigger)
        root.appendChild(menuWrapper)
    }

    return {
        element: root,
        cleanup: {
            destroy: () => {
                closeAll()
                cleanups.forEach(c => c())
            }
        }
    }
}
