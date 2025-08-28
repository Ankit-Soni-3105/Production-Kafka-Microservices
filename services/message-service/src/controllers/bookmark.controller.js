import Star from "../models/star.model.js";

export const starMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id || "";

        const doc = await Star.findOneAndUpdate(
            { messageId, userId },
            { $setOnInsert: { createdAt: new Date() } },
            { upsert: true, new: true }
        );
        res.status(201).json(doc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const unstarMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id || "";
        await Star.findOneAndDelete({ messageId, userId });
        res.json({ ok: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const listStars = async (req, res) => {
    try {
        const userId = req.user.id || "";
        const list = await Star.find({ userId }).sort({ createdAt: -1 });
        res.json(list);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
