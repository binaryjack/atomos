export interface TreeItem {
    id: string;
    label: string;
    children?: TreeItem[];
    expanded?: boolean;
    checked?: boolean;
}

export interface TreeViewProps {
    items: TreeItem[];
    selectedId?: string | null;
    checkable?: boolean;
    onSelect?: (id: string) => void;
    onToggle?: (id: string, expanded: boolean) => void;
    onCheck?: (id: string, checked: boolean) => void;
}

export interface TreeViewResult {
    element: HTMLElement;
    updateItems: (items: TreeItem[]) => void;
    updateSelectedId: (id: string | null) => void;
    cleanup: { destroy: () => void };
}

export function createTreeView(props: TreeViewProps): TreeViewResult {
    const root = document.createElement('div');
    root.className = 'tree-view flex flex-col gap-1 w-full text-sm text-slate-300';
    
    let currentItems = props.items || [];
    let currentSelectedId = props.selectedId || null;

    const renderItems = (container: HTMLElement, items: TreeItem[], level: number = 0) => {
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'tree-item flex flex-col';
            
            const header = document.createElement('div');
            header.className = `tree-item-header flex items-center px-2 py-1 rounded cursor-pointer select-none hover:bg-slate-700/50 ${currentSelectedId === item.id ? 'bg-indigo-600/20 text-indigo-300' : ''}`;
            header.style.paddingLeft = `${level * 12 + 8}px`;
            
            if (props.checkable) {
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!item.checked;
                cb.title = 'Link for multi-edit';
                cb.className = 'mr-1.5 cursor-pointer flex-shrink-0 accent-indigo-500';
                cb.addEventListener('change', (e) => {
                    e.stopPropagation();
                    props.onCheck?.(item.id, (e.target as HTMLInputElement).checked);
                });
                cb.addEventListener('click', (e) => e.stopPropagation());
                header.appendChild(cb);
            }

            const chevronWrap = document.createElement('div');
            chevronWrap.className = 'w-4 h-4 flex items-center justify-center mr-1';
            
            if (item.children && item.children.length > 0) {
                const chevron = document.createElement('div');
                chevron.innerHTML = item.expanded ? '▼' : '▶';
                chevron.className = 'text-[10px] text-slate-500';
                chevronWrap.appendChild(chevron);
                
                chevronWrap.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (props.onToggle) props.onToggle(item.id, !item.expanded);
                });
            }
            
            const label = document.createElement('div');
            label.textContent = item.label;
            label.className = 'flex-1 truncate';
            
            header.appendChild(chevronWrap);
            header.appendChild(label);
            
            header.addEventListener('click', () => {
                if (props.onSelect && currentSelectedId !== item.id) {
                    props.onSelect(item.id);
                }
            });
            
            itemEl.appendChild(header);
            
            if (item.children && item.expanded) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';
                renderItems(childrenContainer, item.children, level + 1);
                itemEl.appendChild(childrenContainer);
            }
            
            container.appendChild(itemEl);
        });
    };

    const flushAndRender = () => {
        root.innerHTML = '';
        if (currentItems.length === 0) {
            root.innerHTML = '<div class="text-slate-500 text-xs italic px-2">No items to display</div>';
            return;
        }
        renderItems(root, currentItems, 0);
    };

    flushAndRender();

    return {
        element: root,
        updateItems: (newItems: TreeItem[]) => {
            currentItems = newItems;
            flushAndRender();
        },
        updateSelectedId: (newSelectedId: string | null) => {
            currentSelectedId = newSelectedId;
            flushAndRender();
        },
        cleanup: {
            destroy: () => {
                root.remove();
            }
        }
    };
}