import cors from "cors";
import express from "express";
import adminRoutes from "./routes/adminRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "freddy-wps-backend",
    message: "Freddy API en línea",
    endpoints: {
      health: "/health",
      webhook: "/webhook"
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "freddy-wps-backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/", adminRoutes);
app.use("/", webhookRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({
    status: "error",
    message: "Ocurrió un error interno en Freddy."
  });
});

export default app;
