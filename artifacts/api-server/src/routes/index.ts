import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import servicesRouter from "./services";
import productsRouter from "./products";
import professionalsRouter from "./professionals";
import clientsRouter from "./clients";
import appointmentsRouter from "./appointments";
import cashEntriesRouter from "./cashEntries";
import employeesRouter from "./employees";
import devRouter from "./dev";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devRouter);
router.use(authRouter);
router.use(servicesRouter);
router.use(productsRouter);
router.use(professionalsRouter);
router.use(clientsRouter);
router.use(appointmentsRouter);
router.use(cashEntriesRouter);
router.use(employeesRouter);

export default router;
