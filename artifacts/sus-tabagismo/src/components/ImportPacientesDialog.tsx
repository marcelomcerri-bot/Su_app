import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Download, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  useImportPatients,
  getListPatientsQueryKey,
  getGetDashboardQueryKey,
  getGetSexDistributionQueryKey,
  getGetAgeDistributionQueryKey,
  getGetAlertStatusQueryKey,
  getGetMonthlyEvolutionQueryKey,
} from "@workspace/api-client-react";

const CSV_TEMPLATE =
  `identificacao,idade,sexo,equipe,microarea,tabagismo,lesao,diagnostico,data_avaliacao\n` +
  `M.S.S-1982-MA03,43,feminino,Equipe 1,MA03,ativo,sim,nenhum,2024-06-10\n` +
  `J.A.P-1975-MA01,50,masculino,Equipe 2,MA01,ex-tabagista,nao,nenhum,2024-03-15\n`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_pacientes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPacientesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutate: importPatients, isPending, data: result, reset } = useImportPatients({
    mutation: {
      onSuccess: (data) => {
        if (data.inserted > 0) {
          queryClient.invalidateQueries({ queryKey: getListPatientsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSexDistributionQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAgeDistributionQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAlertStatusQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMonthlyEvolutionQueryKey() });
        }
      },
    },
  });

  function handleClose() {
    if (isPending) return;
    setFileName(null);
    setCsvText(null);
    reset();
    onOpenChange(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    reset();
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string);
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function handleImport() {
    if (!csvText) return;
    importPatients({ data: { csvText } });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Pacientes</DialogTitle>
          <DialogDescription>
            Selecione um arquivo CSV para cadastrar pacientes em lote. Equipes
            inexistentes são criadas automaticamente. Duplicatas são ignoradas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download template */}
          <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Baixar modelo CSV
          </Button>

          {/* File picker */}
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <FileText className="w-5 h-5 text-primary" />
                {fileName}
              </div>
            ) : (
              <div className="text-muted-foreground space-y-1">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Clique para selecionar o arquivo CSV</p>
                <p className="text-xs">Formato: .csv, separado por vírgula</p>
              </div>
            )}
          </div>

          {/* Columns hint */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium">Colunas esperadas:</span>{" "}
            identificacao, idade, sexo, equipe, microarea, tabagismo, lesao, diagnostico,
            data_avaliacao
          </p>

          {/* Result */}
          {result && (
            <div className="rounded-lg border overflow-hidden">
              <div className="flex divide-x text-center text-sm">
                <div className="flex-1 py-3 bg-green-50 dark:bg-green-950/40">
                  <p className="text-2xl font-bold text-green-600">{result.inserted}</p>
                  <p className="text-xs text-muted-foreground">importados</p>
                </div>
                <div className="flex-1 py-3 bg-yellow-50 dark:bg-yellow-950/40">
                  <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">ignorados</p>
                </div>
                <div className="flex-1 py-3 bg-red-50 dark:bg-red-950/40">
                  <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-xs text-muted-foreground">erros</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="border-t bg-red-50/50 dark:bg-red-950/20 p-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        {e.line > 0 ? <strong>Linha {e.line}: </strong> : null}
                        {e.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {result.inserted > 0 && result.errors.length === 0 && (
                <div className="border-t bg-green-50/50 dark:bg-green-950/20 p-3 flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Importação concluída. Dashboard e gráficos atualizados.
                </div>
              )}

              {result.inserted > 0 && result.errors.length > 0 && (
                <div className="border-t bg-yellow-50/50 dark:bg-yellow-950/20 p-3 flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {result.inserted} paciente{result.inserted > 1 ? "s" : ""} importado{result.inserted > 1 ? "s" : ""}. Corrija os erros e reimporte se necessário.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              {result ? "Fechar" : "Cancelar"}
            </Button>
            <Button
              className="flex-1"
              disabled={!csvText || isPending}
              onClick={handleImport}
            >
              {isPending ? (
                <>
                  <Spinner className="mr-2 w-4 h-4" />
                  Importando…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
