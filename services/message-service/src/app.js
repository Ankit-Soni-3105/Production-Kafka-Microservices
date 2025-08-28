import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import messeageRoutes from '../src/routes/message.routes.js';
import reactionRoutes from '../src/routes/reaction.routes.js';
import starRoutes from './routes/star.routes.js';
import receiptRoutes from './routes/recipt.routes.js';
import searchRoutes from './routes/search.routes.js';
import cors from 'cors';

const app = express();

app.use(cors({ origin: '*', credentials: true })); // Adjust origin for production
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/messages', messeageRoutes);
app.use("/reactions", reactionRoutes);
app.use("/stars", starRoutes);
app.use("/receipts", receiptRoutes);
app.use("/search", searchRoutes);


// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

export default app;