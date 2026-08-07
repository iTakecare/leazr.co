import Foundation
import Supabase

/// Point d'accès unique au backend.
///
/// L'URL et la clé anonyme sont les mêmes que celles du client web
/// (`src/integrations/supabase/client.ts`). La clé « anon » est publique par
/// conception : toute la sécurité repose sur les politiques RLS côté serveur,
/// pas sur le secret de cette valeur.
enum Backend {

    static let url = URL(string: "https://cifbetjefyfocafanlhv.supabase.co")!

    static let anonKey = """
        eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4NzgzODIsImV4cCI6MjA1NzQ1NDM4Mn0.B1-2XP0VVByxEq43KzoGml8W6z_XVtsh542BuiDm3Cw
        """

    static let client = SupabaseClient(
        supabaseURL: url,
        supabaseKey: anonKey
    )
}
