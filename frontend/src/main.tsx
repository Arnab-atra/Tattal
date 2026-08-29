// ============================================================
// main.tsx
//
// The application entry point that:
// - Mounts the React application
// - Wraps the app with StrictMode for development checks
// - Sets up React Router for client-side routing
// - Imports global styles
// ============================================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

// ============================================================
// MOUNT APPLICATION
// ============================================================

/**
 * Create the root element and render the app
 *
 * StrictMode helps identify potential problems in development
 * BrowserRouter enables client-side routing
 */
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Check your index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
