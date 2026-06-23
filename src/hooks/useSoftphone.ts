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

export interface IncomingInfo {
  from: string;
  params: Record<string, string>;
}

interface UseSoftphoneOptions {
  /** true sur la console : enregistre le device pour RECEVOIR les appels. */
  receiveIncoming?: boolean;
}

interface UseSoftphoneResult {
  status: SoftphoneStatus;
  callDurationSec: number;
  isMuted: boolean;
  error: string | null;
  ready: boolean;
  identity: string | null;
  incoming: IncomingInfo | null;
  call: (toE164: string, params?: Record<string, string>) => Promise<void>;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
  hangup: () => void;
  toggleMute: () => boolean;
}

/**
 * Hook encapsulant le SDK Twilio Voice (softphone navigateur).
 * Appels sortants (toujours) + entrants (si receiveIncoming).
 */
// Traduit les codes d'erreur du SDK Twilio Voice en messages actionnables (FR).
// Surtout le 31005 « Error sent from gateway in HANGUP » : la passerelle a
// raccroché, presque toujours un souci TwiML / caller ID côté config Twilio.
function twilioErrorMessage(err: { message?: string; code?: number }): string {
  const code = err?.code;
  switch (code) {
    case 31005:
      return "Twilio a raccroché l'appel (31005). Cause probable : numéro d'appel sortant (caller ID) non configuré ou TwiML App mal réglée. Vérifiez la config Twilio.";
    case 31003:
      return "Connexion impossible (31003). Vérifiez votre réseau (WebRTC) ou réessayez.";
    case 31000:
    case 31009:
      return "Transport de signalisation Twilio interrompu. Réessayez dans un instant.";
    default:
      return `${err?.message ?? "Erreur pendant l'appel"}${code ? ` (${code})` : ""}`;
  }
}

