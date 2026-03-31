export interface KeyBindingHandlers {
  readonly onArrowUp?:    (e: KeyboardEvent) => void;
  readonly onArrowDown?:  (e: KeyboardEvent) => void;
  readonly onArrowLeft?:  (e: KeyboardEvent) => void;
  readonly onArrowRight?: (e: KeyboardEvent) => void;
  readonly onEnter?:      (e: KeyboardEvent) => void;
  readonly onEscape?:     (e: KeyboardEvent) => void;
  readonly onDelete?:     (e: KeyboardEvent) => void;
  readonly onBackspace?:  (e: KeyboardEvent) => void;
  readonly onTab?:        (e: KeyboardEvent) => void;
  readonly onSpace?:      (e: KeyboardEvent) => void;
}

export interface KeyBindings {
  readonly handleKeyDown: (e: KeyboardEvent) => void;
  readonly attach:        (el: HTMLElement) => () => void;
}

export const createKeyBindings = function(handlers: KeyBindingHandlers): KeyBindings {
  const handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowUp':    handlers.onArrowUp?.(e);    break;
      case 'ArrowDown':  handlers.onArrowDown?.(e);  break;
      case 'ArrowLeft':  handlers.onArrowLeft?.(e);  break;
      case 'ArrowRight': handlers.onArrowRight?.(e); break;
      case 'Enter':      handlers.onEnter?.(e);      break;
      case 'Escape':     handlers.onEscape?.(e);     break;
      case 'Delete':     handlers.onDelete?.(e);     break;
      case 'Backspace':  handlers.onBackspace?.(e);  break;
      case 'Tab':        handlers.onTab?.(e);        break;
      case ' ':          handlers.onSpace?.(e);      break;
    }
  };

  const attach = (el: HTMLElement): (() => void) => {
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  };

  return { handleKeyDown, attach };
};
