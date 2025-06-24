
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OfferNotesProps {
  notes: any[];
  loading: boolean;
}

const AmbassadorOfferNotes: React.FC<OfferNotesProps> = ({
  notes,
  loading
}) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Date inconnue";
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-600" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
          </div>
        ) : notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-900">
                      {note.profiles?.first_name 
                        ? `${note.profiles.first_name} ${note.profiles.last_name}` 
                        : "Admin"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-amber-600">
                      {formatDate(note.created_at)}
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {note.type === 'admin_note' ? 'Note admin' : 'Note interne'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-amber-900 whitespace-pre-line">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <StickyNote className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-muted-foreground">Aucune note disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbassadorOfferNotes;
