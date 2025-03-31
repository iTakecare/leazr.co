
import React, { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  height?: number;
  isEmailEditor?: boolean;
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Commencez à saisir...",
  className,
  height = 300,
  isEmailEditor = false
}: RichTextEditorProps) => {
  const editorRef = useRef<any>(null);
  
  // Configuration spécifique pour l'éditeur d'emails
  const emailPlugins = [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
  ];
  
  const emailToolbar = 'undo redo | blocks | ' +
    'bold italic forecolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'removeformat | link | table | insertButton | help';

  const standardToolbar = 'undo redo | blocks | ' +
    'bold italic forecolor | alignleft aligncenter ' +
    'alignright alignjustify | bullist numlist outdent indent | ' +
    'removeformat | help';

  // Fonction pour insérer un bouton dans l'éditeur
  const setupEmailEditor = (editor: any) => {
    editor.ui.registry.addButton('insertButton', {
      text: 'Insérer un bouton',
      tooltip: 'Insérer un bouton de création de compte',
      onAction: function () {
        editor.insertContent(
          `<div style="text-align: center; margin: 20px 0;">
            <a href="{{account_creation_link}}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px;">Créer mon compte</a>
          </div>`
        );
      }
    });
  };
  
  return (
    <div className={cn("rounded-md border border-input", className)}>
      <Editor
        apiKey="7brhs4b679mgzy88ps7dwcxqjqlsqmi34i8yqnl1p9u800hy"
        onInit={(evt, editor) => editorRef.current = editor}
        value={value}
        onEditorChange={(newValue) => onChange(newValue)}
        init={{
          height,
          menubar: isEmailEditor,
          plugins: emailPlugins,
          toolbar: isEmailEditor ? emailToolbar : standardToolbar,
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
          placeholder,
          branding: false,
          promotion: false,
          language: 'fr_FR',
          skin: 'oxide',
          resize: false,
          statusbar: false,
          setup: isEmailEditor ? setupEmailEditor : undefined
        }}
      />
    </div>
  );
};

export default RichTextEditor;
