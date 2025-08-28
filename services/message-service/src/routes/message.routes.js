import { Router } from "express";
import { deleteMessageSoft, editMessage, forwardMessage, getThread, listMessages, replyMessage, sendMessages } from "../controllers/message.controller.js";

const router = Router();

// public for testing, but protect with auth in production
router.post('/send', sendMessages);
router.get('/chat/:chatId', listMessages);
router.post('/edit/:messageId', editMessage);
router.delete('/deletemsg/:messageId', deleteMessageSoft);
router.post('/forward/:messageId', forwardMessage);
router.get('/thread/:messageId', getThread);
router.post('/reply/:messageId', replyMessage);

export default router;
    