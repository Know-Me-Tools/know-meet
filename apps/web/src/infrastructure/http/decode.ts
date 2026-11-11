// TJ-ARCH-MOB-001 compliant
import type { Capability, Note } from "@know-meet/domain";

/** Trust-boundary decoding for JSON from the BFF, the static registry and Tauri IPC. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNote(value: unknown): value is Note {
  return isRecord(value) && typeof value["id"] === "string" && typeof value["title"] === "string";
}

function isCapability(value: unknown): value is Capability {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    typeof value["kind"] === "string"
  );
}

export function decodeNote(value: unknown): Note {
  if (!isNote(value)) throw new Error("Unexpected note payload");
  return value;
}

export function decodeNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) throw new Error("Unexpected note list payload");
  return value.map(decodeNote);
}

export function decodeCapabilities(value: unknown): Capability[] {
  if (!Array.isArray(value) || !value.every(isCapability)) {
    throw new Error("Unexpected capability list payload");
  }
  return value;
}

/** The static registry at /capabilities/index.json (schema version 1). */
export function decodeCapabilityRegistry(value: unknown): Capability[] {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Unsupported capability registry schema");
  }
  return decodeCapabilities(value["capabilities"]);
}
