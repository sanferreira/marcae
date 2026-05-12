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
import billingRouter from "./billing";
import settingsRouter from "./settings";
import devRouter from "./dev";
import { requirePremiumForMutations } from "../lib/billing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devRouter);
router.use(authRouter);
router.use(billingRouter);
router.use(settingsRouter);
// Block mutating endpoints when the shop's subscription is expired.
// Reads still work so users can review their data.
router.use(requirePremiumForMutations);
router.use(servicesRouter);
router.use(productsRouter);
router.use(professionalsRouter);
router.use(clientsRouter);
router.use(appointmentsRouter);
router.use(cashEntriesRouter);
router.use(employeesRouter);

export default router;
