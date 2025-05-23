"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Volume2,
  VolumeX,
  Users,
} from "lucide-react";
import { Member, User } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSocket } from "@/components/providers/socket-provider";
import { VoiceManager } from "@/lib/voice-manager";
import { AudioDeviceManager } from "@/lib/audio-device-manager";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
  currentMember: Member & { user: User };
  serverId: string;
}

interface VoiceUser {
  id: string;
  username: string;
  imageUrl: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}

export const VoiceChannel = ({
  channelId,
  channelName,
  currentMember,
  serverId,
}: VoiceChannelProps) => {
  const { socket } = useSocket();
  const { onOpen } = useModal();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const voiceManagerRef = useRef<VoiceManager | null>(null);
  const audioDeviceManager = AudioDeviceManager.getInstance();

  // Connect to voice channel
  const connectToVoice = async () => {
    try {
      // Use selected microphone or default
      const selectedMic = audioDeviceManager.getSelectedMicrophone();
      const stream = selectedMic
        ? await audioDeviceManager.getMicrophoneStream(selectedMic)
        : await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
      setMediaStream(stream);
      setIsConnected(true);

      // Initialize WebRTC voice manager
      if (socket) {
        voiceManagerRef.current = new VoiceManager(
          socket,
          currentMember.user.id
        );
        await voiceManagerRef.current.joinVoiceChannel(channelId, stream);

        // Also join regular voice channel for UI updates
        socket.emit("join-voice-channel", {
          channelId,
          serverId,
          user: {
            id: currentMember.user.id,
            username: currentMember.user.username,
            imageUrl: currentMember.user.imageUrl,
            isMuted: false,
            isDeafened: false,
            isSpeaking: false,
          },
        });
      }
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  // Disconnect from voice channel
  const disconnectFromVoice = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }

    // Cleanup WebRTC connections
    if (voiceManagerRef.current) {
      voiceManagerRef.current.leaveVoiceChannel();
      voiceManagerRef.current = null;
    }

    setIsConnected(false);
    setIsMuted(false);
    setIsDeafened(false);

    if (socket) {
      socket.emit("leave-voice-channel", {
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
    if (voiceManagerRef.current) {
      voiceManagerRef.current.muteLocalStream(newMutedState);
    }

    if (socket) {
      socket.emit("voice-state-update", {
        channelId,
        userId: currentMember.user.id,
        isMuted: newMutedState,
        isDeafened,
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
      socket.emit("voice-state-update", {
        channelId,
        userId: currentMember.user.id,
        isMuted: newDeafenState ? true : isMuted,
        isDeafened: newDeafenState,
      });
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleVoiceUserJoined = (user: VoiceUser) => {
      setVoiceUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
    };

    const handleVoiceUserLeft = (userId: string) => {
      setVoiceUsers((prev) => prev.filter((u) => u.id !== userId));
    };

    const handleVoiceStateUpdate = (data: {
      userId: string;
      isMuted: boolean;
      isDeafened: boolean;
    }) => {
      setVoiceUsers((prev) =>
        prev.map((user) =>
          user.id === data.userId
            ? { ...user, isMuted: data.isMuted, isDeafened: data.isDeafened }
            : user
        )
      );
    };

    const handleVoiceChannelUsers = (users: VoiceUser[]) => {
      setVoiceUsers(users);
    };

    socket.on("voice-user-joined", handleVoiceUserJoined);
    socket.on("voice-user-left", handleVoiceUserLeft);
    socket.on("voice-state-update", handleVoiceStateUpdate);
    socket.on("voice-channel-users", handleVoiceChannelUsers);

    return () => {
      socket.off("voice-user-joined", handleVoiceUserJoined);
      socket.off("voice-user-left", handleVoiceUserLeft);
      socket.off("voice-state-update", handleVoiceStateUpdate);
      socket.off("voice-channel-users", handleVoiceChannelUsers);
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnectFromVoice();
      }
      if (voiceManagerRef.current) {
        voiceManagerRef.current.cleanup();
      }
    };
  }, [isConnected, disconnectFromVoice]);

  return (
    <div className="flex flex-col h-full">
      {/* Voice Channel Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-zinc-500" />
          <h2 className="font-semibold text-lg">{channelName}</h2>
          <Users className="w-4 h-4 text-zinc-500 ml-2" />
          <span className="text-sm text-zinc-500">{voiceUsers.length}</span>
        </div>
      </div>

      {/* Voice Users List */}
      <div className="flex-1 p-4 space-y-2">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-4">
          In Voice — {voiceUsers.length}
        </h3>

        {voiceUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.imageUrl || ""} />
                <AvatarFallback>
                  {user.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {user.isSpeaking && (
                <div className="absolute -inset-1 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium">{user.username}</p>
            </div>

            <div className="flex items-center gap-1">
              {user.isMuted && <MicOff className="w-4 h-4 text-red-500" />}
              {user.isDeafened && <VolumeX className="w-4 h-4 text-red-500" />}
            </div>
          </div>
        ))}

        {voiceUsers.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">
            No one is in this voice channel yet.
          </p>
        )}
      </div>

      {/* Voice Controls */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        {!isConnected ? (
          <Button onClick={connectToVoice} className="w-full" variant="default">
            <Volume2 className="w-4 h-4 mr-2" />
            Join Voice Channel
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={toggleMute}
              size="icon"
              variant={isMuted ? "destructive" : "secondary"}
              className={cn(
                "w-10 h-10 rounded-full",
                isMuted && "bg-red-500 hover:bg-red-600"
              )}
            >
              {isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={toggleDeafen}
              size="icon"
              variant={isDeafened ? "destructive" : "secondary"}
              className={cn(
                "w-10 h-10 rounded-full",
                isDeafened && "bg-red-500 hover:bg-red-600"
              )}
            >
              {isDeafened ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={disconnectFromVoice}
              size="icon"
              variant="destructive"
              className="w-10 h-10 rounded-full"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => onOpen("settings")}
              size="icon"
              variant="ghost"
              className="w-10 h-10 rounded-full"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
