import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import teamsRouter from "./teams";
import patientsRouter from "./patients";
import dashboardRouter from "./dashboard";
import chartsRouter from "./charts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(teamsRouter);
router.use(patientsRouter);
router.use(dashboardRouter);
router.use(chartsRouter);

export default router;
