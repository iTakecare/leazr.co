
import React from "react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { 
  Card,
  CardHeader,
  CardContent
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ClientsLoading = () => {
  return (
    <PageTransition>
      <Container>
        <div className="py-4">
          <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-1" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <Skeleton className="h-6 w-36 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-[300px]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="p-1">
                  <div className="flex items-center h-12 border-b px-4">
                    <Skeleton className="h-4 w-full" />
                  </div>
                  
                  {Array(5).fill(null).map((_, i) => (
                    <div key={i} className="flex items-center h-16 border-b px-4">
                      <div className="grid grid-cols-6 gap-4 w-full">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-24" />
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </PageTransition>
  );
};

export default ClientsLoading;
