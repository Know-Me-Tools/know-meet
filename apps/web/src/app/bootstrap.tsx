// TJ-ARCH-MOB-001 compliant
import { createRoot } from "react-dom/client";
import { AppRoot } from "./app-root";
import { composeApp } from "./composition-root";
import { StartupFailure } from "./route-fallbacks";
import { createAppRouter } from "./router";

export async function bootstrap(view: Window): Promise<void> {
  const container = view.document.getElementById("root");
  if (container === null) throw new Error("Missing application root #root");
  const root = createRoot(container);
  try {
    const services = await composeApp(view);
    root.render(<AppRoot services={services} router={createAppRouter()} />);
  } catch (error) {
    reportError(error);
    root.render(<StartupFailure />);
  }
}
