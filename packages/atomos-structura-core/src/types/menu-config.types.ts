export interface MenuItemConfig<T = void> {
  /** Whether this toolbar item is exposed to the user. Defaults to true. */
  readonly available: boolean;
  /** Optional value override (e.g. initial zoom level for the `zoom` item). */
  readonly value?: T extends void ? never : T;
}

/**
 * Fine-grained availability + value config for every canvas toolbar item.
 * All entries are optional; omitting an entry means the item is available by default.
 */
export interface WorkspaceMenuConfig {
  /** Zoom level control (value = initial zoom, e.g. 1.5). */
  readonly zoom?: MenuItemConfig<number>;
  readonly zoom_in?: MenuItemConfig;
  readonly zoom_out?: MenuItemConfig;
  readonly center_on_screen?: MenuItemConfig;
  readonly fit_to_screen?: MenuItemConfig;
  readonly auto_layout?: MenuItemConfig;
  readonly optimize_connections?: MenuItemConfig;
  /** Single flag covering all export formats (DAG JSON, schema exports). */
  readonly export?: MenuItemConfig;
  readonly import?: MenuItemConfig;
  readonly save_workspace?: MenuItemConfig;
  readonly load_workspace?: MenuItemConfig;
  readonly export_svg?: MenuItemConfig;
}
