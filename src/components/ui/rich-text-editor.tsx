
import React, { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  height?: number;
}

const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Commencez à saisir...",
  className,
  height = 300
}: RichTextEditorProps) => {
  const editorRef = useRef<any>(null);
  
  return (
    <div className={cn("rounded-md border border-input", className)}>
      <Editor
        apiKey="qagffr3pkuv17a8on1afax661irst1hbr4e6tbv888sz91jc"
        onInit={(evt, editor) => editorRef.current = editor}
        value={value}
        onEditorChange={(newValue) => onChange(newValue)}
        init={{
          height,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
          placeholder,
          branding: false,
          promotion: false,
          language: 'fr_FR',
          skin: 'oxide',
          resize: false,
          statusbar: false
        }}
      />
    </div>
  );
};

export default RichTextEditor;
