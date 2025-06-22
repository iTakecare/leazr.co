
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/context/AuthContext';

interface AmbassadorErrorHandlerProps {
  message: string;
  onRetry?: () => void;
  showDiagnosticInfo?: boolean;
}

const AmbassadorErrorHandler: React.FC<AmbassadorErrorHandlerProps> = ({
  message,
  onRetry,
  showDiagnosticInfo = false
}) => {
  const { user, session, isAdmin, isAmbassador } = useAuth();

  const getDiagnosticInfo = () => {
    return {
      userInfo: {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        hasSession: !!session,
        isAdmin: isAdmin,
        isAmbassador: isAmbassador
      },
      timestamp: new Date().toISOString(),
      errorMessage: message
    };
  };

  const copyDiagnosticInfo = () => {
    const info = getDiagnosticInfo();
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur d'accès aux données</AlertTitle>
        <AlertDescription className="mt-2">
          {message}
        </AlertDescription>
      </Alert>

      {showDiagnosticInfo && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Info className="h-5 w-5" />
              Informations de diagnostic
            </CardTitle>
            <CardDescription>
              Informations techniques pour le débogage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm space-y-1">
              <p><strong>Accès ambassadeur_clients:</strong> {message.includes('ambassador_clients') ? 'Problème' : 'OK'}</p>
              <p><strong>Accès ambassadeurs:</strong> {message.includes('ambassadors') ? 'Problème' : 'OK'}</p>
              <p><strong>Nombre d'enregistrements ambassadeurs:</strong> {user ? '1' : '0'}</p>
              <p><strong>Nombre d'enregistrements ambassadeurs:</strong> {isAmbassador ? '1' : '0'}</p>
              <p className="text-red-600"><strong>Erreur ambassador_clients:</strong> {message.includes('permission denied for table users') ? 'permission denied for table users' : 'Autre erreur'}</p>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={copyDiagnosticInfo}>
                Copier les infos de diagnostic
              </Button>
              {onRetry && (
                <Button size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AmbassadorErrorHandler;
