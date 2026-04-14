# Link Restoration Infinite Loop Fix

## Problem
The canvas page was experiencing infinite loops caused by a fundamental design violation in the link restoration system. When restoring saved links from localStorage/Redux:

1. `workspace.restoreLink()` would call `linkFinalizer.finalizeLinkToAnchor()`
2. The link finalizer would treat restored links the same as new user-created links
3. This triggered `onLinkCreated` persistence callbacks
4. The callbacks would try to save the "new" link back to storage
5. This would update schema signals and trigger more restoration
6. **Result**: Infinite loop on page load

## Root Cause
**Missing Command-Query Separation**: The system did not distinguish between:
- **Commands** (user actions creating new links) - should trigger persistence  
- **Queries** (restoration of existing links) - should NOT trigger persistence

## Solution
The `finalizeLinkToAnchor` function already had proper Command-Query Separation design with an `isRestoration` parameter, but `restoreLink()` in the workspace manager was not using it.

**Fix Applied**: Added the missing `isRestoration=true` parameter in workspace manager:

```typescript
// Before (BROKEN):
restoreLink: (...) => {
  linkFinalizer.finalizeLinkToAnchor(
    dstAnchorId, dstPos, dstEntityId, dstEdge,
    srcAnchorId, srcEntityId, srcEdge, srcPos
    // Missing isRestoration parameter!
  );
}

// After (FIXED):  
restoreLink: (...) => {
  linkFinalizer.finalizeLinkToAnchor(
    dstAnchorId, dstPos, dstEntityId, dstEdge,
    srcAnchorId, srcEntityId, srcEdge, srcPos,
    true  // isRestoration flag prevents persistence callbacks
  );
}
```

## Design Pattern
This fix implements proper **Command-Query Separation**:

- **Restoration** (Query): `isRestoration=true` → Visual link created, no persistence callbacks
- **User Actions** (Command): `isRestoration=false/undefined` → Visual link + persistence callbacks

## Tests
Created comprehensive tests in `canvas-infinite-loop-fix.test.ts` to verify:

1. ✅ **Command-Query Separation**: Restoration doesn't trigger persistence callbacks
2. ✅ **User Actions Still Work**: New links still get persisted correctly  
3. ✅ **Design Pattern Verification**: The fix follows established patterns

## Result
- ✅ Canvas page loads without infinite loops
- ✅ Existing links are restored visually  
- ✅ New user links still get saved properly
- ✅ No performance degradation
- ✅ Proper separation of concerns maintained

This is **NOT a band-aid fix** - it's using the existing, properly designed Command-Query Separation pattern that was already implemented but not consistently used.