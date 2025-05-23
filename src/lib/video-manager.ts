import Peer from "simple-peer";
import { Socket } from "socket.io-client";

interface VideoConnection {
  peer: Peer.Instance;
  userId: string;
  stream?: MediaStream;
  audioElement?: HTMLAudioElement;
  videoElement?: HTMLVideoElement;
}

export class VideoManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private connections: Map<string, VideoConnection> = new Map();
  private channelId: string | null = null;
  private userId: string;
  private isVideoEnabled: boolean = false;

  constructor(socket: Socket, userId: string) {
    this.socket = socket;
    this.userId = userId;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on("video-offer", this.handleOffer.bind(this));
    this.socket.on("video-answer", this.handleAnswer.bind(this));
    this.socket.on("video-ice-candidate", this.handleIceCandidate.bind(this));
    this.socket.on("video-user-joined", this.handleUserJoined.bind(this));
    this.socket.on("video-user-left", this.handleUserLeft.bind(this));
  }

  async joinVideoChannel(
    channelId: string,
    stream: MediaStream,
    enableVideo: boolean = true
  ) {
    this.channelId = channelId;
    this.localStream = stream;
    this.isVideoEnabled = enableVideo;

    // Request to join video channel
    this.socket.emit("join-video-channel-webrtc", {
      channelId,
      userId: this.userId,
      hasVideo: enableVideo,
    });
  }

  leaveVideoChannel() {
    if (this.channelId) {
      // Close all peer connections
      this.connections.forEach((connection) => {
        connection.peer.destroy();
        // Clean up audio/video elements
        if (connection.audioElement) {
          connection.audioElement.remove();
        }
        if (connection.videoElement) {
          connection.videoElement.remove();
        }
      });
      this.connections.clear();

      this.socket.emit("leave-video-channel-webrtc", {
        channelId: this.channelId,
        userId: this.userId,
      });

      this.channelId = null;
      this.localStream = null;
      this.isVideoEnabled = false;
    }
  }

  private async handleUserJoined(data: { userId: string; hasVideo: boolean }) {
    if (data.userId === this.userId || !this.localStream) return;

    // Create peer connection for new user (we initiate)
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: this.localStream,
    });

    this.setupPeerEvents(peer, data.userId, data.hasVideo);
    this.connections.set(data.userId, { peer, userId: data.userId });
  }

  private async handleOffer(data: {
    userId: string;
    signal: Peer.SignalData;
    hasVideo: boolean;
  }) {
    if (data.userId === this.userId || !this.localStream) return;

    // Create peer connection for incoming offer
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: this.localStream,
    });

    this.setupPeerEvents(peer, data.userId, data.hasVideo);
    this.connections.set(data.userId, { peer, userId: data.userId });

    peer.signal(data.signal);
  }

  private handleAnswer(data: { userId: string; signal: Peer.SignalData }) {
    const connection = this.connections.get(data.userId);
    if (connection) {
      connection.peer.signal(data.signal);
    }
  }

  private handleIceCandidate(data: {
    userId: string;
    signal: Peer.SignalData;
  }) {
    const connection = this.connections.get(data.userId);
    if (connection) {
      connection.peer.signal(data.signal);
    }
  }

  private handleUserLeft(data: { userId: string }) {
    const connection = this.connections.get(data.userId);
    if (connection) {
      connection.peer.destroy();
      // Clean up audio/video elements
      if (connection.audioElement) {
        connection.audioElement.remove();
      }
      if (connection.videoElement) {
        connection.videoElement.remove();
      }
      this.connections.delete(data.userId);
    }
  }

  private setupPeerEvents(
    peer: Peer.Instance,
    userId: string,
    hasVideo: boolean
  ) {
    peer.on("signal", (signal) => {
      const connection = this.connections.get(userId);
      if (connection && connection.peer === peer) {
        if (signal.type === "offer") {
          this.socket.emit("video-offer", {
            targetUserId: userId,
            signal,
            channelId: this.channelId,
            hasVideo: this.isVideoEnabled,
          });
        } else if (signal.type === "answer") {
          this.socket.emit("video-answer", {
            targetUserId: userId,
            signal,
            channelId: this.channelId,
          });
        } else {
          this.socket.emit("video-ice-candidate", {
            targetUserId: userId,
            signal,
            channelId: this.channelId,
          });
        }
      }
    });

    peer.on("stream", (stream) => {
      // Handle incoming audio/video stream
      const connection = this.connections.get(userId);
      if (connection) {
        connection.stream = stream;
        this.playMediaStream(stream, userId, hasVideo);
      }
    });

    peer.on("error", (err) => {
      console.error("Peer connection error:", err);
      this.connections.delete(userId);
    });

    peer.on("close", () => {
      console.log("Peer connection closed for user:", userId);
      this.connections.delete(userId);
    });
  }

  private playMediaStream(
    stream: MediaStream,
    userId: string,
    hasVideo: boolean
  ) {
    const connection = this.connections.get(userId);
    if (!connection) return;

    // Always create audio element
    const audioId = `video-audio-${userId}`;
    let audioElement = document.getElementById(audioId) as HTMLAudioElement;

    if (!audioElement) {
      audioElement = document.createElement("audio");
      audioElement.id = audioId;
      audioElement.autoplay = true;
      audioElement.style.display = "none";
      document.body.appendChild(audioElement);
      connection.audioElement = audioElement;
    }

    audioElement.srcObject = stream;

    // Create video element if stream has video
    if (hasVideo && stream.getVideoTracks().length > 0) {
      const videoId = `video-element-${userId}`;
      let videoElement = document.getElementById(videoId) as HTMLVideoElement;

      if (!videoElement) {
        videoElement = document.createElement("video");
        videoElement.id = videoId;
        videoElement.autoplay = true;
        videoElement.muted = true; // Video element should be muted to prevent echo
        videoElement.playsInline = true;
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "cover";

        // Append to the specific user's React container
        const container = document.getElementById(`video-container-${userId}`);
        if (container) {
          container.appendChild(videoElement);
        }

        connection.videoElement = videoElement;
      }

      videoElement.srcObject = stream;
    }
  }

  // Public methods for controlling media
  muteLocalAudio(muted: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !muted;
      }
    }
  }

  toggleLocalVideo(enabled?: boolean) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = enabled !== undefined ? enabled : !videoTrack.enabled;
        videoTrack.enabled = newState;
        this.isVideoEnabled = newState;

        // Notify other users about video state change
        if (this.socket && this.channelId) {
          this.socket.emit("video-state-update", {
            channelId: this.channelId,
            userId: this.userId,
            hasVideo: newState,
          });
        }

        return newState;
      }
    }
    return false;
  }

  setOutputVolume(userId: string, volume: number) {
    const audioElement = document.getElementById(
      `video-audio-${userId}`
    ) as HTMLAudioElement;
    if (audioElement) {
      audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // Get video element for a specific user (for React integration)
  getVideoElement(userId: string): HTMLVideoElement | null {
    return document.getElementById(
      `video-element-${userId}`
    ) as HTMLVideoElement;
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get connected users
  getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  // Check if video is enabled
  isVideoChannelEnabled(): boolean {
    return this.isVideoEnabled;
  }

  cleanup() {
    this.leaveVideoChannel();
    this.socket.off("video-offer");
    this.socket.off("video-answer");
    this.socket.off("video-ice-candidate");
    this.socket.off("video-user-joined");
    this.socket.off("video-user-left");
  }
}
