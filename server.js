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
    path: "/socket.io/",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // Enhanced logging to catch all events
    socket.onAny((eventName, ...args) => {
      console.log(`🎯 Event received: ${eventName}`, args);
    });

    // Test event handler to verify communication
    socket.on("test-video-event", (data) => {
      console.log("🧪 TEST EVENT RECEIVED:", data);
      socket.emit("test-response", {
        message: "Server received test event",
        data,
      });
    });

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

    // Video channel events
    socket.on("join-video-channel", (data) => {
      const { channelId, serverId, user } = data;
      const videoRoomKey = `video:${channelId}`;

      console.log(
        `🎥 Socket ${socket.id} joining video channel ${channelId} with user:`,
        user
      );

      // Set socket properties BEFORE joining room
      socket.videoChannelId = channelId;
      socket.videoUserId = user.id;
      socket.videoUser = user;

      socket.join(videoRoomKey);

      console.log(`✅ Socket ${socket.id} joined video channel ${channelId}`);

      // Get current room state before notifying
      const roomSockets = io.sockets.adapter.rooms.get(videoRoomKey);
      console.log(
        `👥 Room ${videoRoomKey} now has ${
          roomSockets ? roomSockets.size : 0
        } sockets total`
      );

      // Send current video users to the newly joined user
      const videoUsers = [];

      if (roomSockets) {
        console.log(`🔍 Checking all sockets in room ${videoRoomKey}:`);
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          console.log(`  - Socket ${socketId}:`, {
            hasSocket: !!roomSocket,
            hasVideoUser: !!roomSocket?.videoUser,
            videoUser: roomSocket?.videoUser,
            isNotSelf: socketId !== socket.id,
          });

          if (roomSocket && roomSocket.videoUser && socketId !== socket.id) {
            console.log(`✅ Found existing video user:`, roomSocket.videoUser);
            videoUsers.push(roomSocket.videoUser);
          }
        });
      }

      console.log(
        `📋 Sending ${videoUsers.length} existing video users to socket ${socket.id}:`,
        videoUsers
      );
      socket.emit("video-channel-users", videoUsers);

      // Notify others in the video channel about the new user
      console.log(
        `📢 Notifying ${
          roomSockets ? roomSockets.size - 1 : 0
        } other sockets in room ${videoRoomKey} about new user:`,
        user
      );
      socket.to(videoRoomKey).emit("video-user-joined", user);

      console.log(`🎥 Video channel join complete for ${socket.id}`);
    });

    socket.on("leave-video-channel", (data) => {
      const { channelId, userId } = data;
      const videoRoomKey = `video:${channelId}`;

      console.log(`🚪 Socket ${socket.id} leaving video channel ${channelId}`);

      socket.leave(videoRoomKey);

      // Notify others in the video channel
      console.log(`📢 Notifying others that user ${userId} left video channel`);
      socket.to(videoRoomKey).emit("video-user-left", userId);

      socket.videoChannelId = null;
      socket.videoUserId = null;
      socket.videoUser = null;

      console.log(`✅ Socket ${socket.id} left video channel ${channelId}`);
    });

    socket.on("video-state-update", (data) => {
      const { channelId, userId, isMuted, isDeafened, hasVideo } = data;
      const videoRoomKey = `video:${channelId}`;

      console.log(`🔄 Video state update for user ${userId}:`, {
        isMuted,
        isDeafened,
        hasVideo,
      });

      // Update socket's video user state
      if (socket.videoUser) {
        socket.videoUser.isMuted = isMuted;
        socket.videoUser.isDeafened = isDeafened;
        socket.videoUser.hasVideo = hasVideo;
        console.log(`✅ Updated socket ${socket.id} video user state`);
      }

      // Broadcast state update to others in the video channel
      console.log(`📢 Broadcasting state update to room ${videoRoomKey}`);
      socket.to(videoRoomKey).emit("video-state-update", {
        userId,
        isMuted,
        isDeafened,
        hasVideo,
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

    socket.on("join-video-channel-webrtc", (data) => {
      const { channelId, userId, hasVideo } = data;
      const videoRoomKey = `video:${channelId}`;

      socket.join(videoRoomKey);
      socket.videoChannelId = channelId;
      socket.videoUserId = userId;

      // Notify others about new user for WebRTC connections
      socket.to(videoRoomKey).emit("video-user-joined", { userId, hasVideo });
    });

    socket.on("leave-voice-channel-webrtc", (data) => {
      const { channelId, userId } = data;
      const voiceRoomKey = `voice:${channelId}`;

      socket.leave(voiceRoomKey);
      socket.to(voiceRoomKey).emit("voice-user-left", { userId });

      socket.voiceChannelId = null;
      socket.voiceUserId = null;
    });

    socket.on("leave-video-channel-webrtc", (data) => {
      const { channelId, userId } = data;
      const videoRoomKey = `video:${channelId}`;

      socket.leave(videoRoomKey);
      socket.to(videoRoomKey).emit("video-user-left", { userId });

      socket.videoChannelId = null;
      socket.videoUserId = null;
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

    // Video WebRTC signaling events
    socket.on("video-offer", (data) => {
      const { targetUserId, signal, channelId, hasVideo } = data;
      const videoRoomKey = `video:${channelId}`;

      // Find target socket and send offer
      const roomSockets = io.sockets.adapter.rooms.get(videoRoomKey);
      if (roomSockets) {
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          if (roomSocket && roomSocket.videoUserId === targetUserId) {
            roomSocket.emit("video-offer", {
              userId: socket.videoUserId,
              signal,
              hasVideo,
            });
          }
        });
      }
    });

    socket.on("video-answer", (data) => {
      const { targetUserId, signal, channelId } = data;
      const videoRoomKey = `video:${channelId}`;

      // Find target socket and send answer
      const roomSockets = io.sockets.adapter.rooms.get(videoRoomKey);
      if (roomSockets) {
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          if (roomSocket && roomSocket.videoUserId === targetUserId) {
            roomSocket.emit("video-answer", {
              userId: socket.videoUserId,
              signal,
            });
          }
        });
      }
    });

    socket.on("video-ice-candidate", (data) => {
      const { targetUserId, signal, channelId } = data;
      const videoRoomKey = `video:${channelId}`;

      // Find target socket and send ICE candidate
      const roomSockets = io.sockets.adapter.rooms.get(videoRoomKey);
      if (roomSockets) {
        roomSockets.forEach((socketId) => {
          const roomSocket = io.sockets.sockets.get(socketId);
          if (roomSocket && roomSocket.videoUserId === targetUserId) {
            roomSocket.emit("video-ice-candidate", {
              userId: socket.videoUserId,
              signal,
            });
          }
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);

      // Handle voice channel cleanup
      if (socket.voiceChannelId && socket.voiceUserId) {
        const voiceRoomKey = `voice:${socket.voiceChannelId}`;
        console.log(
          `🎙️ Cleaning up voice channel ${socket.voiceChannelId} for user ${socket.voiceUserId}`
        );
        socket.to(voiceRoomKey).emit("voice-user-left", socket.voiceUserId);
      }

      // Handle video channel cleanup
      if (socket.videoChannelId && socket.videoUserId) {
        const videoRoomKey = `video:${socket.videoChannelId}`;
        console.log(
          `🎥 Cleaning up video channel ${socket.videoChannelId} for user ${socket.videoUserId}`
        );
        socket.to(videoRoomKey).emit("video-user-left", socket.videoUserId);
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
