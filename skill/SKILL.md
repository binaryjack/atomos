---
name: atomos-web
description: Sovereign reactive UI kernel, vector renderer, and interactive canvas engine.
---
<?xml version="1.0" encoding="UTF-8"?>
<codernic_skill id="atomos-web" kind="library" package="@atomos-web/structura" version="5.0.0">
  <mental_model>
    @atomos-web/structura is a sovereign Codernic infrastructure library component.
    It enforces complete implementations, Pirsig AST invariants, and strict boundary discipline.
    All consumers interact via deterministic SDK APIs or typed CLI wire envelopes.
  </mental_model>

  <cli_connector binary="atomos-structura">
    <subcommand name="audit" description="Audit architecture schema for anti-patterns and cycles with --json output" />
    <subcommand name="metrics" description="Compute topological and graph metrics with --json output" />
    <subcommand name="cycles" description="Detect circular dependency paths with --json output" />
    <subcommand name="version" description="Display version information with --json output" />
  </cli_connector>

  <sdk_surface>
    <typescript>
      <module name="@atomos-web/structura-core">
        <export symbol="auditArchitecture" kind="function" description="Audit architecture schema" />
        <export symbol="computeGraphMetrics" kind="function" description="Compute topological metrics" />
        <export symbol="findCycles" kind="function" description="Detect cycles" />
        <export symbol="applyArchitectureDiff" kind="function" description="Apply proposed diff" />
        <export symbol="createProposedDiff" kind="function" description="Create proposed diff" />
        <export symbol="makeInitialState" kind="function" description="Initialize workspace state" />
        <export symbol="executeStructuraCli" kind="function" description="Execute headless CLI" />
      </module>
    </typescript>
  </sdk_surface>

  <invariants>
    <invariant id="INV-001">Strict wire envelope: all CLI --json commands output SdkEnvelope with namespace '@atomos-web/structura'.</invariant>
    <invariant id="INV-002">Pirsig complexity: max 200 lines per file, max 40 lines per function, zero warnings.</invariant>
    <invariant id="INV-003">Zero vaporware: absolute production readiness and zero stubs.</invariant>
    <invariant id="INV-004">Zero MCP: all operations operate via native CLI --json or typed SDK envelopes.</invariant>
  </invariants>

  <verification>
    <step name="build">pnpm --filter @atomos-web/structura-core build</step>
    <step name="test">pnpm --filter @atomos-web/structura-core test</step>
    <step name="typecheck">pnpm exec tsc --noEmit</step>
    <step name="skill-verify">coc-pm skill verify skill/SKILL.md --json</step>
  </verification>
</codernic_skill>
