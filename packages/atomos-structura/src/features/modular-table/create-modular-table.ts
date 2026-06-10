import type { ModularTableProps, ModularTableResult, ColumnDef } from './types/modular-table.types.js';
import { applyFiltering } from './modular-table-filter.js';
import { applySorting } from './modular-table-sort.js';
import { renderCellContent } from './modular-table-cells.js';

export const createModularTable = function<T = any>(props: ModularTableProps<T>): ModularTableResult<T> {
  const cleanupFunctions: Array<() => void> = [];
  let currentColumns = [...props.columns];
  let rawData = [...props.data];
  let currentData = [...props.data];
  let currentFooterData = props.footerData ? [...props.footerData] : [];
  
  // Sorting State
  let sortColId: string | null = null;
  let sortAsc: boolean = true;

  // Filtering State
  const filters: Record<string, string> = {};

  const container = document.createElement('div');
  container.className = `w-full overflow-auto rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-md shadow-xl ${props.className || ''}`;

  const table = document.createElement('table');
  table.className = 'w-full text-sm text-left text-slate-300 border-collapse';

  const thead = document.createElement('thead');
  thead.className = 'text-xs uppercase bg-slate-800/80 text-slate-400 border-b border-slate-700/50 backdrop-blur-md';
  if (props.fixedHeader) {
    thead.classList.add('sticky', 'top-0', 'z-10');
  }

  const applyFiltersAndSort = () => {
    let result = applyFiltering(rawData, filters);
    result = applySorting(result, sortColId, sortAsc);

    currentData = result;
    renderHeader();
    renderRows();
  };

  const renderHeader = () => {
    thead.innerHTML = '';
    
    // Main Headers
    const headerRow = document.createElement('tr');
    currentColumns.forEach(col => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = 'px-6 py-4 font-semibold tracking-wider cursor-default align-top';
      if (col.width) th.style.width = col.width;

      const content = document.createElement('div');
      content.className = 'flex items-center gap-2 justify-between';
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = col.header;
      content.appendChild(titleSpan);

      if (col.sortable) {
        th.classList.add('hover:bg-slate-700/50', 'transition-colors', 'cursor-pointer', 'select-none');
        const sortIcon = document.createElement('span');
        sortIcon.className = 'text-slate-500 text-xs flex-shrink-0 transition-colors';
        
        if (sortColId === col.id) {
          sortIcon.textContent = sortAsc ? '▲' : '▼';
          sortIcon.classList.add('text-blue-400');
        } else {
          sortIcon.textContent = '↕';
          sortIcon.classList.add('opacity-50');
        }
        content.appendChild(sortIcon);

        th.onclick = () => {
          if (sortColId === col.id) {
            if (sortAsc) sortAsc = false;
            else { sortColId = null; sortAsc = true; }
          } else {
            sortColId = col.id;
            sortAsc = true;
          }
          applyFiltersAndSort();
        };
      }

      th.appendChild(content);
      
      // Filter row
      if (col.filterable) {
        const filterWrap = document.createElement('div');
        filterWrap.className = 'mt-3';
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Filter...';
        filterInput.className = 'w-full bg-slate-900/50 border border-slate-700/50 text-slate-200 text-xs px-3 py-1.5 rounded-md focus:ring-2 focus:ring-blue-500/50 focus:outline-none focus:border-blue-500 transition-all placeholder-slate-500';
        filterInput.value = filters[col.id] || '';
        
        filterInput.onclick = (e) => e.stopPropagation();
        filterInput.oninput = (e) => {
          const val = (e.target as HTMLInputElement).value;
          filters[col.id] = val;
          applyFiltersAndSort();
        };
        
        filterWrap.appendChild(filterInput);
        th.appendChild(filterWrap);
      }

      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
  };

  // Body
  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-slate-800/50';

  const renderRows = () => {
    tbody.innerHTML = '';

    if (currentData.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = currentColumns.length;
      emptyCell.className = 'px-6 py-12 text-center text-slate-500 italic';
      emptyCell.textContent = 'No data available';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      currentData.forEach((row, viewIndex) => {
        const tr = document.createElement('tr');
        tr.className = 'bg-transparent hover:bg-slate-800/30 transition-colors group';
        
        // Find original index for data mapping
        const rowIndex = rawData.indexOf(row);
        
        if (props.onRowClick) {
          tr.classList.add('cursor-pointer');
          tr.addEventListener('click', () => props.onRowClick!(row, rowIndex));
        }

        currentColumns.forEach(col => {
          const td = document.createElement('td');
          td.className = 'px-6 py-3 whitespace-nowrap text-slate-300 group-hover:text-slate-200 transition-colors';
          const cellValue = (row as any)[col.id];
          
          renderCellContent(
            td, col, cellValue, rowIndex, row, false, currentData, rawData, props.onDataChange, applyFiltersAndSort
          );
          
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    // Render fixed footers
    if (currentFooterData && currentFooterData.length > 0) {
      currentFooterData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.className = 'bg-slate-800/80 border-t-2 border-slate-700/80 font-semibold backdrop-blur-md';
        
        currentColumns.forEach(col => {
          const td = document.createElement('td');
          td.className = 'px-6 py-4 whitespace-nowrap text-blue-100';
          const cellValue = (row as any)[col.id];
          
          renderCellContent(
            td, col, cellValue, rowIndex, row, true, currentFooterData, rawData, props.onFooterDataChange
          );
          
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
  };

  applyFiltersAndSort();
  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);

  return {
    element: container,
    updateData: (newData: T[]) => {
      rawData = [...newData];
      applyFiltersAndSort();
    },
    updateColumns: (newColumns: ColumnDef<T>[]) => {
      currentColumns = [...newColumns];
      renderHeader();
      renderRows();
    },
    updateFooterData: (newFooterData: T[]) => {
      currentFooterData = [...newFooterData];
      renderRows();
    },
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};
