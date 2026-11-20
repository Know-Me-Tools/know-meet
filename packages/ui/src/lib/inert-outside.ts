// TJ-ARCH-MOB-001 compliant
// While a modal dialog is open, everything outside its portal is made `inert`, the
// HTML `<dialog>` showModal model. Base UI 1.9 only sets `aria-hidden` on outside
// nodes and keeps focus in with focus guards that hand focus back one animation frame
// later. A Shift+Tab inside that frame reached page controls behind the recording
// consent dialog, and the hidden-but-focusable nodes failed axe `aria-hidden-focus`
// (WC-13, 2026-11-20). Inert outside content cannot take focus or pointer input and is
// out of the accessibility tree, which is what aria-hidden promised.
//
// Body children are counted per caller, so overlapping dialogs restore only what they
// set, and a node that was already inert before any dialog opened is left alone.

const inertOwners = new Map<Element, number>();

/** Topmost body child that holds `popup` (its portal container), or null. */
function portalHost(popup: HTMLElement): Element | null {
  const body = popup.ownerDocument.body;
  let node: Element = popup;
  while (node.parentElement !== null && node.parentElement !== body) {
    node = node.parentElement;
  }
  return node.parentElement === body ? node : null;
}

/** Makes every other body child inert; returns the function that undoes exactly that. */
export function inertOutside(popup: HTMLElement): () => void {
  const host = portalHost(popup);
  if (host === null) return () => undefined;
  const taken = Array.from(popup.ownerDocument.body.children).filter(
    (node) =>
      node !== host &&
      !(node instanceof HTMLScriptElement) &&
      (inertOwners.has(node) || !node.hasAttribute("inert")),
  );
  for (const node of taken) {
    inertOwners.set(node, (inertOwners.get(node) ?? 0) + 1);
    node.setAttribute("inert", "");
  }
  return () => {
    for (const node of taken) {
      const remaining = (inertOwners.get(node) ?? 1) - 1;
      if (remaining > 0) {
        inertOwners.set(node, remaining);
      } else {
        inertOwners.delete(node);
        node.removeAttribute("inert");
      }
    }
  };
}
