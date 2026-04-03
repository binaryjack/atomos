export interface ColumnDef<T = any> {
  id: string;
  header: string;
  type: 'text' | 'number' | 'boolean' | 'enum' | 'custom';
  width?: string;
  editable?: boolean;
  options?: string[]; // for enum
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (value: any, row: T, index: number) => HTMLElement; // custom rendering
}

export interface ModularTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  footerData?: T[]; // fixed rows at the bottom (e.g., sums, weights)
  onDataChange?: (newData: T[]) => void;
  onFooterDataChange?: (newFooterData: T[]) => void;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  fixedHeader?: boolean;
}

export interface ModularTableResult<T = any> {
  element: HTMLElement;
  updateData: (newData: T[]) => void;
  updateFooterData: (newFooterData: T[]) => void;
  updateColumns: (newColumns: ColumnDef<T>[]) => void;
  cleanup: { destroy: () => void };
}
