const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

let waitingUser = null;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  if (waitingUser) {
    const partner = waitingUser;
    waitingUser = null;

    socket.partner = partner;
    partner.partner = socket;

    socket.emit('chat_start', { partnerId: partner.id });
    partner.emit('chat_start', { partnerId: socket.id });
  } else {
    waitingUser = socket;
    socket.emit('waiting');
  }

  socket.on('message', (msg) => {
    if (socket.partner) {
      socket.partner.emit('message', msg);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (waitingUser === socket) {
      waitingUser = null;
    }

    if (socket.partner) {
      socket.partner.emit('partner_disconnected');
      socket.partner.partner = null;
    }
  });
});

server.listen(5000, () => {
  console.log('Server listening on port 5000');
});
