import { useState } from "react";
import { useGetDashboard, useListTeams } from "@workspace/api-client-react";
import { Users, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const { data: teams } = useListTeams();
  
  const teamIdParam = selectedTeamId !== "all" ? parseInt(selectedTeamId, 10) : null;
  const { data: stats, isLoading } = useGetDashboard(
    { teamId: teamIdParam },
    { query: { keepPreviousData: true } as any }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground">Acompanhamento da situação dos pacientes tabagistas.</p>
        </div>

        <div className="w-full sm:w-64">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && !stats ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Ativos"
            value={stats?.totalActive ?? 0}
            icon={Users}
            description="Pacientes em acompanhamento"
            color="hsl(var(--primary))"
          />
          <StatCard
            title="Alertas Críticos"
            value={stats?.redAlert ?? 0}
            icon={AlertCircle}
            description="Lesões sem diagnóstico"
            color="hsl(var(--destructive))"
            iconClass="text-destructive"
          />
          <StatCard
            title="Avaliações Atrasadas"
            value={stats?.yellowAlert ?? 0}
            icon={AlertTriangle}
            description="Mais de 365 dias"
            color="hsl(var(--warning))"
            iconClass="text-warning-foreground"
          />
          <StatCard
            title="Regulares"
            value={stats?.noAlert ?? 0}
            icon={CheckCircle2}
            description="Sem pendências"
            color="hsl(var(--success))"
            iconClass="text-success-foreground"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  className, 
  iconClass,
  color
}: { 
  title: string; 
  value: number; 
  icon: any; 
  description: string;
  className?: string;
  iconClass?: string;
  color?: string;
}) {
  return (
    <Card className={cn("overflow-hidden relative pl-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      {color && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5"
          style={{ backgroundColor: color }}
        />
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-4.5 pr-4">
        <CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{title}</CardTitle>
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color ? `${color}15` : 'rgba(0,0,0,0.05)' }}
        >
          <Icon className={cn("w-4 h-4", iconClass || "text-muted-foreground")} style={{ color: color }} />
        </div>
      </CardHeader>
      <CardContent className="pb-4 pr-4">
        <div className="text-3xl font-extrabold tracking-tight">{value}</div>
        <p className="text-[11px] text-muted-foreground mt-1 font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}
