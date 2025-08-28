import app from './src/app.js';
import http from 'http';
import config from './src/config/config.js';
import { Server as SocketServer } from 'socket.io';
import { connectDB } from './src/db/db.js';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';
import { blockInactiveUsers } from './src/cron/inactiveUserBlocker.js';
import { connectProducer } from './src/kafka/producer.js';

const port = config.PORT;
const server = http.createServer(app);
const io = new SocketServer(server, {
    cors: {
        origin: '*',
    },
});

connectDB();
connectProducer();

cron.schedule('0 0 * * *', async () => {
    await blockInactiveUsers();
});

app.set('io', io);

// Middleware to users connect to the socket server

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        // const projectId = socket.handshake.query;
        // console.log("Socket connection query:", socket.handshake.query);

        // if (!mongoose.Types.ObjectId.isValid(projectId)) {
        //   return next(new Error('Invalid project ID'));
        // }

        // socket.project = await projectChatModel.findById(projectId)

        if (!token) {
            return next(new Error('Authentication error'));
        }
        const decoded = jwt.verify(token, config.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Invalid token'));
        }

        socket.user = decoded; // Attach user info to the socket
        next();
    } catch (error) {
        console.error('Socket connection error:', error);
        next(error);
    }
})

io.on('connection', (socket) => {
    console.log('A user connected:', socket.user.email);

    // Realtime user invite
    socket.on('send_invite', ({ toUserId, fromUser }) => {
        io.emit(`invite:${toUserId}`, {
            message: `${fromUser.username} invited you to follow them.`,
            from: fromUser,
        });
    });

    // Notify user when followed
    socket.on('follow_user', ({ followedUserId, follower }) => {
        io.emit(`followed:${followedUserId}`, {
            message: `${follower.username} started following you.`,
            follower,
        });
    });


    socket.on('disconnect', () => {
        console.log('A Client disconnected', socket.id);
    });

});


server.listen(port, () => {
    console.log(`Auth Service running on ${port}`);
});