import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { 
  useCreatePatient, 
  useListTeams, 
  getListPatientsQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

const patientSchema = z.object({
  identification: z.string().min(1, "Identificação é obrigatória"),
  age: z.coerce.number().min(0, "Idade inválida").max(130, "Idade inválida"),
  sex: z.enum(["masculino", "feminino"] as const),
  teamId: z.coerce.number().min(1, "Equipe é obrigatória"),
  microarea: z.string().min(1, "Microárea é obrigatória"),
  smokingStatus: z.enum(["ativo", "ex-tabagista"] as const),
  hasOralLesion: z.boolean(),
  lesionType: z.string().nullable().optional(),
  diagnosis: z.enum(["nenhum", "em_investigacao", "confirmado"] as const),
  lastEvaluationDate: z.string().nullable().optional(),
  patientStatus: z.enum(["ativo", "inativo"] as const),
  notes: z.string().nullable().optional(),
});

type PatientForm = z.infer<typeof patientSchema>;

export default function NewPatient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: teams } = useListTeams();
  const createMutation = useCreatePatient();

  const form = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      identification: "",
      age: 0,
      sex: "masculino",
      teamId: 0,
      microarea: "",
      smokingStatus: "ativo",
      hasOralLesion: false,
      lesionType: "",
      diagnosis: "nenhum",
      lastEvaluationDate: "",
      patientStatus: "ativo",
      notes: "",
    },
  });

  const hasLesion = form.watch("hasOralLesion");

  function onSubmit(data: PatientForm) {
    createMutation.mutate(
      { data: {
          ...data,
          lesionType: data.hasOralLesion ? data.lesionType : null,
          lastEvaluationDate: data.lastEvaluationDate || null,
          registrationDate: new Date().toISOString(),
        } as any
      },
      {
        onSuccess: (newPatient) => {
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          
          toast({
            title: "Paciente cadastrado",
            description: "O registro foi salvo com sucesso.",
          });
          setLocation(`/pacientes/${newPatient.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: "Verifique os dados e tente novamente.",
          });
        }
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setLocation("/pacientes")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo Paciente</h1>
          <p className="text-muted-foreground text-sm">Cadastro de acompanhamento na APS</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="bg-muted/30 p-5 rounded-lg border space-y-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                  Identificação
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="identification"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Nome / CNS / Prontuário</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Iniciais ou código" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idade</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="bg-muted/30 p-5 rounded-lg border space-y-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                  Território
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipe</FormLabel>
                        <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value ? field.value.toString() : ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a equipe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teams?.map((team) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="microarea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Microárea</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: MA 01" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="bg-muted/30 p-5 rounded-lg border space-y-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span>
                  Acompanhamento Clínico
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="smokingStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status Tabagismo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ativo">Fumante Ativo</SelectItem>
                            <SelectItem value="ex-tabagista">Ex-tabagista</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastEvaluationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Última Avaliação Bucal</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <p className="text-[10px] text-muted-foreground mt-1">Deixe em branco se nunca avaliado.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasOralLesion"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 sm:col-span-2 bg-background">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Apresenta Lesão Bucal?</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Marque se foi identificada alguma lesão suspeita.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {hasLesion && (
                    <>
                      <FormField
                        control={form.control}
                        name="lesionType"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Descrição da Lesão</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="Ex: Mancha branca em borda de língua" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="diagnosis"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Situação Diagnóstica da Lesão</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className={field.value === "nenhum" ? "border-destructive text-destructive" : ""}>
                                  <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="nenhum">Sem diagnóstico (Gera alerta CRÍTICO)</SelectItem>
                                <SelectItem value="em_investigacao">Em investigação / Encaminhado</SelectItem>
                                <SelectItem value="confirmado">Confirmado / Tratado</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Lesão sem diagnóstico gera alerta vermelho para a equipe.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setLocation("/pacientes")}>Cancelar</Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Cadastrando..." : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Cadastrar Paciente
                    </>
                  )}
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
