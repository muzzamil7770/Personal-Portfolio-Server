const { Server } = require('socket.io');
const logger = require('./utils/logger');

let io = null;
let liveUsers = new Set();

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        logger.info(`🔌 New socket connection: ${socket.id}`);
        
        // Track unique connections for "Watching Now"
        liveUsers.add(socket.id);
        io.emit('live-watching-update', { watching: liveUsers.size });

        socket.on('join-room', (roomId, userId) => {
            socket.join(roomId);
            socket.to(roomId).emit('user-connected', userId);
        });

        socket.on('join-request', ({ roomId, userId, name, email }) => {
            socket.join(roomId);
            io.to(roomId).emit('join-request', { userId, name, email });
        });

        socket.on('admin-allow-user', ({ roomId, userId }) => {
            io.to(roomId).emit('user-allowed', userId);
        });

        socket.on('offer', (payload) => {
            io.to(payload.target).emit('offer', { caller: payload.caller, offer: payload.offer });
        });

        socket.on('answer', (payload) => {
            io.to(payload.target).emit('answer', { caller: socket.id, answer: payload.answer });
        });

        socket.on('ice-candidate', (payload) => {
            io.to(payload.target).emit('ice-candidate', { caller: payload.caller || socket.id, candidate: payload.candidate });
        });

        socket.on('admin-mute-user', ({ roomId, userId, mute }) => {
            io.to(roomId).emit('mute-instruction', { userId, mute });
        });

        socket.on('admin-kick-user', ({ roomId, userId }) => {
            io.to(roomId).emit('user-kicked', userId);
        });

        socket.on('update-notes', ({ roomId, notes }) => {
            socket.to(roomId).emit('notes-update', { userId: socket.id, notes });
        });

        socket.on('start-screen-share', (roomId) => {
            socket.to(roomId).emit('screen-share-started', socket.id);
        });

        socket.on('stop-screen-share', (roomId) => {
            socket.to(roomId).emit('screen-share-stopped', socket.id);
        });

        socket.on('live-meeting-start', ({ roomId }) => {
            socket.data.liveMeetingRoom = roomId;
            io.emit('live-meeting-update', { active: true, roomId });
        });

        socket.on('live-meeting-end', () => {
            io.emit('live-meeting-update', { active: false, roomId: null });
        });

        socket.on('disconnect', () => {
            logger.info(`🚪 Socket disconnected: ${socket.id}`);
            liveUsers.delete(socket.id);
            io.emit('live-watching-update', { watching: liveUsers.size });
        });
    });

    return io;
};

const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};

module.exports = { initSocket, getIO };
