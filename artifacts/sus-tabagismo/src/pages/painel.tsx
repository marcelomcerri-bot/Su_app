import { useState } from "react";
import { 
  useGetSexDistribution, 
  useGetAgeDistribution, 
  useGetAlertStatus, 
  useGetMonthlyEvolution,
  useListTeams
} from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";

const TEAM_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Painel() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  
  const { data: teams } = useListTeams();
  const teamIdParam = selectedTeamId !== "all" ? parseInt(selectedTeamId, 10) : null;
  const queryOptions = { query: { keepPreviousData: true } as any };

  const { data: sexData, isLoading: isLoadingSex } = useGetSexDistribution({ teamId: teamIdParam }, queryOptions);
  const { data: ageData, isLoading: isLoadingAge } = useGetAgeDistribution({ teamId: teamIdParam }, queryOptions);
  const { data: alertData, isLoading: isLoadingAlert } = useGetAlertStatus({ teamId: teamIdParam }, queryOptions);
  // Monthly chart always shows all teams (ignore teamId filter) to enable comparison
  const { data: monthlyData, isLoading: isLoadingMonthly } = useGetMonthlyEvolution({}, queryOptions);

  const sexChartData = sexData ? [
    { name: "Masculino", value: sexData.masculino, color: "hsl(var(--chart-5))" },
    { name: "Feminino", value: sexData.feminino, color: "hsl(var(--chart-1))" },
  ] : [];

  const ageChartData = ageData ? [
    { name: "< 30", value: ageData.under30 },
    { name: "30-44", value: ageData.from30to44 },
    { name: "45-59", value: ageData.from45to59 },
    { name: "60+", value: ageData.over60 },
  ] : [];

  const alertChartData = alertData ? [
    { name: "Crítico", value: alertData.red, color: "hsl(var(--destructive))" },
    { name: "Atrasado", value: alertData.yellow, color: "hsl(var(--warning))" },
    { name: "Regular", value: alertData.none, color: "hsl(var(--success))" },
  ] : [];

  const isLoading = isLoadingSex || isLoadingAge || isLoadingAlert || isLoadingMonthly;
  const evolutionTeams = monthlyData?.teams ?? [];
  const evolutionPoints = monthlyData?.points ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Analítico</h1>
          <p className="text-muted-foreground">Distribuição e evolução dos indicadores da rede.</p>
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

      {isLoading && (!sexData || !ageData || !alertData || !monthlyData) ? (
        <div className="py-12 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Distribuição por Sexo</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sexChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sexChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Situação dos Alertas</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {alertChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Faixa Etária</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Evolução de Pacientes Atendidos (Últimos 12 meses)</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  {evolutionTeams.map((team, index) => (
                    <Line
                      key={team.id}
                      type="monotone"
                      dataKey={String(team.id)}
                      name={team.name}
                      stroke={TEAM_COLORS[index % TEAM_COLORS.length]}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
