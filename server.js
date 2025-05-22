const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    path: "/api/socket/io",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Text channel events
    socket.on("join-channel", (channelId) => {
      socket.join(channelId);
      console.log(`Socket ${socket.id} joined channel ${channelId}`);
    });

    socket.on("leave-channel", (channelId) => {
      socket.leave(channelId);
      console.log(`Socket ${socket.id} left channel ${channelId}`);
    });

    // Voice channel events
    socket.on("join-voice-channel", (data) => {
      const { channelId, serverId, user } = data;
      const voiceRoomKey = `voice:${channelId}`;

      socket.join(voiceRoomKey);
      socket.voiceChannelId = channelId;
      socket.voiceUserId = user.id;

      console.log(`Socket ${socket.id} joined voice channel ${channelId}`);

      // Notify others in the voice channel
      socket.to(voiceRoomKey).emit("voice-user-joined", user);

      // Send current voice users to the newly joined user
      const voiceUsers = [];
      const roomSockets = io.sockets.adapter.rooms.get(voiceRoomKey);
      if (roomSockets) {
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          if (roomSocket && roomSocket.voiceUser && socketId !== socket.id) {
            voiceUsers.push(roomSocket.voiceUser);
          }
        });
      }

      socket.voiceUser = user;
      socket.emit("voice-channel-users", voiceUsers);
    });

    socket.on("leave-voice-channel", (data) => {
      const { channelId, userId } = data;
      const voiceRoomKey = `voice:${channelId}`;

      socket.leave(voiceRoomKey);
      console.log(`Socket ${socket.id} left voice channel ${channelId}`);

      // Notify others in the voice channel
      socket.to(voiceRoomKey).emit("voice-user-left", userId);

      socket.voiceChannelId = null;
      socket.voiceUserId = null;
      socket.voiceUser = null;
    });

        socket.on("voice-state-update", (data) => {
      const { channelId, userId, isMuted, isDeafened } = data;
      const voiceRoomKey = `voice:${channelId}`;

      // Update socket's voice user state
      if (socket.voiceUser) {
        socket.voiceUser.isMuted = isMuted;
        socket.voiceUser.isDeafened = isDeafened;
      }

      // Broadcast state update to others in the voice channel
      socket.to(voiceRoomKey).emit("voice-state-update", {
        userId,
        isMuted,
        isDeafened,
      });
    });

    // WebRTC signaling events
    socket.on("join-voice-channel-webrtc", (data) => {
      const { channelId, userId } = data;
      const voiceRoomKey = `voice:${channelId}`;

      socket.join(voiceRoomKey);
      socket.voiceChannelId = channelId;
      socket.voiceUserId = userId;

      // Notify others about new user for WebRTC connections
      socket.to(voiceRoomKey).emit("voice-user-joined", { userId });
    });

    socket.on("leave-voice-channel-webrtc", (data) => {
      const { channelId, userId } = data;
      const voiceRoomKey = `voice:${channelId}`;

      socket.leave(voiceRoomKey);
      socket.to(voiceRoomKey).emit("voice-user-left", { userId });

      socket.voiceChannelId = null;
      socket.voiceUserId = null;
    });

    socket.on("voice-offer", (data) => {
      const { targetUserId, signal, channelId } = data;
      const voiceRoomKey = `voice:${channelId}`;

      // Find target socket and send offer
      const roomSockets = io.sockets.adapter.rooms.get(voiceRoomKey);
      if (roomSockets) {
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          if (roomSocket && roomSocket.voiceUserId === targetUserId) {
            roomSocket.emit("voice-offer", {
              userId: socket.voiceUserId,
              signal,
            });
          }
        });
      }
    });

    socket.on("voice-answer", (data) => {
      const { targetUserId, signal, channelId } = data;
      const voiceRoomKey = `voice:${channelId}`;

      // Find target socket and send answer
      const roomSockets = io.sockets.adapter.rooms.get(voiceRoomKey);
      if (roomSockets) {
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          if (roomSocket && roomSocket.voiceUserId === targetUserId) {
            roomSocket.emit("voice-answer", {
              userId: socket.voiceUserId,
              signal,
            });
          }
        });
      }
    });

    socket.on("voice-ice-candidate", (data) => {
      const { targetUserId, signal, channelId } = data;
      const voiceRoomKey = `voice:${channelId}`;

      // Find target socket and send ICE candidate
      const roomSockets = io.sockets.adapter.rooms.get(voiceRoomKey);
      if (roomSockets) {
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          if (roomSocket && roomSocket.voiceUserId === targetUserId) {
            roomSocket.emit("voice-ice-candidate", {
              userId: socket.voiceUserId,
              signal,
            });
          }
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);

      // Handle voice channel cleanup
      if (socket.voiceChannelId && socket.voiceUserId) {
        const voiceRoomKey = `voice:${socket.voiceChannelId}`;
        socket.to(voiceRoomKey).emit("voice-user-left", socket.voiceUserId);
      }
    });
  });

  // Store the io instance globally so we can access it from API routes
  global.io = io;

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
