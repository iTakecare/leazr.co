import React, { useRef, useEffect } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link2, RemoveFormatting } from "lucide-react";

/**
 * Éditeur de mail enrichi léger et fiable (contentEditable + execCommand).
 * Évite les soucis de react-quill avec React 18. Sort du HTML.
 */
const btnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 7, border: 0, background: "transparent",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569",
};
const sep: React.CSSProperties = { width: 1, height: 20, background: "#E2E5EC", margin: "0 4px", alignSelf: "center" };

const RichMailEditor: React.FC<{ value: string; onChange: (html: string) => void; height?: number; placeholder?: string }> = ({
  value, onChange, height = 260, placeholder,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Synchronise la valeur contrôlée sans casser le curseur (uniquement hors focus).
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== (value || "")) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const emit = () => onChange(ref.current?.innerHTML || "");
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    try { document.execCommand(cmd, false, arg); } catch { /* */ }
    emit();
  };
  const addLink = () => {
    const url = window.prompt("Adresse du lien (https://…) :");
    if (url) exec("createLink", url);
  };

  const Btn: React.FC<{ icon: React.ElementType; cmd: string; title: string }> = ({ icon: Icon, cmd, title }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
      style={btnStyle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#EEF0F4")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={15} />
    </button>
  );

  return (
    <div style={{ border: "1px solid #E2E5EC", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderBottom: "1px solid #EEF0F4", background: "#FAFBFC", flexWrap: "wrap" }}>
        <Btn icon={Bold} cmd="bold" title="Gras (Ctrl+B)" />
        <Btn icon={Italic} cmd="italic" title="Italique (Ctrl+I)" />
        <Btn icon={Underline} cmd="underline" title="Souligné (Ctrl+U)" />
        <span style={sep} />
        <Btn icon={List} cmd="insertUnorderedList" title="Liste à puces" />
        <Btn icon={ListOrdered} cmd="insertOrderedList" title="Liste numérotée" />
        <span style={sep} />
        <button type="button" title="Insérer un lien" onMouseDown={(e) => { e.preventDefault(); addLink(); }} style={btnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#EEF0F4")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
          <Link2 size={15} />
        </button>
        <Btn icon={RemoveFormatting} cmd="removeFormat" title="Effacer la mise en forme" />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        style={{
          height,
          overflowY: "auto",
          background: "#fff",
          padding: "12px 14px",
          outline: "none",
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "#1A2233",
          wordBreak: "break-word",
        }}
      />
    </div>
  );
};

export default RichMailEditor;
