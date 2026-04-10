import { Router } from "express";
import {
  getAdminConfig,
  renderAdminPage,
  requireAdminAuth,
  saveAdminConfig
} from "../controllers/adminController.js";

const router = Router();

router.use(requireAdminAuth);
router.get("/admin", renderAdminPage);
router.get("/admin/api/config", getAdminConfig);
router.put("/admin/api/config", saveAdminConfig);

export default router;
