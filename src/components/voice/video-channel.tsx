"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Volume2,
  VolumeX,
  Users,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Member, User } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocket } from "@/components/providers/socket-provider";
import { VideoManager } from "@/lib/video-manager";
import { AudioDeviceManager } from "@/lib/audio-device-manager";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

interface VideoChannelProps {
  channelId: string;
  channelName: string;
  currentMember: Member & { user: User };
  serverId: string;
}

interface VideoUser {
  id: string;
  username: string;
  imageUrl: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  hasVideo: boolean;
}

export const VideoChannel = ({
  channelId,
  channelName,
  currentMember,
  serverId,
}: VideoChannelProps) => {
  const { socket } = useSocket();
  const { onOpen } = useModal();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoUsers, setVideoUsers] = useState<VideoUser[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoManagerRef = useRef<VideoManager | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const audioDeviceManager = AudioDeviceManager.getInstance();

  // Connect to video channel
  const connectToVideo = async () => {
    try {
      // Use selected microphone and camera or defaults
      const selectedMic = audioDeviceManager.getSelectedMicrophone();
      const selectedCamera = audioDeviceManager.getSelectedCamera();

      console.log("Connecting with devices:", { selectedMic, selectedCamera });

      const stream = await audioDeviceManager.getAudioVideoStream(
        selectedMic || undefined,
        selectedCamera || undefined
      );

      console.log("Created stream:", stream);
      console.log("Audio tracks:", stream.getAudioTracks());
      console.log("Video tracks:", stream.getVideoTracks());

      setMediaStream(stream);
      setIsConnected(true);

      // Set up local video preview - this will now be handled by useEffect
      console.log("Local video ref:", localVideoRef.current);

      // Initialize WebRTC video manager
      if (socket) {
        videoManagerRef.current = new VideoManager(
          socket,
          currentMember.user.id
        );
        await videoManagerRef.current.joinVideoChannel(
          channelId,
          stream,
          isVideoEnabled
        );

        // Also join regular video channel for UI updates
        socket.emit("join-video-channel", {
          channelId,
          serverId,
          user: {
            id: currentMember.user.id,
            username: currentMember.user.username,
            imageUrl: currentMember.user.imageUrl,
            isMuted: false,
            isDeafened: false,
            isSpeaking: false,
            hasVideo: isVideoEnabled,
          },
        });
      }
    } catch (error) {
      console.error("Error accessing camera/microphone:", error);
    }
  };

  // Disconnect from video channel
  const disconnectFromVideo = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }

    // Cleanup WebRTC connections
    if (videoManagerRef.current) {
      videoManagerRef.current.leaveVideoChannel();
      videoManagerRef.current = null;
    }

    setIsConnected(false);
    setIsMuted(false);
    setIsDeafened(false);
    setIsVideoEnabled(true);

    if (socket) {
      socket.emit("leave-video-channel", {
        channelId,
        serverId,
        userId: currentMember.user.id,
      });
    }
  }, [mediaStream, socket, currentMember.user.id, channelId, serverId]);

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Update WebRTC stream
    if (videoManagerRef.current) {
      videoManagerRef.current.muteLocalAudio(newMutedState);
    }

    if (socket) {
      socket.emit("video-state-update", {
        channelId,
        userId: currentMember.user.id,
        isMuted: newMutedState,
        isDeafened,
        hasVideo: isVideoEnabled,
      });
    }
  };

  // Toggle deafen
  const toggleDeafen = () => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);

    // Deafening also mutes the user
    if (newDeafenState && !isMuted) {
      toggleMute();
    }

    if (socket) {
      socket.emit("video-state-update", {
        channelId,
        userId: currentMember.user.id,
        isMuted: newDeafenState ? true : isMuted,
        isDeafened: newDeafenState,
        hasVideo: isVideoEnabled,
      });
    }
  };

  // Toggle video
  const toggleVideo = () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);

    // Update WebRTC stream
    if (videoManagerRef.current) {
      videoManagerRef.current.toggleLocalVideo(newVideoState);
    }

    if (socket) {
      socket.emit("video-state-update", {
        channelId,
        userId: currentMember.user.id,
        isMuted,
        isDeafened,
        hasVideo: newVideoState,
      });
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleVideoUserJoined = (user: VideoUser) => {
      setVideoUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    };

    const handleVideoUserLeft = (userId: string) => {
      setVideoUsers((prev) => prev.filter((u) => u.id !== userId));
    };

    const handleVideoStateUpdate = (data: {
      userId: string;
      isMuted: boolean;
      isDeafened: boolean;
      hasVideo: boolean;
    }) => {
      setVideoUsers((prev) =>
        prev.map((user) =>
          user.id === data.userId
            ? {
                ...user,
                isMuted: data.isMuted,
                isDeafened: data.isDeafened,
                hasVideo: data.hasVideo,
              }
            : user
        )
      );
    };

    const handleVideoChannelUsers = (users: VideoUser[]) => {
      setVideoUsers(users);
    };

    socket.on("video-user-joined", handleVideoUserJoined);
    socket.on("video-user-left", handleVideoUserLeft);
    socket.on("video-state-update", handleVideoStateUpdate);
    socket.on("video-channel-users", handleVideoChannelUsers);

    return () => {
      socket.off("video-user-joined", handleVideoUserJoined);
      socket.off("video-user-left", handleVideoUserLeft);
      socket.off("video-state-update", handleVideoStateUpdate);
      socket.off("video-channel-users", handleVideoChannelUsers);
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnectFromVideo();
      }
      if (videoManagerRef.current) {
        videoManagerRef.current.cleanup();
      }
    };
  }, [isConnected, disconnectFromVideo]);

  // Handle local video stream updates
  useEffect(() => {
    if (mediaStream && localVideoRef.current) {
      console.log("Setting local video stream:", mediaStream);
      console.log("Video tracks:", mediaStream.getVideoTracks());

      // Check if video track is enabled
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log("Video track status:", {
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          muted: videoTrack.muted,
        });
      }

      localVideoRef.current.srcObject = mediaStream;

      // Try to play the video
      localVideoRef.current.play().catch((error) => {
        console.error("Error playing local video:", error);
      });
    }
  }, [mediaStream]);

  // Calculate grid layout based on number of users
  const getGridLayout = (userCount: number) => {
    if (userCount <= 1) return "grid-cols-1";
    if (userCount <= 4) return "grid-cols-2";
    if (userCount <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  const totalUsers = isConnected ? videoUsers.length + 1 : videoUsers.length;

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        isFullscreen && "fixed inset-0 z-50 bg-black"
      )}
    >
      {/* Video Channel Header */}
      {!isFullscreen && (
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-zinc-500" />
            <h2 className="font-semibold text-lg">{channelName}</h2>
            <Users className="w-4 h-4 text-zinc-500 ml-2" />
            <span className="text-sm text-zinc-500">{totalUsers}</span>
          </div>
          <Button onClick={toggleFullscreen} size="sm" variant="ghost">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 p-4">
        {isConnected ? (
          <div className="h-full">
            {/* Fullscreen header */}
            {isFullscreen && (
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  <h2 className="font-semibold text-lg">{channelName}</h2>
                  <Users className="w-4 h-4 ml-2" />
                  <span className="text-sm">{totalUsers}</span>
                </div>
                <Button
                  onClick={toggleFullscreen}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Video grid container */}
            <div
              id="video-grid-container"
              className={cn("grid gap-2 h-full", getGridLayout(totalUsers))}
            >
              {/* Local video */}
              <div className="relative bg-zinc-900 rounded-lg overflow-hidden">
                {/* Debug info */}
                <div className="absolute top-2 left-2 text-white text-xs bg-black/50 p-1 rounded z-10">
                  Video: {isVideoEnabled ? "ON" : "OFF"} | Stream:{" "}
                  {mediaStream ? "YES" : "NO"} | Tracks:{" "}
                  {mediaStream?.getVideoTracks().length || 0}
                </div>

                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  onLoadedMetadata={() =>
                    console.log("Local video loaded metadata")
                  }
                  onCanPlay={() => console.log("Local video can play")}
                  onError={(e) => console.error("Local video error:", e)}
                  onLoadStart={() => console.log("Local video load start")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: isVideoEnabled ? "block" : "none",
                  }}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={currentMember.user.imageUrl || ""} />
                      <AvatarFallback className="text-2xl">
                        {currentMember.user.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Local video overlay */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white text-sm">
                      <span className="bg-black/50 px-2 py-1 rounded">
                        {currentMember.user.username} (You)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isMuted && (
                        <div className="bg-red-500 p-1 rounded">
                          <MicOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {!isVideoEnabled && (
                        <div className="bg-red-500 p-1 rounded">
                          <VideoOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Remote videos - These will be populated by the VideoManager */}
              {videoUsers.map((user) => (
                <div
                  key={user.id}
                  className="relative bg-zinc-900 rounded-lg overflow-hidden"
                >
                  {/* Video element will be created by VideoManager */}
                  <div
                    id={`video-container-${user.id}`}
                    className="w-full h-full"
                  >
                    {!user.hasVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={user.imageUrl || ""} />
                          <AvatarFallback className="text-2xl">
                            {user.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>

                  {/* Remote video overlay */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-sm">
                        <span className="bg-black/50 px-2 py-1 rounded">
                          {user.username}
                        </span>
                        {user.isSpeaking && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {user.isMuted && (
                          <div className="bg-red-500 p-1 rounded">
                            <MicOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {!user.hasVideo && (
                          <div className="bg-red-500 p-1 rounded">
                            <VideoOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Not connected view */
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Video className="w-16 h-16 text-zinc-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Ready to start a video call?
                </h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Join the video channel to see and talk with others in
                  real-time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Controls */}
      <div
        className={cn(
          "p-4 border-t border-neutral-200 dark:border-neutral-800",
          isFullscreen &&
            "absolute bottom-4 left-1/2 transform -translate-x-1/2 border-none"
        )}
      >
        {!isConnected ? (
          <Button onClick={connectToVideo} className="w-full" variant="default">
            <Video className="w-4 h-4 mr-2" />
            Join Video Channel
          </Button>
        ) : (
          <div
            className={cn(
              "flex items-center justify-center gap-2",
              isFullscreen && "bg-black/50 backdrop-blur rounded-lg p-4"
            )}
          >
            <Button
              onClick={toggleMute}
              size="icon"
              variant={isMuted ? "destructive" : "secondary"}
              className={cn(
                "w-12 h-12 rounded-full",
                isMuted && "bg-red-500 hover:bg-red-600"
              )}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>

            <Button
              onClick={toggleVideo}
              size="icon"
              variant={!isVideoEnabled ? "destructive" : "secondary"}
              className={cn(
                "w-12 h-12 rounded-full",
                !isVideoEnabled && "bg-red-500 hover:bg-red-600"
              )}
            >
              {!isVideoEnabled ? (
                <VideoOff className="w-5 h-5" />
              ) : (
                <Video className="w-5 h-5" />
              )}
            </Button>

            <Button
              onClick={toggleDeafen}
              size="icon"
              variant={isDeafened ? "destructive" : "secondary"}
              className={cn(
                "w-12 h-12 rounded-full",
                isDeafened && "bg-red-500 hover:bg-red-600"
              )}
            >
              {isDeafened ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>

            <Button
              onClick={disconnectFromVideo}
              size="icon"
              variant="destructive"
              className="w-12 h-12 rounded-full"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>

            <Button
              onClick={() => onOpen("settings")}
              size="icon"
              variant="ghost"
              className={cn(
                "w-12 h-12 rounded-full",
                isFullscreen && "text-white hover:bg-white/20"
              )}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
