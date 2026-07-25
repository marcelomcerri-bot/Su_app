import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  useListPatients, 
  useListTeams, 
  ListPatientsAlertType, 
  ListPatientsSex,
  Patient
} from "@workspace/api-client-react";
import { Search, Plus, Filter, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Users, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { AlertBadge } from "@/components/AlertBadge";
import { ImportPacientesDialog } from "@/components/ImportPacientesDialog";
function useDebounceHook<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Pacientes() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounceHook(search, 500);
  
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: teams } = useListTeams();
  
  const queryParams = {
    search: debouncedSearch || null,
    teamId: teamFilter !== "all" ? parseInt(teamFilter, 10) : null,
    alertType: alertFilter !== "all" ? (alertFilter as ListPatientsAlertType) : null,
  };

  const { data: patients, isLoading } = useListPatients(
    queryParams,
    { query: { keepPreviousData: true } as any }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie os pacientes tabagistas da sua área.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar pacientes
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => setLocation("/pacientes/novo")}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Paciente
          </Button>
        </div>
      </div>

      <ImportPacientesDialog open={showImport} onOpenChange={setShowImport} />

      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por identificação (ex: CNS, Iniciais)..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-accent" : ""}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Equipe</label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todas" />
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
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Alerta</label>
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os alertas</SelectItem>
                  <SelectItem value="red">Crítico (Vermelho)</SelectItem>
                  <SelectItem value="yellow">Atrasado (Amarelo)</SelectItem>
                  <SelectItem value="none">Regular (Verde)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div>
        {isLoading && !patients ? (
          <div className="py-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : patients?.length === 0 ? (
          <div className="text-center py-12 px-4 border rounded-lg border-dashed bg-muted/20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-1">Nenhum paciente encontrado</h3>
            <p className="text-muted-foreground">Ajuste os filtros ou cadastre um novo paciente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 pb-4">
            {patients?.map((patient) => (
              <PatientCard 
                key={patient.id} 
                patient={patient} 
                onClick={() => setLocation(`/pacientes/${patient.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  return (
    <Card 
      className="p-4 hover:bg-accent/50 cursor-pointer transition-all active:scale-[0.985] group relative overflow-hidden pl-6 border border-border/50 shadow-sm hover:shadow-md"
      onClick={onClick}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-colors"
        style={{
          backgroundColor: patient.alertLevel === 'red' ? 'hsl(var(--destructive))' : 
                           patient.alertLevel === 'yellow' ? 'hsl(var(--warning))' : 
                           'hsl(var(--success))'
        }}
      />
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-bold text-lg truncate">{patient.identification}</h3>
            {patient.patientStatus === "inativo" && (
              <Badge variant="secondary" className="text-[10px] uppercase">Inativo</Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/40"></span>
              {patient.teamName}
            </span>
            <span>MA: {patient.microarea}</span>
            <span>{patient.age} anos</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0 pl-4">
          <AlertBadge level={patient.alertLevel} />
          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </Card>
  );
}
