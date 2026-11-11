/** shadcn `cn` helper (copied pattern), taught the Know Meet font-size tokens so text-13 and text-on-ember don't collide. */
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["10", "11", "xs", "13", "sm", "15", "base", "lg", "22", "xl", "34", "2xl", "display", "display-brand", "stat"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
