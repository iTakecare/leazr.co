
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PermissionsTest from "./PermissionsTest";

const DebugPanel = () => {
  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Panneau de débogage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionsTest />
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
