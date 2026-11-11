/**
 * Build-time replacement for `rehype-raw` (vite.config.ts alias, gate 16.5).
 * Streamdown imports rehype-raw for its default rehype chain; O never uses that
 * chain, so this stub keeps the HTML parser (hast-util-raw, parse5) out of the
 * bundle. If anything ever enables it, raw nodes are dropped instead of parsed.
 */
interface HastNode {
  readonly type: string;
  children?: HastNode[];
}

function dropRaw(node: HastNode): void {
  if (node.children === undefined) return;
  node.children = node.children.filter((child) => child.type !== "raw");
  for (const child of node.children) dropRaw(child);
}

export default function rehypeRawDisabled(): (tree: HastNode) => void {
  return dropRaw;
}
