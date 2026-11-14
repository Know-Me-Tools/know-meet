// TJ-ARCH-MOB-001 compliant
// theme-behaviour.md "Switching": in dark it shows a sun, is named "Switch to light
// theme" and titled "Light theme"; in light a moon, "Switch to dark theme",
// "Dark theme". The tooltip repeats the title for pointer users (toast style).
import { Button } from "@know-meet/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@know-meet/ui/components/tooltip";
import { useTheme } from "../use-theme";
import { KmIcon } from "./km-icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const title = next === "light" ? "Light theme" : "Dark theme";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            data-testid="km-theme-toggle"
            aria-label={`Switch to ${next} theme`}
            onClick={toggleTheme}
          />
        }
      >
        <KmIcon name={theme === "dark" ? "sun" : "moon"} className="size-5" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{title}</TooltipContent>
    </Tooltip>
  );
}
