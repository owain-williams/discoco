import Peer from "simple-peer";
import { Socket } from "socket.io-client";

interface VoiceConnection {
  peer: Peer.Instance;
  userId: string;
  stream?: MediaStream;
}

export class VoiceManager {
  private socket: Socket;
  private localStream: MediaStream | null = null;
  private connections: Map<string, VoiceConnection> = new Map();
  private channelId: string | null = null;
  private userId: string;

  constructor(socket: Socket, userId: string) {
    this.socket = socket;
    this.userId = userId;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    this.socket.on("voice-offer", this.handleOffer.bind(this));
    this.socket.on("voice-answer", this.handleAnswer.bind(this));
    this.socket.on("voice-ice-candidate", this.handleIceCandidate.bind(this));
    this.socket.on("voice-user-joined", this.handleUserJoined.bind(this));
    this.socket.on("voice-user-left", this.handleUserLeft.bind(this));
  }

  async joinVoiceChannel(channelId: string, stream: MediaStream) {
    this.channelId = channelId;
    this.localStream = stream;

    // Request to join voice channel
    this.socket.emit("join-voice-channel-webrtc", {
      channelId,
      userId: this.userId,
    });
  }

  leaveVoiceChannel() {
    if (this.channelId) {
      // Close all peer connections
      this.connections.forEach((connection) => {
        connection.peer.destroy();
      });
      this.connections.clear();

      this.socket.emit("leave-voice-channel-webrtc", {
        channelId: this.channelId,
        userId: this.userId,
      });

      this.channelId = null;
      this.localStream = null;
    }
  }

  private async handleUserJoined(data: { userId: string }) {
    if (data.userId === this.userId || !this.localStream) return;

    // Create peer connection for new user (we initiate)
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: this.localStream,
    });

    this.setupPeerEvents(peer, data.userId);
    this.connections.set(data.userId, { peer, userId: data.userId });
  }

  private async handleOffer(data: { userId: string; signal: Peer.SignalData }) {
    if (data.userId === this.userId || !this.localStream) return;

    // Create peer connection for incoming offer
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: this.localStream,
    });

    this.setupPeerEvents(peer, data.userId);
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
      this.connections.delete(data.userId);
    }
  }

  private setupPeerEvents(peer: Peer.Instance, userId: string) {
    peer.on("signal", (signal) => {
      const connection = this.connections.get(userId);
      if (connection && connection.peer === peer) {
        if (signal.type === "offer") {
          this.socket.emit("voice-offer", {
            targetUserId: userId,
            signal,
            channelId: this.channelId,
          });
        } else if (signal.type === "answer") {
          this.socket.emit("voice-answer", {
            targetUserId: userId,
            signal,
            channelId: this.channelId,
          });
        } else {
          this.socket.emit("voice-ice-candidate", {
            targetUserId: userId,
            signal,
            channelId: this.channelId,
          });
        }
      }
    });

    peer.on("stream", (stream) => {
      // Handle incoming audio stream
      const connection = this.connections.get(userId);
      if (connection) {
        connection.stream = stream;
        this.playAudioStream(stream, userId);
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

  private playAudioStream(stream: MediaStream, userId: string) {
    // Create audio element for this user's stream
    const audioId = `voice-audio-${userId}`;
    let audioElement = document.getElementById(audioId) as HTMLAudioElement;

    if (!audioElement) {
      audioElement = document.createElement("audio");
      audioElement.id = audioId;
      audioElement.autoplay = true;
      audioElement.style.display = "none";
      document.body.appendChild(audioElement);
    }

    audioElement.srcObject = stream;
  }

  // Public methods for controlling audio
  muteLocalStream(muted: boolean) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !muted;
      }
    }
  }

  setOutputVolume(userId: string, volume: number) {
    const audioElement = document.getElementById(
      `voice-audio-${userId}`
    ) as HTMLAudioElement;
    if (audioElement) {
      audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  cleanup() {
    this.leaveVoiceChannel();
    this.socket.off("voice-offer");
    this.socket.off("voice-answer");
    this.socket.off("voice-ice-candidate");
    this.socket.off("voice-user-joined");
    this.socket.off("voice-user-left");
  }
}
