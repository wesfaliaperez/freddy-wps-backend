import { Router } from "express";
import {
  receiveWebhook,
  verifyWebhook
} from "../controllers/webhookController.js";

const router = Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", receiveWebhook);

export default router;
