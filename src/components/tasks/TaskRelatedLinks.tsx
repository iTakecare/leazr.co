import React from "react";
import { Task } from "@/services/taskService";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserCheck, FileText, ClipboardList } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskRelatedLinksProps {
  task: Task;
  compact?: boolean;
}

const TaskRelatedLinks = ({ task, compact }: TaskRelatedLinksProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const slug = location.pathname.match(/^\/([^\/]+)\/admin/)?.[1] || '';

  const links = [
    {
      show: !!task.related_client_id && task.client,
      icon: UserCheck,
      label: task.client?.name || 'Client',
      href: `/${slug}/admin/clients/${task.related_client_id}`,
    },
    {
      show: !!task.related_contract_id,
      icon: FileText,
      label: 'Contrat',
      href: `/${slug}/admin/contracts/${task.related_contract_id}`,
    },
    {
      show: !!task.related_offer_id,
      icon: ClipboardList,
      label: 'Demande',
      href: `/${slug}/admin/offers/${task.related_offer_id}`,
    },
  ].filter(l => l.show);

  if (links.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {links.map((link, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => navigate(link.href)}
              >
                <link.icon className="h-3.5 w-3.5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{link.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default TaskRelatedLinks;
