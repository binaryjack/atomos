import { createEntityContent, type EntityContentProps } from './create-entity-content.js';

export const createEntityDrawer = (
  entityId: string,
  elementBounds: DOMRect,
  props: EntityContentProps
) => {
  // Check if a drawer already exists for this entity and remove it
  const existingId = `vbs-drawer-${entityId}`;
  let drawer = document.getElementById(existingId);
  if (drawer) {
    drawer.remove();
  }

  drawer = document.createElement('div');
  drawer.id = existingId;
  
  // Base styles: fixed positioning, high z-index, animated
  drawer.style.cssText = [
    'position: fixed;',
    'width: 250px;',
    'height: auto;',
    'max-height: 400px;',
    'z-index: 999;',
    'opacity: 0;',
    'transform: scale(0.95);',
    'transition: opacity 0.2s ease-out, transform 0.2s ease-out;',
    'box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);',
    'border-radius: var(--vbs-radius, 2px);'
  ].join(' ');

  // Append overlay quickly to calculate geometry if needed, wrapper inside
  document.body.appendChild(drawer);

  // Position logic (Available Screen Area)
  const margin = 20;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const dw = 250;
  const dh = 300; // estimated max height

  let left = elementBounds.right + margin;
  let top = elementBounds.top;
  let tOrigin = 'top left';

  // If clipping right, move to left
  if (left + dw > screenW) {
    left = elementBounds.left - dw - margin;
    tOrigin = 'top right';
  }
  // If clipping left (unlikely if we just checked right, but safety check)
  if (left < margin) {
    left = margin;
  }

  // Vertical bounds check
  if (top + dh > screenH) {
    top = screenH - dh - margin;
    tOrigin = tOrigin.replace('top', 'bottom');
  }
  if (top < margin) {
    top = margin;
  }

  drawer.style.left = `${left}px`;
  drawer.style.top = `${top}px`;
  drawer.style.transformOrigin = tOrigin;

  // Modify the provided onDelete so it closes the drawer too
  const originalOnDelete = props.onDelete;
  const wrappedProps = {
    ...props,
    onDelete: (id: string) => {
      closeDrawer();
      originalOnDelete(id);
    },
    onHeightChange: (h: number) => {
      // Allow the drawer to expand natively with the properties
      if (drawer) {
        drawer.style.height = `${Math.min(h, 600)}px`;
      }
    }
  };

  // Create the standard "Box" entity content
  const boxContent = createEntityContent(wrappedProps);
  
  // Extract standard HTML body out of foreignObject since we are in HTML context now
  const boxHTML = boxContent.foreignObject.firstChild as HTMLElement;
  boxHTML.style.width = '100%';
  boxHTML.style.height = '100%';
  boxHTML.style.background = props.color || 'var(--vbs-bg-input, #09090b)';
  boxHTML.style.border = '1.5px solid var(--vbs-border, #27272a)';
  drawer.appendChild(boxHTML);

  // Animate In
  requestAnimationFrame(() => {
    if (drawer) {
      drawer.style.opacity = '1';
      drawer.style.transform = 'scale(1)';
    }
  });

  // Handle Clicking Outside to Close
  const closeDrawer = () => {
    if (drawer) {
      drawer.style.opacity = '0';
      drawer.style.transform = 'scale(0.95)';
      setTimeout(() => {
        boxContent.cleanup.destroy();
        drawer?.remove();
        document.removeEventListener('mousedown', handleOutsideClick);
      }, 200);
    }
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (drawer && !drawer.contains(e.target as Node)) {
      closeDrawer();
    }
  };

  // Delay attaching listener so the current click doesn't trigger it immediately
  setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideClick);
  }, 10);

  return {
    drawer,
    closeDrawer,
    updateContentHeight: (newH: number) => {
      drawer!.style.height = `${Math.min(newH, 400)}px`;
    }
  };
};