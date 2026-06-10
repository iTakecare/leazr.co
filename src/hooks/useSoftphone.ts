import { useCallback, useEffect, useRef, useState } from "react";
import { Device } from "@twilio/voice-sdk";
import type { Call } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";

export type SoftphoneStatus =
  | "idle"
  | "connecting"
  | "ringing"
  | "in_call"
  | "ended"
  | "error";

interface UseSoftphoneResult {
  status: SoftphoneStatus;
  callDurationSec: number;
  isMuted: boolean;
  error: string | null;
  ready: boolean;
  call: (toE164: string, params?: Record<string, string>) => Promise<void>;
  hangup: () => void;
  toggleMute: () => boolean;
}

/**
 * Hook encapsulant le SDK Twilio Voice (softphone navigateur).
 * Le device n'est créé (lazy) que lorsque `enabled` passe à true.
 */
export function useSoftphone(enabled: boolean): UseSoftphoneResult {
  const [status, setStatus] = useState<SoftphoneStatus>("idle");
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setCallDurationSec(0);
    timerRef.current = setInterval(() => {
      setCallDurationSec((s) => s + 1);
    }, 1000);
  }, [clearTimer]);

  // Initialisation lazy du Device
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const init = async () => {
      try {
        setError(null);
        const { data, error: fnError } = await supabase.functions.invoke(
          "voice-token"
        );

        if (fnError) {
          // Lecture du corps d'erreur (statut 412 / 500…)
          let message = "Impossible de récupérer le jeton vocal";
          try {
            const ctx = (fnError as { context?: { json?: () => Promise<unknown> } })
              .context;
            const body = ctx?.json ? ((await ctx.json()) as Record<string, unknown>) : null;
            const code = body?.error ?? body?.code;
            if (code === "twilio_voice_not_configured") {
              message =
                "Softphone non configuré (Twilio Voice). Contactez l'administrateur.";
            } else if (typeof body?.message === "string") {
              message = body.message;
            }
          } catch {
            /* corps illisible */
          }
          if (!cancelled) {
            setError(message);
            setStatus("error");
          }
          return;
        }

        const token = (data as { token?: string } | null)?.token;
        if (!token) {
          if (!cancelled) {
            setError("Jeton vocal absent de la réponse");
            setStatus("error");
          }
          return;
        }

        if (cancelled) return;

        const device = new Device(token, {
          codecPreferences: ["opus", "pcmu"] as Call.Codec[],
        });

        // Les erreurs du Device ne sont FATALES que pendant un appel actif.
        // En arrière-plan (ex. enregistrement entrant non configuré → 31000),
        // on les ignore : les appels SORTANTS n'en ont pas besoin.
        device.on("error", (err: { message?: string; code?: number }) => {
          if (cancelled) return;
          if (callRef.current) {
            setError(err?.message ?? "Erreur du softphone");
            setStatus("error");
          } else {
            console.warn("[softphone] device error (non bloquant):", err?.code, err?.message);
          }
        });

        // Pas de device.register() : il ne sert qu'à RECEVOIR des appels et
        // peut échouer (31000) sans compte d'appels entrants. Pour APPELER,
        // device.connect() suffit. Le device est prêt dès sa création.
        deviceRef.current = device;
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg || "Erreur d'initialisation du softphone");
          setStatus("error");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimer();
      try {
        callRef.current?.disconnect();
      } catch {
        /* noop */
      }
      callRef.current = null;
      try {
        deviceRef.current?.destroy();
      } catch {
        /* noop */
      }
      deviceRef.current = null;
      setReady(false);
    };
  }, [enabled, clearTimer]);

  const bindCallEvents = useCallback(
    (twCall: Call) => {
      callRef.current = twCall;
      setIsMuted(false);

      twCall.on("accept", () => {
        setStatus("in_call");
        startTimer();
      });
      twCall.on("disconnect", () => {
        setStatus("ended");
        clearTimer();
        callRef.current = null;
      });
      twCall.on("cancel", () => {
        setStatus("ended");
        clearTimer();
        callRef.current = null;
      });
      twCall.on("reject", () => {
        setStatus("ended");
        clearTimer();
        callRef.current = null;
      });
      twCall.on("error", (err: { message?: string }) => {
        setError(err?.message ?? "Erreur pendant l'appel");
        setStatus("error");
        clearTimer();
        callRef.current = null;
      });
    },
    [startTimer, clearTimer]
  );

  const call = useCallback(
    async (toE164: string, params: Record<string, string> = {}) => {
      const device = deviceRef.current;
      if (!device) {
        setError("Softphone non prêt");
        setStatus("error");
        return;
      }
      try {
        setError(null);
        setStatus("connecting");
        const twCall = await device.connect({
          params: { To: toE164, ...params },
        });
        setStatus("ringing");
        bindCallEvents(twCall);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Cas micro non autorisé
        if (
          /permission|denied|notallowed|microphone|getusermedia/i.test(msg)
        ) {
          setError("Micro non autorisé");
        } else {
          setError(msg || "Échec de l'appel");
        }
        setStatus("error");
      }
    },
    [bindCallEvents]
  );

  const hangup = useCallback(() => {
    try {
      callRef.current?.disconnect();
      deviceRef.current?.disconnectAll();
    } catch {
      /* noop */
    }
    clearTimer();
    setStatus("ended");
    callRef.current = null;
  }, [clearTimer]);

  const toggleMute = useCallback((): boolean => {
    const twCall = callRef.current;
    if (!twCall) return false;
    const next = !twCall.isMuted();
    twCall.mute(next);
    setIsMuted(next);
    return next;
  }, []);

  return {
    status,
    callDurationSec,
    isMuted,
    error,
    ready,
    call,
    hangup,
    toggleMute,
  };
}

export default useSoftphone;
