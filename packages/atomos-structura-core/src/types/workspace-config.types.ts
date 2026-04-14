export interface WorkspaceConfig {
  /** Suppress all UI panels (settings page, schema panel, toolbar settings button). */
  readonly headless?: boolean;
  /**
   * When false a session is locked to a single schema.
   * createSchema / MCP create-schema are rejected once one schema exists.
   */
  readonly allow_multiple_schemas?: boolean;
}
