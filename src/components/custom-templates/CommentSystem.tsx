import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle, Archive, Reply } from 'lucide-react';
import { templateCollaborationService } from '@/services/templateCollaborationService';
import { TemplateComment } from '@/types/customPdfTemplate';
import { toast } from 'sonner';

interface CommentSystemProps {
  templateId: string;
  fieldId?: string; // Pour les commentaires sur un champ spécifique
}

export function CommentSystem({ templateId, fieldId }: CommentSystemProps) {
  const [comments, setComments] = useState<TemplateComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<TemplateComment['comment_type']>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TemplateComment['status'] | 'all'>('all');

  useEffect(() => {
    if (templateId && templateId !== 'temp') {
      loadComments();
    } else {
      setLoading(false);
    }
  }, [templateId, fieldId, filterStatus]);

  const loadComments = async () => {
    if (!templateId || templateId === 'temp') {
      setLoading(false);
      return;
    }
    
    try {
      const statusFilter = filterStatus === 'all' ? undefined : filterStatus;
      const data = await templateCollaborationService.getComments(
        templateId, 
        fieldId, 
        statusFilter
      );
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Erreur lors du chargement des commentaires');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await templateCollaborationService.addComment(
        templateId,
        newComment,
        commentType,
        fieldId
      );
      
      toast.success('Commentaire ajouté');
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await templateCollaborationService.resolveComment(commentId);
      toast.success('Commentaire résolu');
      loadComments();
    } catch (error) {
      console.error('Error resolving comment:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const handleArchiveComment = async (commentId: string) => {
    try {
      await templateCollaborationService.archiveComment(commentId);
      toast.success('Commentaire archivé');
      loadComments();
    } catch (error) {
      console.error('Error archiving comment:', error);
      toast.error('Erreur lors de l\'archivage');
    }
  };

  const getCommentTypeColor = (type: TemplateComment['comment_type']) => {
    switch (type) {
      case 'suggestion':
        return 'bg-blue-500';
      case 'issue':
        return 'bg-red-500';
      case 'approval':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: TemplateComment['status']) => {
    switch (status) {
      case 'open':
        return 'default';
      case 'resolved':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (!templateId || templateId === 'temp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Commentaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Veuillez sauvegarder le template avant d'ajouter des commentaires.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Commentaires ({comments.length})
            {fieldId && <Badge variant="outline">Champ spécifique</Badge>}
          </CardTitle>
          
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TemplateComment['status'] | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="open">Ouverts</SelectItem>
              <SelectItem value="resolved">Résolus</SelectItem>
              <SelectItem value="archived">Archivés</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nouveau commentaire */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={commentType} onValueChange={(value) => setCommentType(value as TemplateComment['comment_type'])}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Général</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="issue">Problème</SelectItem>
                <SelectItem value="approval">Approbation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Textarea
            placeholder="Écrivez votre commentaire..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-20"
          />
          
          <Button
            onClick={handleSubmitComment}
            disabled={isSubmitting || !newComment.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Ajouter un commentaire
          </Button>
        </div>

        {/* Liste des commentaires */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {comment.created_by.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Utilisateur {comment.created_by.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getCommentTypeColor(comment.comment_type)}`} />
                  <Badge variant={getStatusBadgeVariant(comment.status)}>
                    {comment.status}
                  </Badge>
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

              {comment.status === 'open' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveComment(comment.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Résoudre
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchiveComment(comment.id)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archiver
                  </Button>
                  <Button variant="outline" size="sm">
                    <Reply className="h-4 w-4 mr-1" />
                    Répondre
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun commentaire {fieldId ? 'pour ce champ' : 'pour ce template'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}