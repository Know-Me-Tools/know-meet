// TJ-ARCH-MOB-001 compliant
// km.js `copy()`: copy to the clipboard and confirm with a toast ("Copied", or the
// cause-then-fix fallback copy). Screens mount the kit `<Toaster>` once at their root.
import { toast } from "@know-meet/ui/components/toast";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ title: "Copied", type: "success" });
    return true;
  } catch {
    toast.add({ title: "Couldn’t copy — select and copy manually", type: "error" });
    return false;
  }
}
