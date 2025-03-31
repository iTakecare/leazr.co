
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  testClientCreationPermission, 
  testOfferCreationPermission, 
  runAllPermissionsTests 
} from '@/utils/testPermissions';
import { Shield, User, FileText, CheckCircle2 } from 'lucide-react';

const PermissionsTest = () => {
  const [isTestingClient, setIsTestingClient] = React.useState(false);
  const [isTestingOffer, setIsTestingOffer] = React.useState(false);
  const [isTestingAll, setIsTestingAll] = React.useState(false);

  const handleTestClientPermission = async () => {
    setIsTestingClient(true);
    try {
      await testClientCreationPermission();
    } finally {
      setIsTestingClient(false);
    }
  };

  const handleTestOfferPermission = async () => {
    setIsTestingOffer(true);
    try {
      await testOfferCreationPermission();
    } finally {
      setIsTestingOffer(false);
    }
  };

  const handleTestAllPermissions = async () => {
    setIsTestingAll(true);
    try {
      await runAllPermissionsTests();
    } finally {
      setIsTestingAll(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Test des permissions Supabase
        </CardTitle>
        <CardDescription>
          Vérifiez si les permissions RLS sont correctement configurées
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <p className="text-sm text-muted-foreground">
            Ces tests vérifient si les permissions RLS permettent la création de clients et d'offres
            pour les utilisateurs non authentifiés (comme lors d'une demande public).
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={handleTestClientPermission}
          disabled={isTestingClient}
        >
          {isTestingClient ? (
            <>
              <User className="mr-2 h-4 w-4 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <User className="mr-2 h-4 w-4" />
              Tester la création de client
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={handleTestOfferPermission}
          disabled={isTestingOffer}
        >
          {isTestingOffer ? (
            <>
              <FileText className="mr-2 h-4 w-4 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Tester la création d'offre
            </>
          )}
        </Button>
        <Button 
          className="w-full" 
          onClick={handleTestAllPermissions}
          disabled={isTestingAll}
        >
          {isTestingAll ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4 animate-spin" />
              Exécution de tous les tests...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Exécuter tous les tests
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PermissionsTest;
