
import React from 'react';
import AmbassadorsList from "@/components/crm/AmbassadorsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AmbassadorsListPage = () => {
  return (
    <div className="container py-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">Ambassadeurs</CardTitle>
          <CardDescription>
            Gérez vos ambassadeurs et suivez leurs performances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AmbassadorsList />
        </CardContent>
      </Card>
    </div>
  );
};

export default AmbassadorsListPage;