export function useSoftphone(enabled: boolean, opts: UseSoftphoneOptions = {}): UseSoftphoneResult {
  const { receiveIncoming = false } = opts;
  const [status, setStatus] = useState<SoftphoneStatus>("idle");
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<IncomingInfo | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const incomingCallRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // true dès qu'un appel se met en place (connecting) OU est actif : une
  // erreur du Device pendant cette fenêtre est alors visible (sinon silence).
  const activeRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setCallDurationSec(0);
    timerRef.current = setInterval(() => setCallDurationSec((s) => s + 1), 1000);
  }, [clearTimer]);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  const bindCallEvents = useCallback((twCall: Call) => {
    callRef.current = twCall;
    activeRef.current = true;
    setIsMuted(false);
    twCall.on("ringing", () => setStatus("ringing"));
    twCall.on("accept", () => { clearWatchdog(); setStatus("in_call"); startTimer(); });
    const ended = () => { clearWatchdog(); setStatus("ended"); clearTimer(); callRef.current = null; activeRef.current = false; };
    twCall.on("disconnect", ended);
    twCall.on("cancel", ended);
    twCall.on("reject", ended);
    twCall.on("error", (err: { message?: string; code?: number }) => {
      clearWatchdog();
      setError(twilioErrorMessage(err));
      setStatus("error"); clearTimer(); callRef.current = null; activeRef.current = false;
    });
  }, [startTimer, clearTimer, clearWatchdog]);

  // Initialisation lazy du Device
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const init = async () => {
      try {
        setError(null);
        const { data, error: fnError } = await supabase.functions.invoke("voice-token");
        if (fnError) {
          let message = "Impossible de récupérer le jeton vocal";
          try {
            const ctx = (fnError as { context?: { json?: () => Promise<unknown> } }).context;
            const body = ctx?.json ? ((await ctx.json()) as Record<string, unknown>) : null;
            if ((body?.error ?? body?.code) === "twilio_voice_not_configured") {
              message = "Softphone non configuré (Twilio Voice). Contactez l'administrateur.";
            } else if (typeof body?.message === "string") message = body.message;
          } catch { /* */ }
          if (!cancelled) { setError(message); setStatus("error"); }
          return;
        }
        const token = (data as { token?: string; identity?: string } | null)?.token;
        const id = (data as { identity?: string } | null)?.identity ?? null;
        if (!token) { if (!cancelled) { setError("Jeton vocal absent"); setStatus("error"); } return; }
        if (cancelled) return;

        const device = new Device(token, { codecPreferences: ["opus", "pcmu"] as Call.Codec[] });

        // Erreurs visibles pendant la mise en place ou un appel actif ; sinon
        // (bruit de fond du Device) seulement loguées.
        device.on("error", (err: { message?: string; code?: number }) => {
          if (cancelled) return;
          if (activeRef.current) {
            clearWatchdog();
            setError(twilioErrorMessage(err));
            setStatus("error");
          } else {
            console.warn("[softphone] device error (non bloquant):", err?.code, err?.message);
          }
        });

        // Appels entrants (console uniquement).
        if (receiveIncoming) {
          device.on("incoming", (twCall: Call) => {
            if (cancelled) return;
            incomingCallRef.current = twCall;
            const p = twCall.customParameters;
            const params: Record<string, string> = {};
            if (p && typeof (p as Map<string, string>).forEach === "function") {
              (p as Map<string, string>).forEach((v, k) => { params[k] = v; });
            }
            setIncoming({ from: params.from ?? twCall.parameters?.From ?? "Inconnu", params });
            const clear = () => { setIncoming(null); incomingCallRef.current = null; };
            twCall.on("cancel", clear);
            twCall.on("disconnect", clear);
            twCall.on("reject", clear);
          });
        }

        deviceRef.current = device;
        setIdentity(id);
        // register() établit le transport de signalisation Twilio (nécessaire
        // aussi pour APPELER) et permet de recevoir. Best-effort : on n'échoue
        // pas l'init, mais on attend qu'il aboutisse avant de marquer prêt.
        try {
          await device.register();
        } catch (e) {
          console.warn("[softphone] register:", e);
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur d'initialisation du softphone");
          setStatus("error");
        }
      }
    };
    init();

    return () => {
      cancelled = true;
      clearTimer();
      clearWatchdog();
      activeRef.current = false;
      try { callRef.current?.disconnect(); } catch { /* */ }
      try { incomingCallRef.current?.reject(); } catch { /* */ }
      callRef.current = null; incomingCallRef.current = null;
      try { deviceRef.current?.destroy(); } catch { /* */ }
      deviceRef.current = null;
      setReady(false);
    };
  }, [enabled, receiveIncoming, clearTimer]);

  const call = useCallback(async (toE164: string, params: Record<string, string> = {}) => {
    const device = deviceRef.current;
    if (!device) { setError("Softphone non prêt"); setStatus("error"); return; }

    // 1) Pré-vol micro : provoque la demande d'autorisation et échoue VITE
    //    si le micro est refusé/indisponible (sinon device.connect peut
    //    rester bloqué sur « Connexion… »).
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      setError(
        /NotAllowed|Security/i.test(name)
          ? "Micro refusé. Autorisez le microphone pour ce site (icône 🔒 dans la barre d'adresse), puis réessayez."
          : "Micro indisponible. Vérifiez qu'un micro est branché et autorisé.",
      );
      setStatus("error");
      return;
    }

    try {
      setError(null);
      setStatus("connecting");
      activeRef.current = true;
      // 2) Watchdog : si rien ne bouge en 25 s, on débloque avec un message.
      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        if (activeRef.current) {
          setError("Délai de connexion dépassé. Vérifiez votre réseau (le service vocal utilise WebRTC) ou réessayez.");
          setStatus("error");
          activeRef.current = false;
          try { callRef.current?.disconnect(); } catch { /* */ }
        }
      }, 25000);

      const twCall = await device.connect({ params: { To: toE164, ...params } });
      bindCallEvents(twCall);
      setStatus((s) => (s === "connecting" ? "ringing" : s));
    } catch (e) {
      clearWatchdog();
      activeRef.current = false;
      const msg = e instanceof Error ? e.message : String(e);
      setError(/permission|denied|notallowed|microphone|getusermedia/i.test(msg) ? "Micro non autorisé" : (msg || "Échec de l'appel"));
      setStatus("error");
    }
  }, [bindCallEvents, clearWatchdog]);

  const acceptIncoming = useCallback(() => {
    const twCall = incomingCallRef.current;
    if (!twCall) return;
    setIncoming(null);
    setStatus("connecting");
    bindCallEvents(twCall);
    twCall.accept();
    incomingCallRef.current = null;
  }, [bindCallEvents]);

  const rejectIncoming = useCallback(() => {
    try { incomingCallRef.current?.reject(); } catch { /* */ }
    incomingCallRef.current = null;
    setIncoming(null);
  }, []);

  const hangup = useCallback(() => {
    try { callRef.current?.disconnect(); deviceRef.current?.disconnectAll(); } catch { /* */ }
    clearTimer(); setStatus("ended"); callRef.current = null;
  }, [clearTimer]);

  const toggleMute = useCallback((): boolean => {
    const twCall = callRef.current;
    if (!twCall) return false;
    const next = !twCall.isMuted();
    twCall.mute(next); setIsMuted(next); return next;
  }, []);

  return { status, callDurationSec, isMuted, error, ready, identity, incoming, call, acceptIncoming, rejectIncoming, hangup, toggleMute };
}

export default useSoftphone;
