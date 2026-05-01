import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import healthRouter from "./routes/health";
import { principalAuthMiddleware } from "./middlewares/principalAuth";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use(healthRouter);

const API_PUBLIC_PATHS = [
  "/health",
  "/healthz",
  "/webhooks/",
];

function isPublicPath(reqPath: string): boolean {
  return API_PUBLIC_PATHS.some((p) => {
    if (p.endsWith("/")) return reqPath === p || reqPath.startsWith(p);
    return reqPath === p || reqPath.startsWith(p + "/");
  });
}

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (isPublicPath(req.path)) return next();
  return requireAuth()(req, res, next);
});

app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (isPublicPath(req.path)) return next();
  return principalAuthMiddleware(req, res, next);
});

app.use("/api", router);

export default app;
