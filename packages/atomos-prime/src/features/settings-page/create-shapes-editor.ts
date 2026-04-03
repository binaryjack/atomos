import { createButton } from '../button/create-button.js'
import type { CustomShape } from './types/settings-page.types.js'

export interface ShapesEditorProps {
  readonly shapes: CustomShape[];
  readonly onChange: (newShapes: CustomShape[]) => void;
}

export const createShapesEditor = function(props: ShapesEditorProps) {
  let activeShapes = [...props.shapes];
  const container = document.createElement('div');
  container.className = 'w-full h-full flex-1 overflow-y-auto flex flex-col gap-4 p-6 bg-slate-900';

  const notifyChange = () => {
    props.onChange([...activeShapes]);
  };

  const renderList = () => {
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between shrink-0';
    
    const titleObj = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'text-lg font-medium text-slate-200';
    title.textContent = 'Custom Shapes';
    const subTitle = document.createElement('p');
    subTitle.className = 'text-sm text-slate-400 mt-1';
    subTitle.textContent = 'Define SVG shapes to be used in the visual toolbox.';
    titleObj.appendChild(title);
    titleObj.appendChild(subTitle);
    header.appendChild(titleObj);

    const addBtn = createButton({ children: 'Add Shape', variant: 'primary', size: 'sm' });
    addBtn.element.addEventListener('click', () => {
      const newId = `shape-${Date.now()}`;
      activeShapes.push({ id: newId, name: 'New Shape', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>' });
      notifyChange();
      renderList();
    });
    header.appendChild(addBtn.element);
    container.appendChild(header);

    const listContainer = document.createElement('div');
    listContainer.className = 'flex flex-col gap-4 mt-2 flex-1 min-h-0';

    if (activeShapes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-sm text-slate-500 italic p-8 text-center border border-dashed border-slate-700 rounded-lg';
      empty.textContent = 'No custom shapes defined. Click "Add Shape" to create one.';
      listContainer.appendChild(empty);
    }

    activeShapes.forEach((shape, index) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'flex flex-col gap-3 p-5 bg-slate-950 border border-slate-800 rounded-lg shadow-sm';

      const topRow = document.createElement('div');
      topRow.className = 'flex gap-4 items-end';

      const idWrap = document.createElement('div');
      idWrap.className = 'flex flex-col gap-1.5 w-1/3';
      const idLabel = document.createElement('label');
      idLabel.className = 'text-xs text-slate-400 font-medium uppercase tracking-wider';
      idLabel.textContent = 'ID (Internal)';
      const idInput = document.createElement('input');
      idInput.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-purple-500 font-mono';
      idInput.value = shape.id;
      idInput.addEventListener('input', (e) => {
        shape.id = (e.target as HTMLInputElement).value;
        notifyChange();
      });
      idWrap.appendChild(idLabel);
      idWrap.appendChild(idInput);

      const nameWrap = document.createElement('div');
      nameWrap.className = 'flex flex-col gap-1.5 flex-1';
      const nameLabel = document.createElement('label');
      nameLabel.className = 'text-xs text-slate-400 font-medium uppercase tracking-wider';
      nameLabel.textContent = 'Display Name';
      const nameInput = document.createElement('input');
      nameInput.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-purple-500';
      nameInput.value = shape.name;
      nameInput.addEventListener('input', (e) => {
        shape.name = (e.target as HTMLInputElement).value;
        notifyChange();
      });
      nameWrap.appendChild(nameLabel);
      nameWrap.appendChild(nameInput);

      const delBtn = createButton({ children: 'Delete', variant: 'ghost', size: 'sm' });
      delBtn.element.className += ' text-red-500 hover:text-red-400 hover:bg-red-900/20 mb-1';
      delBtn.element.addEventListener('click', () => {
        activeShapes.splice(index, 1);
        notifyChange();
        renderList();
      });

      topRow.appendChild(idWrap);
      topRow.appendChild(nameWrap);
      topRow.appendChild(delBtn.element);

      const svgWrap = document.createElement('div');
      svgWrap.className = 'flex flex-col gap-1.5 mt-2';
      const svgLabel = document.createElement('label');
      svgLabel.className = 'text-xs text-slate-400 font-medium flex justify-between uppercase tracking-wider';
      svgLabel.innerHTML = '<span>SVG Markup</span><span class="text-slate-500 normal-case tracking-normal">e.g. &lt;svg viewBox="0 0 24 24"&gt;...</span>';
      
      const svgInput = document.createElement('textarea');
      svgInput.className = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-purple-500 font-mono resize-y min-h-[120px] whitespace-pre';
      svgInput.value = shape.svg;
      svgInput.spellcheck = false;
      svgInput.addEventListener('input', (e) => {
        shape.svg = (e.target as HTMLTextAreaElement).value;
        notifyChange();
      });
      svgWrap.appendChild(svgLabel);
      svgWrap.appendChild(svgInput);

      itemRow.appendChild(topRow);
      itemRow.appendChild(svgWrap);
      listContainer.appendChild(itemRow);
    });

    container.appendChild(listContainer);
  };

  renderList();

  return {
    element: container,
    updateState: (newShapes: CustomShape[]) => {
      activeShapes = [...newShapes];
      renderList();
    }
  };
};
