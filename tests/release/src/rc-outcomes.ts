import { registerFileOutcomeCases } from "./rc-outcomes-file.ts";
import { registerRoomOutcomeCases } from "./rc-outcomes-room.ts";

/** B4 fixture registration for adopted RC-3 and RC-4. */
export function registerOutcomeCases(): void {
  registerRoomOutcomeCases();
  registerFileOutcomeCases();
}
