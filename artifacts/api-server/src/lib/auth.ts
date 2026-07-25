import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "Acesso negado. Apenas administradores podem realizar esta ação." });
    return;
  }
  next();
}

export function computeAlertLevel(
  hasOralLesion: boolean,
  diagnosis: string,
  lastEvaluationDate: string | null
): "red" | "yellow" | "none" {
  if (hasOralLesion && diagnosis === "nenhum") {
    return "red";
  }
  if (!lastEvaluationDate) {
    return "yellow";
  }
  const lastEval = new Date(lastEvaluationDate);
  const daysDiff = (Date.now() - lastEval.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    return "yellow";
  }
  return "none";
}
