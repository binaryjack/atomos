export interface PortalRegistry {
  readonly registerSlot: (name: string, target: HTMLElement) => void;
  readonly fillSlot:     (name: string, content: HTMLElement) => void;
  readonly clearSlot:    (name: string) => void;
}

export const createPortalRegistry = function(): PortalRegistry {
  const slots   = new Map<string, HTMLElement>();
  const pending = new Map<string, HTMLElement>();

  const registerSlot = (name: string, target: HTMLElement): void => {
    slots.set(name, target);
    const queued = pending.get(name);
    if (queued) { target.appendChild(queued); pending.delete(name); }
  };

  const fillSlot = (name: string, content: HTMLElement): void => {
    const target = slots.get(name);
    if (target) { target.innerHTML = ''; target.appendChild(content); }
    else         { pending.set(name, content); }
  };

  const clearSlot = (name: string): void => {
    slots.get(name)?.replaceChildren();
    pending.delete(name);
  };

  return { registerSlot, fillSlot, clearSlot };
};
