import app from "./app.js";
import { env, validateEnv } from "./config/env.js";
import { logger } from "./utils/logger.js";

validateEnv();

app.listen(env.port, () => {
  logger.info("Freddy backend en ejecucion", {
    port: env.port,
    env: env.nodeEnv
  });
});
