// TJ-ARCH-MOB-001 compliant
// Each prototype view sets `document.title` ("<view> · <page> · Know Meet"), so the
// browser tab and screen readers announce the current sub-state.
import { useEffect } from "react";

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
