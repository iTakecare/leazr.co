import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Download, 
  Play, 
  Pause, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface BatchItem {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  outputUrl?: string;
}

interface BatchPDFProcessorProps {
  onProcessComplete: (results: BatchItem[]) => void;
}

export const BatchPDFProcessor: React.FC<BatchPDFProcessorProps> = ({
  onProcessComplete
}) => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const newItems: BatchItem[] = files.map((file, index) => ({
      id: `batch-${Date.now()}-${index}`,
      filename: file.name,
      status: 'pending',
      progress: 0
    }));

    setBatchItems(prev => [...prev, ...newItems]);
    toast.success(`${files.length} fichier(s) ajouté(s) au lot`);
  };

  const simulateProcessing = async () => {
    setIsProcessing(true);
    setIsPaused(false);

    for (let i = 0; i < batchItems.length; i++) {
      if (isPaused) break;

      const item = batchItems[i];
      
      // Marquer comme en cours de traitement
      setBatchItems(prev => prev.map(b => 
        b.id === item.id ? { ...b, status: 'processing' } : b
      ));

      // Simuler le traitement
      for (let progress = 0; progress <= 100; progress += 10) {
        if (isPaused) break;
        
        setBatchItems(prev => prev.map(b => 
          b.id === item.id ? { ...b, progress } : b
        ));
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!isPaused) {
        // Simuler succès ou erreur (90% de succès)
        const isSuccess = Math.random() > 0.1;
        
        setBatchItems(prev => prev.map(b => 
          b.id === item.id ? {
            ...b,
            status: isSuccess ? 'completed' : 'error',
            progress: 100,
            error: isSuccess ? undefined : 'Erreur de traitement simulée',
            outputUrl: isSuccess ? `/generated/${item.filename}` : undefined
          } : b
        ));

        // Mettre à jour le progrès global
        setOverallProgress(((i + 1) / batchItems.length) * 100);
      }
    }

    if (!isPaused) {
      setIsProcessing(false);
      const completedItems = batchItems.filter(item => item.status === 'completed');
      toast.success(`Traitement terminé: ${completedItems.length}/${batchItems.length} réussi(s)`);
      onProcessComplete(batchItems);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    toast.info('Traitement mis en pause');
  };

  const handleResume = () => {
    setIsPaused(false);
    toast.info('Traitement repris');
    simulateProcessing();
  };

  const handleRetry = (itemId: string) => {
    setBatchItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: 'pending', progress: 0, error: undefined }
        : item
    ));
    toast.info('Élément ajouté à nouveau à la file d\'attente');
  };

  const getStatusIcon = (status: BatchItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: BatchItem['status']) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'processing': return 'En cours';
      case 'completed': return 'Terminé';
      case 'error': return 'Erreur';
    }
  };

  const completedCount = batchItems.filter(item => item.status === 'completed').length;
  const errorCount = batchItems.filter(item => item.status === 'error').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Traitement par Lots de PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => document.getElementById('batch-upload')?.click()}
                variant="outline"
                className="gap-2"
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4" />
                Ajouter des fichiers
              </Button>
              
              {batchItems.length > 0 && !isProcessing && (
                <Button
                  onClick={simulateProcessing}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Lancer le traitement
                </Button>
              )}
              
              {isProcessing && !isPaused && (
                <Button
                  onClick={handlePause}
                  variant="outline"
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              
              {isProcessing && isPaused && (
                <Button
                  onClick={handleResume}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Reprendre
                </Button>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progrès global</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} />
              </div>
            )}

            {batchItems.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline">
                  Total: {batchItems.length}
                </Badge>
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Réussis: {completedCount}
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Erreurs: {errorCount}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <input
            id="batch-upload"
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {batchItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>File d'attente de traitement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batchItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.filename}</span>
                        <Badge variant="outline">
                          {getStatusText(item.status)}
                        </Badge>
                      </div>
                      
                      {item.status === 'processing' && (
                        <Progress value={item.progress} className="mt-2" />
                      )}
                      
                      {item.error && (
                        <p className="text-sm text-red-600 mt-1">{item.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.status === 'completed' && item.outputUrl && (
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {item.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(item.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};