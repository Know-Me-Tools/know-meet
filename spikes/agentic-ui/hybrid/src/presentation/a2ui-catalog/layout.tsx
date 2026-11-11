/** A2UI layout components (Column, Row, Card, List, Divider, Tabs, Modal) and the unknown fallback. */
import { useId, useState, type ReactNode } from "react";
import type { ReactA2uiComponentProps } from "@a2ui/react";
import { childRef, childRefs, text, type LooseProps } from "./props.ts";

export type A2uiProps = ReactA2uiComponentProps<LooseProps>;

function idOf(p: A2uiProps): string {
  return p.context.componentModel.id;
}

function renderChild(p: A2uiProps, key: string): ReactNode {
  const ref = childRef(p.props[key]);
  return ref === null ? null : p.buildChild(ref.id, ref.basePath);
}

function renderChildren(p: A2uiProps): ReactNode {
  return childRefs(p.props, "children").map((c) => <ChildSlot key={`${c.basePath ?? ""}/${c.id}`}>{p.buildChild(c.id, c.basePath)}</ChildSlot>);
}

function ChildSlot({ children }: { readonly children: ReactNode }) {
  return <>{children}</>;
}

export function Column(p: A2uiProps) {
  return <div data-a2ui-id={idOf(p)} className="flex min-w-0 flex-col gap-s2">{renderChildren(p)}</div>;
}

export function Row(p: A2uiProps) {
  return <div data-a2ui-id={idOf(p)} className="flex min-w-0 flex-row flex-wrap items-start gap-s2">{renderChildren(p)}</div>;
}

export function Card(p: A2uiProps) {
  return <div data-a2ui-id={idOf(p)} className="rounded-base bg-card p-s4">{renderChild(p, "child")}</div>;
}

export function Divider(p: A2uiProps) {
  return <hr data-a2ui-id={idOf(p)} className="my-s2 h-px border-0 bg-muted" />;
}

/** Template instances are marked so the probe can report the template host, not every stamped row. */
export function List(p: A2uiProps) {
  return (
    <div data-a2ui-id={idOf(p)} className="flex flex-col gap-s1" role="list">
      {childRefs(p.props, "children").map((c) => (
        <div key={`${c.basePath ?? ""}/${c.id}`} role="listitem" data-a2ui-template-item={c.basePath === undefined ? undefined : ""}>
          {p.buildChild(c.id, c.basePath)}
        </div>
      ))}
    </div>
  );
}

interface TabSpec {
  readonly title: string;
  readonly child: string;
}

function tabsOf(props: LooseProps): readonly TabSpec[] {
  const v = props["tabs"];
  if (!Array.isArray(v)) return [];
  return v.flatMap((t) => {
    const rec = typeof t === "object" && t !== null ? (t as LooseProps) : null;
    const ref = childRef(rec?.["child"]);
    return rec === null || ref === null ? [] : [{ title: text(rec, "title"), child: ref.id }];
  });
}

export function Tabs(p: A2uiProps) {
  const [active, setActive] = useState(0);
  const base = useId();
  const tabs = tabsOf(p.props);
  const current = tabs[active];
  return (
    <div data-a2ui-id={idOf(p)} className="flex flex-col gap-s3">
      <div role="tablist" className="flex gap-s1">
        {tabs.map((t, i) => (
          <button
            key={t.title + String(i)}
            type="button"
            role="tab"
            id={`${base}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${base}-panel`}
            onClick={() => setActive(i)}
            className={`rounded-8 px-s3 py-s1 text-sm font-medium ${i === active ? "bg-muted text-fg" : "text-fg-sub hover:bg-card-hov"}`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${active}`}>
        {current === undefined ? null : p.buildChild(current.child)}
      </div>
    </div>
  );
}

export function Modal(p: A2uiProps) {
  const [open, setOpen] = useState(false);
  return (
    <div data-a2ui-id={idOf(p)}>
      <div onClickCapture={() => setOpen(true)}>{renderChild(p, "trigger")}</div>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Details" className="mt-s2 rounded-base bg-surface p-s4 shadow-[var(--shadow-float)]">
          {renderChild(p, "content")}
          <button type="button" onClick={() => setOpen(false)} className="mt-s3 rounded-8 bg-card px-s3 py-s1 text-sm text-fg">
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function KmFallback(p: A2uiProps) {
  const original = text(p.props, "originalType");
  return (
    <div data-a2ui-id={idOf(p)} data-a2ui-fallback="" role="note" className="rounded-8 bg-muted px-s3 py-s2 text-13 text-fg-sub">
      Unsupported component{original === "" ? "" : `: ${original}`}
    </div>
  );
}
