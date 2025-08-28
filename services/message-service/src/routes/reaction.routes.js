import { Router } from "express";
import { addReaction, removeReaction } from "../controllers/reactionemoji.controller.js";

const router = Router();


router.post('/add/:messageId', addReaction);
router.delete('/remove/:messageId', removeReaction);

export default router;