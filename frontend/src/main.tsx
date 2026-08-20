import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { ReceiverApp } from "./ReceiverApp"; 
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found");
}

const path = window.location.pathname;

createRoot(root).render(
  <StrictMode>
    {path === "/receiver" ? <ReceiverApp /> : <App />}
  </StrictMode>,
);
