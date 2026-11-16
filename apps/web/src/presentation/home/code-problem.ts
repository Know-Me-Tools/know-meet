// TJ-ARCH-MOB-001 compliant
// The room-code format check for typed codes (acceptance 7.1). The shape is the domain's
// `parseRoomCode`; this only picks the copy. `required` adds the empty-field message
// (submit only), so nothing is reported while the field is merely empty.
import { parseRoomCode } from "@know-meet/domain";
import { HOME_COPY } from "../guest-meeting/meeting-copy";

export function codeProblem(code: string, required: boolean): string {
  if (code === "") return required ? HOME_COPY.codeEmpty : "";
  return parseRoomCode(code) === null ? HOME_COPY.codeInvalid : "";
}
