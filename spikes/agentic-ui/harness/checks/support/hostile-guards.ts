/**
 * Page-level traps for the hostile corpus: dialogs, main-frame navigations and
 * requests to any origin other than the prototype and the mock server.
 */
import type { Dialog, Frame, Page, Request } from "@playwright/test";

export interface GuardReport {
  readonly dialogs: readonly string[];
  readonly navigations: readonly string[];
  readonly disallowedRequests: readonly string[];
}

const ALWAYS_ALLOWED_SCHEMES = new Set(["data:", "blob:", "about:"]);

export class HostileGuards {
  private readonly dialogs: string[] = [];
  private readonly navigations: string[] = [];
  private readonly disallowed: string[] = [];
  private readonly allowedOrigins: ReadonlySet<string>;
  private armed = false;

  constructor(page: Page, allowedOrigins: readonly string[]) {
    this.allowedOrigins = new Set(allowedOrigins);
    page.on("dialog", (dialog: Dialog) => {
      this.dialogs.push(`${dialog.type()}: ${dialog.message()}`);
      dialog.dismiss().catch(() => undefined);
    });
    page.on("framenavigated", (frame: Frame) => {
      if (this.armed && frame === page.mainFrame()) this.navigations.push(frame.url());
    });
    page.on("request", (request: Request) => {
      const url = new URL(request.url());
      if (ALWAYS_ALLOWED_SCHEMES.has(url.protocol) || this.allowedOrigins.has(url.origin)) return;
      this.disallowed.push(`${request.resourceType()} ${request.url()}`);
    });
  }

  /** Call after the prototype finished loading; later main-frame navigations are failures. */
  arm(): void {
    this.armed = true;
  }

  report(): GuardReport {
    return { dialogs: [...this.dialogs], navigations: [...this.navigations], disallowedRequests: [...this.disallowed] };
  }
}

/** Every element inside `root` carrying an on* attribute, as "tag[attr]". */
export async function eventHandlerAttributes(page: Page, rootSelector: string): Promise<string[]> {
  return page.evaluate((selector: string) => {
    const root = document.querySelector(selector);
    if (root === null) return ["<transcript missing>"];
    const found: string[] = [];
    for (const el of [root, ...root.querySelectorAll("*")]) {
      for (const attr of el.getAttributeNames()) {
        if (attr.toLowerCase().startsWith("on")) found.push(`${el.tagName.toLowerCase()}[${attr}]`);
      }
    }
    return found;
  }, rootSelector);
}
