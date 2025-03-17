
import React from "react";

interface NotesSectionProps {
  notes?: string;
}

const NotesSection = ({ notes }: NotesSectionProps) => {
  if (!notes) return null;
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
      <div className="rounded-lg border p-3 text-sm whitespace-pre-wrap">
        {notes}
      </div>
    </div>
  );
};

export default NotesSection;
