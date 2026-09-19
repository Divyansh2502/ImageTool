import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";

const app = express();
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(cors({ origin: frontendUrl, methods: ["GET"], optionsSuccessStatus: 204 }));
app.use("/api", healthRouter);
app.use(errorHandler);

export default app;
