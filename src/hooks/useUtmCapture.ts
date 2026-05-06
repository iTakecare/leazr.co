import { useEffect } from "react";
import { captureAttribution } from "@/utils/utmAttribution";

/**
 * Capture UTM / fbclid params on mount and persist them to sessionStorage.
 *
 * Mount this near the root of public landing routes (catalog, slug pages, …).
 * It's safe to call multiple times — capture is idempotent and only overwrites
 * when a fresh campaign click arrives.
 */
export function useUtmCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
}
