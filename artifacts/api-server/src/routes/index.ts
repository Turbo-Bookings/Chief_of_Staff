import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import captureRouter from "./capture";
import briefingRouter from "./briefing";
import tasksRouter from "./tasks";
import teamRouter from "./team";
import settingsRouter from "./settings";
import twilioRouter from "./twilio";
import threadsRouter from "./threads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(captureRouter);
router.use(briefingRouter);
router.use(tasksRouter);
router.use(teamRouter);
router.use(settingsRouter);
router.use(twilioRouter);
router.use(threadsRouter);

export default router;
