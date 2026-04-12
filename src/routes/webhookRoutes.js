import { Router } from "express";
import {
  receiveChannelWebhook,
  verifyChannelWebhook
} from "../controllers/channelWebhookController.js";

const router = Router();

router.get("/webhook", verifyChannelWebhook);
router.post("/webhook", receiveChannelWebhook);
router.post("/webhook/evolution", receiveChannelWebhook);

export default router;
