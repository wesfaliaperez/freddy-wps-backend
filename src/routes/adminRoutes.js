import { Router } from "express";
import {
  getAdminConfig,
  renderAdminPage,
  renderAdminAsset,
  requireAdminAuth,
  saveAdminConfig
} from "../controllers/adminUiController.js";

const router = Router();

router.use(requireAdminAuth);
router.get("/admin", renderAdminPage);
router.get("/admin/:asset", renderAdminAsset);
router.get("/admin/api/config", getAdminConfig);
router.put("/admin/api/config", saveAdminConfig);

export default router;
