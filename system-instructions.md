# VBS Schema Builder - System Instructions

## CORE PRINCIPLES
- **TypeScript-first**: Strict mode, zero `any` types
- **Ultra-high standards**: 95% test coverage minimum
- **Functional constructors**: No class declarations allowed
- **One item per file**: Clean, modular structure
- **kebab-case naming**: Consistent throughout
- **Declarative patterns**: React-like declarative code

## ARCHITECTURE PATTERNS

### Web Components (W3C/WHATWG Best Practices)
While `CLASS=forbidden` is a general rule, native Web Components (`HTMLElement`) are a specific exception designed by W3C to use ES6 classes. When building Web Components, adhere strictly to these enterprise standards:
1. **Template Instantiation (Performance)**: Never use `innerHTML` inside a constructor. Define a static `<template>` outside the class and use `.cloneNode(true)` to avoid browser re-parsing per instance.
2. **Attribute & Property Reflection**: Always provide JavaScript `get` and `set` properties that perfectly synchronize with DOM `this.hasAttribute()` and `this.setAttribute()`.
3. **Accessibility & Focus Trapping**: Modals and interactive overlays must trap the `Tab` key, properly manage `aria-*` tags, and restore focus to the previously active element upon closing. 

### Constructor Functions
```typescript
export const entityName = function(this: EntityProps, props: EntityProps) {
  Object.defineProperty(this, 'property', { 
    value: props.property, 
    enumerable: false, 
    writable: false 
  });
  return this;
};
```

### File Organization
- `*.types.ts` - Type definitions
- `entity.ts` - Constructor implementation  
- `create-entity.ts` - Factory functions
- `index.ts` - Public exports

### Package Structure
- **vbs-mod**: Core models and types
- **vbs-style**: Tailwind CSS theme
- **web-ui**: Reusable web components
- **vbs-mcp**: MCP server for AI tools
- **vbs**: Main schema builder application

## FORBIDDEN PATTERNS
- `class` declarations
- `useImperativeHandle`
- `any` types
- `camelCase` in file names
- Verbose code
- Constructor functions without `this` typing

## QUALITY REQUIREMENTS
- 95% minimum test coverage
- Zero TypeScript errors
- Performance target: <=10% of solid-js
- All checks must pass: tsc, eslint, jest