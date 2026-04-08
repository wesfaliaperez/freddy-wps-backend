import cors from "cors";
import express from "express";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "freddy-wps-backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/", webhookRoutes);

export default app;
