import { Router, type IRouter } from "express";
import storageRouter from "./storage";
import captureRouter from "./capture";
import briefingRouter from "./briefing";
import todayRouter from "./today";
import tasksRouter from "./tasks";
import teamRouter from "./team";
import settingsRouter from "./settings";
import twilioRouter from "./twilio";
import threadsRouter from "./threads";
import principalRouter from "./principal";

const router: IRouter = Router();

router.use(storageRouter);
router.use(captureRouter);
router.use(briefingRouter);
router.use(todayRouter);
router.use(tasksRouter);
router.use(teamRouter);
router.use(settingsRouter);
router.use(twilioRouter);
router.use(threadsRouter);
router.use(principalRouter);

export default router;
