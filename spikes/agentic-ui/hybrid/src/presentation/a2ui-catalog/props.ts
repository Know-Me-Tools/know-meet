/** Typed readers for resolved A2UI props (the generic binder hands components loose objects). */
import { createContext, use } from "react";

export type LooseProps = Readonly<Record<string, unknown>>;

export interface ChildRef {
  readonly id: string;
  readonly basePath?: string;
}

export function text(props: LooseProps, key: string): string {
  const v = props[key];
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

export function fn<T extends (...args: never[]) => unknown>(props: LooseProps, key: string): T | undefined {
  const v = props[key];
  return typeof v === "function" ? (v as T) : undefined;
}

export function strings(props: LooseProps, key: string): readonly string[] {
  const v = props[key];
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

export function childRef(value: unknown): ChildRef | null {
  if (typeof value === "string") return { id: value };
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>)["id"] === "string") {
    const rec = value as Record<string, unknown>;
    return typeof rec["basePath"] === "string" ? { id: rec["id"] as string, basePath: rec["basePath"] } : { id: rec["id"] as string };
  }
  return null;
}

export function childRefs(props: LooseProps, key: string): readonly ChildRef[] {
  const v = props[key];
  return Array.isArray(v) ? v.flatMap((c) => (childRef(c) === null ? [] : [childRef(c) as ChildRef])) : [];
}

/** Media origins the A2UI Image / Video / AudioPlayer may load from. */
export const A2uiMediaPolicy = createContext<readonly string[]>([]);

export function useAllowedOrigins(): readonly string[] {
  return use(A2uiMediaPolicy);
}
