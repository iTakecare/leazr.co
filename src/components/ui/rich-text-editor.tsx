
import React, { useMemo } from "react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
  
  // Configuration des modules Quill
  const modules = useMemo(() => {
    const baseModules = {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['clean']
      ],
      clipboard: {
        matchVisual: false
      }
    };

    if (isEmailEditor) {
      // Configuration étendue pour les emails
      baseModules.toolbar = [
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
        ['insertButton'],
        ['clean']
      ];
    }

    return baseModules;
  }, [isEmailEditor]);

  // Formats autorisés
  const formats = [
    'bold', 'italic', 'underline',
    'color', 'background',
    'align',
    'list', 'bullet',
    'link'
  ];

  // Styles personnalisés pour Quill
  const editorStyle = useMemo(() => ({
    height: `${height - 42}px`, // Soustraire la hauteur de la toolbar
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '14px'
  }), [height]);

  return (
    <div className={cn("rounded-md border border-input bg-background", className)}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{
          height: `${height}px`
        }}
        className="quill-editor"
      />
      
      <style>
        {`
        .quill-editor .ql-editor {
          min-height: ${height - 42}px !important;
          font-family: Helvetica, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .quill-editor .ql-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--background));
        }
        
        .quill-editor .ql-container {
          border: none;
          font-family: inherit;
        }
        
        .quill-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        
        .quill-editor .ql-snow .ql-tooltip {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
        }
        
        .quill-editor .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        
        .quill-editor .ql-snow .ql-fill {
          fill: hsl(var(--foreground));
        }
        `}
      </style>
    </div>
  );
};

export default RichTextEditor;
