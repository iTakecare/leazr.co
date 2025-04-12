
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HeroSection } from "../screens/HeroSection";

const Index = () => {
  return (
    <StrictMode>
      <HeroSection />
    </StrictMode>
  );
};

// This function is used when directly mounting this file
if (document.getElementById("app")) {
  createRoot(document.getElementById("app") as HTMLElement).render(<Index />);
}

export default Index;
