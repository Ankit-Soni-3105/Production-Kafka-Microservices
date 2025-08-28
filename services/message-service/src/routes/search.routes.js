import { Router } from "express";
import { searchMessages } from "../controllers/search.controller.js";

const router = Router();

router.get('/search', searchMessages);

export default router;
