import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary specifically for public contract signature pages
 * Prevents blank pages on Safari/iOS and shows a user-friendly error
 */
class PublicContractErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PublicContractErrorBoundary caught error:', error, errorInfo);
  }

  private handleRefresh = () => {
    // Clear any cached state and reload
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
              <p className="text-muted-foreground">
                Impossible de charger le contrat. Veuillez rafraîchir la page.
              </p>
              <Button onClick={this.handleRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Rafraîchir la page
              </Button>
              <p className="text-xs text-muted-foreground">
                Si le problème persiste, veuillez contacter le support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PublicContractErrorBoundary;
