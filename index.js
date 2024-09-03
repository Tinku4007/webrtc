const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize the express application
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors())

app.use(bodyParser.json());

const io = new Server(server, {
    cors: true,
});

const emailToSocketMapping = new Map();
const soxketToEmailMapping = new Map();

io.on('connection', (socket) => {
    console.log('new connection');
    socket.on("join-room", (data) => {
        const { roomId, emailId } = data;
        console.log("user", emailId, "Joined room", roomId);
        emailToSocketMapping.set(emailId, socket.id);
        soxketToEmailMapping.set(socket.id, emailId)
        socket.join(roomId);
        socket.emit("joined-room", { roomId })
        socket.broadcast.to(roomId).emit("user-joined", { emailId });
    });

    socket.on("call-user", data => {
        const { emailId, offer } = data
        const fromEmail = soxketToEmailMapping.get(socket.id)
        const socketId = emailToSocketMapping.get(emailId)
        socket.to(socketId).emit('incomming-call', { from: fromEmail, offer })
    })

    socket.on("call-accepted", (data) => {
        const { emailId, ans } = data
        const socketId = emailToSocketMapping.get(emailId)
        socket.to(socketId).emit("call-accepted", { ans })
    })
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
