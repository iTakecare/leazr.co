import React, { useEffect, useState } from "react";
import { TaskFilters as TaskFiltersType, fetchCompanyTags, type TaskTag } from "@/services/taskService";
import { useCompanyProfiles } from "@/hooks/useTasks";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
}

const TaskFilters = ({ filters, onFiltersChange }: TaskFiltersProps) => {
  const { data: profiles = [] } = useCompanyProfiles();
  const { companyId } = useMultiTenant();
  const [tags, setTags] = useState<TaskTag[]>([]);

  useEffect(() => {
    if (companyId) {
      fetchCompanyTags(companyId).then(setTags);
    }
  }, [companyId]);

  const update = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value === 'all' ? undefined : value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          className="pl-8 w-[200px] h-9"
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>

      <Select value={filters.status || 'all'} onValueChange={(v) => update('status', v)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous statuts</SelectItem>
          <SelectItem value="todo">À faire</SelectItem>
          <SelectItem value="in_progress">En cours</SelectItem>
          <SelectItem value="done">Terminée</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority || 'all'} onValueChange={(v) => update('priority', v)}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Priorité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="low">Basse</SelectItem>
          <SelectItem value="medium">Moyenne</SelectItem>
          <SelectItem value="high">Haute</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.assigned_to || 'all'} onValueChange={(v) => update('assigned_to', v)}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Assigné à" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {profiles.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tags.length > 0 && (
        <Select value={filters.tag_id || 'all'} onValueChange={(v) => update('tag_id', v)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default TaskFilters;
