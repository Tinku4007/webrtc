const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
});

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on('connection', (socket) => {
    console.log('New connection established:', socket.id);

    socket.on("join-room", (data) => {
        const { roomId, emailId } = data;
        console.log(`User ${emailId} joined room ${roomId}`);
        emailToSocketMapping.set(emailId, socket.id);
        socketToEmailMapping.set(socket.id, emailId);
        socket.join(roomId);
        socket.emit("joined-room", { roomId });
        socket.to(roomId).emit("user-joined", { emailId });
    });

    socket.on("call-user", (data) => {
        const { emailId, offer } = data;
        const fromEmail = socketToEmailMapping.get(socket.id);
        const toSocketId = emailToSocketMapping.get(emailId);
        console.log(`Call request from ${fromEmail} to ${emailId}`);
        if (toSocketId) {
            socket.to(toSocketId).emit('incoming-call', { from: fromEmail, offer });
        } else {
            console.log(`User ${emailId} not found for call request`);
            socket.emit('call-failed', { message: 'User not found or offline' });
        }
    });

    socket.on("call-accepted", (data) => {
        const { emailId, ans } = data;
        const toSocketId = emailToSocketMapping.get(emailId);
        const fromEmail = socketToEmailMapping.get(socket.id);
        console.log(`Call accepted: ${fromEmail} accepted call from ${emailId}`);
        if (toSocketId) {
            socket.to(toSocketId).emit("call-accepted", { ans, from: fromEmail });
        } else {
            console.log(`User ${emailId} not found for call acceptance`);
        }
    });

    socket.on("ice-candidate", (data) => {
        const { emailId, candidate } = data;
        const toSocketId = emailToSocketMapping.get(emailId);
        const fromEmail = socketToEmailMapping.get(socket.id);
        console.log(`ICE candidate from ${fromEmail} to ${emailId}`);
        if (toSocketId) {
            socket.to(toSocketId).emit("ice-candidate", { candidate, from: fromEmail });
        } else {
            console.log(`User ${emailId} not found for ICE candidate`);
        }
    });

    socket.on("disconnect", () => {
        const emailId = socketToEmailMapping.get(socket.id);
        console.log(`User disconnected: ${emailId}`);
        const roomId = [...socket.rooms][1]; // Assuming the user is in only one room
        if (roomId) {
            socket.to(roomId).emit("user-disconnected", { emailId });
        }
        emailToSocketMapping.delete(emailId);
        socketToEmailMapping.delete(socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});