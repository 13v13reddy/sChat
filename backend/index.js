const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
});

let waitingSocket = null;

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  if (waitingSocket) {
    socket.partner = waitingSocket;
    waitingSocket.partner = socket;

    socket.emit('partner-connected');
    waitingSocket.emit('partner-connected');

    waitingSocket = null;
  } else {
    waitingSocket = socket;
    socket.emit('waiting');
  }

  socket.on('send-msg', (msg) => {
    if (socket.partner) {
      socket.partner.emit('receive-msg', msg);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.id} Reason: ${reason}`);

    if (socket.partner) {
      socket.partner.emit('partner-left');
      socket.partner.partner = null;
    }
    if (waitingSocket === socket) {
      waitingSocket = null;
    }
  });
  socket.on('typing', () => {
    socket.broadcast.emit('typing');
  });

  socket.on('stop-typing', () => {
    socket.broadcast.emit('stop-typing');
  });
});
server.listen(3001, () => {
  console.log('🚀 Backend running on http://localhost:3001');
});
