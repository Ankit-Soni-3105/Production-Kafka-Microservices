import fetch from "node-fetch";

const SEARCH_URL = process.env.SEARCH_SERVICE_URL || "http://search-service:4008";

export const searchMessages = async (req, res, next) => {
    const { q, chatId, from, to, senderId } = req.query;

    const url = new URL(SEARCH_URL + "/search/messages");

    if (q) url.searchParams.set("q", q);
    if (chatId) url.searchParams.set("chatId", chatId);
    if (senderId) url.searchParams.set("senderId", senderId);
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);
    
    const r = await fetch(url.toString());
    const data = await r.json();
    res.json(data);
};
