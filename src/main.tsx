import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

// Polyfill for SpeechRecognition if not available (doesn't provide functionality but prevents errors)
if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
  // @ts-ignore - Mock class so the app doesn't crash
  window.SpeechRecognition = class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = '';
    onresult = () => {};
    onend = () => {};
    onerror = () => {};
    start() { console.log('SpeechRecognition not supported in this browser'); }
    stop() {}
    abort() {}
  };
  // @ts-ignore - Alias
  window.webkitSpeechRecognition = window.SpeechRecognition;
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Do not mirror API key in localStorage anymore when running in Electron.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
);
