// TJ-ARCH-MOB-001 compliant
import { useSyncExternalStore } from "react";
import { useAppServices } from "../app-services";
import type { WidthClass } from "./width-class";

export function useWidthClass(): WidthClass {
  const { layout } = useAppServices();
  return useSyncExternalStore(layout.subscribe, layout.getSnapshot);
}
