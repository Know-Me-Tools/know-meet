/**
 * Lenient reading of an AG-UI RunAgentInput as sent by @ag-ui/client 1.0.4
 * HttpAgent (POST, JSON body, Accept: text/event-stream) or by a prototype's
 * own fetch. The body is validated with @ag-ui/core RunAgentInputSchema and
 * problems are logged, but the run is still served so the checks can see them.
 *
 * A2UI actions: read from `forwardedProps.a2uiAction.userAction` (what
 * @assistant-ui/react-ag-ui 0.1.2 sends), falling back to
 * `forwardedProps.a2uiAction` itself and to an A2UI v1.0 envelope `{ action: {...} }`.
 */
import { RunAgentInputSchema } from "@ag-ui/core/schemas";
import { isRecord } from "./http-util.ts";
import type { LoggedA2uiAction, LoggedResumeEntry } from "./session-log.ts";

export interface ParsedRunInput {
  readonly threadId: string | null;
  readonly runId: string | null;
  readonly valid: boolean | null;
  readonly problems: readonly string[];
  readonly lastUserText: string | null;
  readonly resume: readonly LoggedResumeEntry[];
  readonly a2uiAction: LoggedA2uiAction | null;
}

const EMPTY: ParsedRunInput = { threadId: null, runId: null, valid: null, problems: [], lastUserText: null, resume: [], a2uiAction: null };

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function textOf(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts = content.filter(isRecord).map((p) => (p["type"] === "text" && typeof p["text"] === "string" ? p["text"] : ""));
  return parts.join("");
}

function lastUserText(messages: unknown): string | null {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m: unknown = messages[i];
    if (isRecord(m) && m["role"] === "user") return textOf(m["content"]);
  }
  return null;
}

function resumeEntries(raw: unknown): LoggedResumeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).flatMap((entry): LoggedResumeEntry[] => {
    const interruptId = str(entry["interruptId"]);
    const status = entry["status"];
    if (interruptId === null || (status !== "resolved" && status !== "cancelled")) return [];
    const payload = entry["payload"];
    const approved = isRecord(payload) && typeof payload["approved"] === "boolean" ? payload["approved"] : undefined;
    return [approved === undefined ? { interruptId, status } : { interruptId, status, approved }];
  });
}

function a2uiAction(forwardedProps: unknown): LoggedA2uiAction | null {
  if (!isRecord(forwardedProps)) return null;
  const outer = forwardedProps["a2uiAction"];
  if (!isRecord(outer)) return null;
  const candidates = [outer["userAction"], outer["action"], outer];
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const body = isRecord(candidate["action"]) ? candidate["action"] : candidate;
    const name = str(body["name"]);
    if (name === null) continue;
    const surfaceId = str(body["surfaceId"]);
    const sourceComponentId = str(body["sourceComponentId"]);
    return {
      name,
      ...(surfaceId === null ? {} : { surfaceId }),
      ...(sourceComponentId === null ? {} : { sourceComponentId }),
      ...(body["context"] === undefined ? {} : { context: body["context"] }),
    };
  }
  return null;
}

export function parseRunInput(body: unknown): ParsedRunInput {
  if (body === undefined) return EMPTY;
  if (!isRecord(body)) return { ...EMPTY, valid: false, problems: ["body is not a JSON object"] };
  const result = RunAgentInputSchema.safeParse(body);
  const problems = result.success ? [] : result.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  return {
    threadId: str(body["threadId"]),
    runId: str(body["runId"]),
    valid: result.success,
    problems,
    lastUserText: lastUserText(body["messages"]),
    resume: resumeEntries(body["resume"]),
    a2uiAction: a2uiAction(body["forwardedProps"]),
  };
}
