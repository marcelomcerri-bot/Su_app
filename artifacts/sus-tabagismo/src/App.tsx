import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import { Shell } from '@/components/layout/Shell';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Pacientes from '@/pages/pacientes';
import PacientesNovo from '@/pages/pacientes-novo';
import PacientesId from '@/pages/pacientes-id';
import Painel from '@/pages/painel';
import Equipes from '@/pages/equipes';

const queryClient = new QueryClient();

function ProtectedApp() {
  return (
    <ProtectedRoute>
      <Shell>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/pacientes" component={Pacientes} />
          <Route path="/pacientes/novo" component={PacientesNovo} />
          <Route path="/pacientes/:id" component={PacientesId} />
          <Route path="/painel" component={Painel} />
          <Route path="/equipes" component={Equipes} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="*" component={ProtectedApp} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
