import { ComponentProps } from "react";
import { PatientAlertLevel } from "@workspace/api-client-react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBadgeProps extends ComponentProps<"div"> {
  level: PatientAlertLevel;
  showLabel?: boolean;
}

export function AlertBadge({ level, showLabel = false, className, ...props }: AlertBadgeProps) {
  if (level === "red") {
    return (
      <div className={cn("flex items-center gap-1.5 text-destructive font-semibold", className)} {...props}>
        <AlertCircle className="w-5 h-5 fill-destructive/20" />
        {showLabel && <span>Alerta Crítico</span>}
      </div>
    );
  }

  if (level === "yellow") {
    return (
      <div className={cn("flex items-center gap-1.5 text-warning font-semibold", className)} {...props}>
        <AlertTriangle className="w-5 h-5 fill-warning/20" />
        {showLabel && <span>Avaliação Atrasada</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-success font-semibold", className)} {...props}>
      <CheckCircle2 className="w-5 h-5 fill-success/20" />
      {showLabel && <span>Regular</span>}
    </div>
  );
}
