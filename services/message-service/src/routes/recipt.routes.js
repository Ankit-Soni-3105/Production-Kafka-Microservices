import { Router } from "express";
import { updateReceipt } from "../controllers/reciept.controller.js";

const router = Router();

router.patch("/update-receipt/:messageId", updateReceipt);

export default router;
