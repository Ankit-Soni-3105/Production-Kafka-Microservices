import { Router } from "express";
import { listStars, starMessage, unstarMessage } from "../controllers/bookmark.controller.js";

const router = Router();


router.post('/star/:messageId', starMessage);
router.delete('/star/:messageId', unstarMessage);
router.get('/list-star', listStars);

export default router;