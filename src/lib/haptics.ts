/**
 * Retour haptique — no-op silencieux sur le web.
 *
 * Import dynamique du plugin pour ne pas alourdir le bundle web : le code
 * n'est chargé que sur appareil, et une erreur ne casse jamais l'interaction.
 */

type Intensity = "light" | "medium" | "heavy";

let isNative: boolean | null = null;

async function nativeAvailable(): Promise<boolean> {
  if (isNative !== null) return isNative;
  try {
    const { Capacitor } = await import("@capacitor/core");
    isNative = Capacitor.isNativePlatform();
  } catch {
    isNative = false;
  }
  return isNative;
}

/** Petit choc sec — navigation, sélection d'un onglet, bascule d'un switch. */
export async function tap(intensity: Intensity = "light"): Promise<void> {
  if (!(await nativeAvailable())) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const style =
      intensity === "heavy"
        ? ImpactStyle.Heavy
        : intensity === "medium"
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    await Haptics.impact({ style });
  } catch {
    /* haptique indisponible : sans conséquence */
  }
}

/** Confirmation d'une action réussie — offre envoyée, contrat signé. */
export async function success(): Promise<void> {
  if (!(await nativeAvailable())) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* haptique indisponible : sans conséquence */
  }
}

/** Signalement d'un échec — validation refusée, erreur réseau. */
export async function error(): Promise<void> {
  if (!(await nativeAvailable())) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    /* haptique indisponible : sans conséquence */
  }
}

export const haptics = { tap, success, error };
