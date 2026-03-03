import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent blank screens from transient DOM reconciliation errors (e.g. Radix portals during HMR)
window.addEventListener("unhandledrejection", (event) => {
  if (event.reason?.message?.includes("removeChild")) {
    event.preventDefault();
    console.warn("Suppressed transient removeChild error");
  }
});

createRoot(document.getElementById("root")!).render(<App />);
