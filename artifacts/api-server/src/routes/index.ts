import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tripsRouter from "./trips";
import membersRouter from "./members";
import itineraryRouter from "./itinerary";
import expensesRouter from "./expenses";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tripsRouter);
router.use(membersRouter);
router.use(itineraryRouter);
router.use(expensesRouter);
router.use(tasksRouter);

export default router;
