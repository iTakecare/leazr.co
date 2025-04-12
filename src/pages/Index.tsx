import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HeroSection } from "./screens/HeroSection";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <HeroSection />
  </StrictMode>,
);