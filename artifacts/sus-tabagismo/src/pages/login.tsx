import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Activity, ShieldCheck, Lock, User, Info, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(data: LoginForm) {
    loginMutation.mutate(
      { data: data as any },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erro de autenticação",
            description: "Usuário ou senha inválidos. Tente novamente.",
          });
        },
      }
    );
  }

  // Helper to autofill mock users for convenience
  const fillCredentials = (user: string, pass: string) => {
    form.setValue("username", user);
    form.setValue("password", pass);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-slate-50/50">
      {/* Branding Side - Visible on tablet+ */}
      <div className="hidden md:flex flex-col flex-1 bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-slate-100 p-12 justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-5 max-w-md leading-tight text-white">
            Monitoramento Clínico de Tabagismo na APS
          </h1>
          <p className="text-slate-300 text-base max-w-md leading-relaxed">
            Gestão integrada e acompanhamento clínico de lesões bucais, avaliações sistemáticas e alertas automáticos de pacientes do SUS.
          </p>
        </div>
        
        {/* Decorative background ambient glows */}
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 -right-32 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          Sistema Único de Saúde • Atenção Primária à Saúde
        </div>
      </div>

      {/* Form Side with Elegant Floating Card on Mobile */}
      <div className="flex-1 flex flex-col justify-center relative px-4 py-8 sm:px-6 md:px-16 lg:px-24 overflow-hidden">
        
        {/* Subtle decorative glows for mobile backdrop to add depth */}
        <div className="absolute top-0 left-1/4 w-[350px] h-[350px] bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none md:hidden" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none md:hidden" />

        <div className="w-full max-w-[420px] mx-auto z-10">
          
          {/* Logo on Mobile */}
          <div className="md:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/10">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-slate-800">SUS Tabagismo</div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Controle Clínico APS</div>
            </div>
          </div>

          <Card className="border border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Acesso ao Sistema</h2>
                <p className="text-sm text-slate-500 mt-1">Insira suas credenciais profissionais de saúde.</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Profissional / Usuário</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <User className="w-4 h-4" />
                            </span>
                            <Input 
                              placeholder="Digite seu usuário" 
                              className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors rounded-xl"
                              {...field} 
                              autoCapitalize="none" 
                              autoCorrect="off" 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <Lock className="w-4 h-4" />
                            </span>
                            <Input 
                              type="password" 
                              placeholder="Digite sua senha" 
                              className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors rounded-xl"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold transition-all shadow-sm shadow-emerald-600/10 rounded-xl text-sm mt-2" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Acessando..." : "Entrar no Painel"}
                  </Button>
                </form>
              </Form>

              {/* Styled Credentials Guide for mock authentication */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-start gap-2.5 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-xl p-3">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-800 mb-1">Acesso de Demonstração:</p>
                    <div className="space-y-1 text-slate-600">
                      <button 
                        type="button"
                        onClick={() => fillCredentials("admin", "admin123")}
                        className="block text-left hover:underline text-emerald-700 font-semibold focus:outline-none"
                      >
                        • Admin: <span className="underline">admin</span> / <span className="underline">admin123</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => fillCredentials("usuario", "user123")}
                        className="block text-left hover:underline text-emerald-700 font-semibold focus:outline-none"
                      >
                        • Médico/Enfermeiro: <span className="underline">usuario</span> / <span className="underline">user123</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-slate-400 mt-6 font-medium">
            Desenvolvido para acompanhamento clínico na Atenção Primária do SUS.
          </p>
        </div>
      </div>
    </div>
  );
}
