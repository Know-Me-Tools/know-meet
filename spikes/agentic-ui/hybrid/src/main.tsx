/** Entry: compose services, install `window.__spike` before the first render, mount React. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { compose } from "./composition.ts";
import "./styles.css";

const app = compose(window.location.search);
window.__spike = app.probe;

const container = document.getElementById("root");
if (container === null) throw new Error("#root is missing from index.html");
createRoot(container).render(
  <StrictMode>
    <App app={app} />
  </StrictMode>,
);
