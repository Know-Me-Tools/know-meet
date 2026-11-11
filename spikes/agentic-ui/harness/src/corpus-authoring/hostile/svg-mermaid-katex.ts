/** Hostile corpus: raw SVG, Mermaid (fence and km.mermaid) and KaTeX. */
import type { HostileItem } from "../../domain/hostile.ts";
import { KM_CUSTOM } from "../../domain/versions.ts";

const md = (markdown: string) => ({ kind: "markdown" as const, markdown, chunking: "lines" as const });
const fence = (lang: string, body: string) => "```" + lang + "\n" + body + "\n```";

export const SVG_MERMAID_KATEX_ITEMS: readonly HostileItem[] = [
  {
    id: "svg-fence-script",
    category: "raw-svg",
    title: "```svg fence containing <script>",
    delivery: md(fence("svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\"><script>__kmXss('svg-fence-script')</script><circle cx=\"20\" cy=\"20\" r=\"10\"/></svg>")),
    expectedOutcome: "Shown as a code block, or rendered through a sanitizer (DOMPurify SVG profile) with the script removed.",
    assert: { forbiddenSelectors: ["svg script"] },
  },
  {
    id: "svg-foreign-object",
    category: "raw-svg",
    title: "SVG foreignObject smuggling HTML",
    delivery: md(fence("svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"><foreignObject width=\"100\" height=\"50\"><img xmlns=\"http://www.w3.org/1999/xhtml\" src=\"x\" onerror=\"__kmXss('svg-foreign-object')\"/><iframe xmlns=\"http://www.w3.org/1999/xhtml\" src=\"{{EVIL_ORIGIN}}/beacon/fo-iframe\"></iframe></foreignObject></svg>")),
    expectedOutcome: "No foreignObject from content survives (or it survives without img/iframe); nothing executes; no evil request.",
    assert: { forbiddenSelectors: ["foreignObject img", "foreignObject iframe"] },
  },
  {
    id: "svg-external-refs",
    category: "raw-svg",
    title: "SVG <image> and <use> pointing at the evil origin",
    delivery: md(fence("svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><image href=\"{{EVIL_ORIGIN}}/beacon/svg-image.png\" width=\"10\" height=\"10\"/><use xlink:href=\"{{EVIL_ORIGIN}}/sprite.svg#icon\"/></svg>")),
    expectedOutcome: "External references are stripped; the evil origin receives zero requests.",
    assert: {},
  },
  {
    id: "svg-anchor-and-animate",
    category: "raw-svg",
    title: "SVG <a xlink:href=javascript:> and <animate> setting href",
    delivery: md(fence("svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><a xlink:href=\"javascript:__kmXss('svg-anchor-and-animate')\"><text x=\"0\" y=\"15\">click</text></a><a><animate attributeName=\"href\" to=\"javascript:__kmXss('svg-anchor-and-animate')\"/><text y=\"30\">x</text></a></svg>")),
    expectedOutcome: "No javascript: href and no animate/set element targeting href.",
    assert: { forbiddenSelectors: ["animate[attributeName='href']", "set[attributeName='href']"] },
  },
  {
    id: "mermaid-html-label",
    category: "mermaid",
    title: "Mermaid node label with HTML injection",
    delivery: md(fence("mermaid", "graph TD\n  A[\"<img src=x onerror=__kmXss('mermaid-html-label')>Label\"] --> B[Next]")),
    expectedOutcome: "Diagram renders (securityLevel strict); the label HTML is escaped or stripped; nothing executes.",
    assert: { requiredSelectors: [{ selector: "svg", minCount: 1 }] },
  },
  {
    id: "mermaid-click-javascript",
    category: "mermaid",
    title: "Mermaid click directive with javascript: href and callback",
    delivery: md(fence("mermaid", "graph LR\n  A[Start] --> B[End]\n  click A href \"javascript:__kmXss('mermaid-click-javascript')\"\n  click B call __kmXss(\"mermaid-click-javascript\")")),
    expectedOutcome: "Click bindings are ignored; no javascript: href and no onclick on any node.",
    assert: {},
  },
  {
    id: "mermaid-init-loose",
    category: "mermaid",
    title: "Mermaid %%init%% directive trying to set securityLevel loose",
    delivery: md(fence("mermaid", "%%{init: {\"securityLevel\": \"loose\", \"startOnLoad\": true}}%%\ngraph TD\n  A[One] --> B[Two]\n  click A href \"javascript:__kmXss('mermaid-init-loose')\"")),
    expectedOutcome: "The directive cannot lower securityLevel; still no javascript: href.",
    assert: {},
  },
  {
    id: "mermaid-syntax-error",
    category: "mermaid",
    title: "Mermaid syntax error",
    delivery: md(fence("mermaid", "graph TD\n  A -->> -- ((( broken")),
    expectedOutcome: "A contained error or the source as code; the rest of the transcript keeps working; no global mermaid error SVG appended to <body>.",
    assert: {},
  },
  {
    id: "mermaid-custom-chunk",
    category: "mermaid",
    title: "km.mermaid CUSTOM chunk with injected label and click",
    delivery: {
      kind: "custom",
      markdown: "The decision flow is attached.",
      name: KM_CUSTOM.mermaid,
      value: {
        messageId: "msg-hostile-1",
        diagramId: "dia-hostile",
        source: "graph TD\n  A[\"<iframe src={{EVIL_ORIGIN}}/beacon/mermaid-iframe></iframe>\"] --> B\n  click B href \"javascript:__kmXss('mermaid-custom-chunk')\"",
      },
    },
    expectedOutcome: "Same rules as the markdown fence: no iframe, no javascript: href, no evil request.",
    assert: { forbiddenSelectors: ["iframe"] },
  },
  {
    id: "katex-valid",
    category: "katex",
    title: "Valid inline and display math (control)",
    delivery: md("Inline $E = mc^2$ and display:\n\n$$\n\\int_0^1 x^2\\,dx = \\tfrac{1}{3}\n$$"),
    expectedOutcome: "KaTeX renders both (elements with class katex).",
    assert: { requiredSelectors: [{ selector: ".katex", minCount: 2 }] },
  },
  {
    id: "katex-href-javascript",
    category: "katex",
    title: "KaTeX \\href with javascript: and \\url",
    delivery: md("$\\href{javascript:__kmXss('katex-href-javascript')}{\\text{click}}$ and $\\url{javascript:__kmXss('katex-href-javascript')}$"),
    expectedOutcome: "KaTeX trust is off: rendered as an error/plain text, never an anchor with javascript: href.",
    assert: {},
  },
  {
    id: "katex-html-extensions",
    category: "katex",
    title: "KaTeX \\htmlData / \\includegraphics to evil origin",
    delivery: md("$\\htmlData{onclick=__kmXss('katex-html-extensions')}{x}$ $\\includegraphics{{{EVIL_ORIGIN}}/beacon/katex.png}$"),
    expectedOutcome: "Untrusted commands are refused; no evil request; no on* attributes.",
    assert: {},
  },
  {
    id: "katex-macro-bomb",
    category: "katex",
    title: "KaTeX macro expansion bomb",
    delivery: md("$\\def\\a{\\b\\b\\b\\b\\b\\b\\b\\b}\\def\\b{\\c\\c\\c\\c\\c\\c\\c\\c}\\def\\c{\\d\\d\\d\\d\\d\\d\\d\\d}\\def\\d{xxxxxxxx}\\a\\a\\a\\a$"),
    expectedOutcome: "KaTeX maxExpand stops it with an error; the UI stays responsive (message completes within budget).",
    assert: { finalizeWithinMs: 3000 },
  },
];
