import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Plus, Edit2, Trash2, ShieldAlert } from "lucide-react";
import { 
  useListTeams, 
  useCreateTeam, 
  useUpdateTeam, 
  useDeleteTeam,
  useTransferTeamPatients,
  useGetMe,
  getListTeamsQueryKey,
  Team
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const teamSchema = z.object({
  name: z.string().min(1, "Nome da equipe é obrigatório"),
});

type TeamForm = z.infer<typeof teamSchema>;

export default function Equipes() {
  const { data: user } = useGetMe();
  const { data: teams, isLoading } = useListTeams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

  if (isLoading && !teams) {
    return (
      <div className="py-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipes de Saúde</h1>
          <p className="text-muted-foreground">Gerencie as equipes de saúde da família e sua distribuição.</p>
        </div>
        
        <TeamDialog 
          open={isCreateOpen} 
          onOpenChange={setIsCreateOpen} 
          trigger={
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Equipe
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams?.map((team) => (
          <Card key={team.id} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  {team.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingTeam(team)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {user?.role === "admin" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeletingTeam(team)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{team.patientCount}</div>
              <p className="text-xs text-muted-foreground">Pacientes vinculados</p>
            </CardContent>
          </Card>
        ))}
        {teams?.length === 0 && (
          <div className="col-span-full text-center py-12 border rounded-lg border-dashed bg-muted/20">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-1">Nenhuma equipe cadastrada</h3>
            <p className="text-muted-foreground">Cadastre a primeira equipe para começar a organizar os pacientes.</p>
          </div>
        )}
      </div>

      <TeamDialog 
        team={editingTeam}
        open={!!editingTeam} 
        onOpenChange={(open) => !open && setEditingTeam(null)} 
      />

      <DeleteTeamDialog 
        team={deletingTeam}
        teams={teams || []}
        open={!!deletingTeam}
        onOpenChange={(open) => !open && setDeletingTeam(null)}
      />
    </div>
  );
}

function TeamDialog({ team, open, onOpenChange, trigger }: { team?: Team | null, open: boolean, onOpenChange: (open: boolean) => void, trigger?: React.ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();

  const form = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team?.name || "",
    },
  });

  // Update form when team changes
  import("react").then((React) => {
    React.useEffect(() => {
      if (open) {
        form.reset({ name: team?.name || "" });
      }
    }, [open, team, form]);
  });

  function onSubmit(data: TeamForm) {
    if (team) {
      updateMutation.mutate(
        { id: team.id, data: data as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
            toast({ title: "Equipe atualizada" });
            onOpenChange(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: data as any },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
            toast({ title: "Equipe criada com sucesso" });
            onOpenChange(false);
          }
        }
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Editar Equipe" : "Nova Equipe"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Equipe</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: eSF Esperança" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTeamDialog({ team, teams, open, onOpenChange }: { team: Team | null, teams: Team[], open: boolean, onOpenChange: (open: boolean) => void }) {
  const [targetTeamId, setTargetTeamId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteMutation = useDeleteTeam();
  const transferMutation = useTransferTeamPatients();

  // Reset state on open
  import("react").then((React) => {
    React.useEffect(() => {
      if (open) {
        setTargetTeamId("");
      }
    }, [open]);
  });

  const activeTeam = team;
  if (!activeTeam) return null;

  const hasPatients = activeTeam.patientCount > 0;
  const otherTeams = teams.filter(t => t.id !== activeTeam.id);

  function handleConfirm() {
    if (hasPatients) {
      if (!targetTeamId) {
        toast({ variant: "destructive", title: "Selecione uma equipe destino" });
        return;
      }
      
      transferMutation.mutate(
        { id: activeTeam.id, data: { targetTeamId: parseInt(targetTeamId, 10) } },
        {
          onSuccess: () => {
            // Once transferred, delete the team
            executeDelete();
          }
        }
      );
    } else {
      executeDelete();
    }
  }

  function executeDelete() {
    deleteMutation.mutate(
      { id: activeTeam.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
          toast({ title: "Equipe excluída com sucesso" });
          onOpenChange(false);
        }
      }
    );
  }

  const isPending = deleteMutation.isPending || transferMutation.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            Excluir Equipe
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2 text-base">
            <p>
              Tem certeza que deseja excluir a equipe <strong>{team.name}</strong>?
            </p>
            
            {hasPatients ? (
              <div className="bg-warning/10 border border-warning/20 rounded-md p-4 space-y-3">
                <p className="font-medium text-warning-foreground">
                  Atenção: Esta equipe possui {team.patientCount} paciente(s).
                </p>
                <p className="text-sm">
                  Para excluí-la, você precisa transferir os pacientes para outra equipe.
                </p>
                <div className="pt-2">
                  <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione a equipe de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherTeams.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <p>Esta equipe não tem pacientes vinculados e será removida permanentemente.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isPending || (hasPatients && !targetTeamId)}
          >
            {isPending ? "Processando..." : "Confirmar Exclusão"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
