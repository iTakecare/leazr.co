import React, { useState, useRef, useEffect } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { useClientData } from "@/hooks/useClientData";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { clientColors } from "@/components/client/clientUi";

const toneFor = (type?: string) =>
  type === "warning" ? "#EA580C" : type === "action" ? "#2D55E5" : "#7C3AED";

const ClientNotificationsBell: React.FC = () => {
  const { notifications } = useClientData();
  const { navigateToClient } = useRoleNavigation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const count = notifications.length;

  const go = (href?: string) => {
    if (href) navigateToClient(href);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{
          position: "relative",
          width: 40,
          height: 40,
          borderRadius: 11,
          border: "1px solid #E6E9EF",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Bell size={18} color="#475569" />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              borderRadius: 20,
              background: "#EA580C",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff",
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="lzr-scroll"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 340,
            maxHeight: 420,
            overflowY: "auto",
            background: "#fff",
            border: `1px solid ${clientColors.border}`,
            borderRadius: 14,
            boxShadow: "0 16px 40px rgba(16,24,40,.16)",
            zIndex: 60,
            animation: "lzrFade .14s ease",
          }}
        >
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${clientColors.borderSoft}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: clientColors.ink }}>Notifications</span>
            {count > 0 && (
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#fff", background: "#EA580C", padding: "2px 8px", borderRadius: 20 }}>
                {count}
              </span>
            )}
          </div>

          {count === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: clientColors.faint, fontSize: 13 }}>
              Aucune notification 🎉
            </div>
          ) : (
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => go(n.actionHref)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    padding: "11px 12px",
                    border: 0,
                    background: "transparent",
                    borderRadius: 11,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F6F7F9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ marginTop: 5, width: 8, height: 8, borderRadius: "50%", flex: "none", background: toneFor(n.type) }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#1A2233" }}>{n.title}</span>
                    <span style={{ display: "block", fontSize: 12.5, color: clientColors.muted, marginTop: 1 }}>{n.description}</span>
                  </span>
                  {n.actionHref && <ChevronRight size={15} color="#C2C9D6" style={{ marginTop: 3, flex: "none" }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientNotificationsBell;
