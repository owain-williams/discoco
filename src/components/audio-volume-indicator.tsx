"use client";

import { useEffect, useState, useRef } from "react";
import { AudioDeviceManager } from "@/lib/audio-device-manager";

interface AudioVolumeIndicatorProps {
  deviceId?: string;
  isActive?: boolean;
}

export const AudioVolumeIndicator = ({
  deviceId,
  isActive = false,
}: AudioVolumeIndicatorProps) => {
  const [volume, setVolume] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const audioManager = AudioDeviceManager.getInstance();

  useEffect(() => {
    const monitorVolume = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedVolume = Math.min(average / 128, 1); // Normalize to 0-1

      setVolume(normalizedVolume);

      // Continue monitoring
      animationRef.current = requestAnimationFrame(monitorVolume);
    };

    const startListening = async () => {
      try {
        setIsListening(true);

        // Get microphone stream
        const stream = deviceId
          ? await audioManager.getMicrophoneStream(deviceId)
          : await navigator.mediaDevices.getUserMedia({ audio: true });

        streamRef.current = stream;

        // Set up audio context and analyser
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Start volume monitoring
        monitorVolume();
      } catch (error) {
        console.error("Error starting volume monitoring:", error);
        setIsListening(false);
      }
    };

    if (isActive && deviceId) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isActive, deviceId, audioManager]);

  const stopListening = () => {
    setIsListening(false);
    setVolume(0);

    // Cancel animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {/* Volume bars */}
        {[...Array(10)].map((_, i) => {
          const threshold = (i + 1) / 10;
          const isActive = volume >= threshold;

          return (
            <div
              key={i}
              className={`w-1 h-4 rounded-sm transition-colors duration-75 ${
                isActive
                  ? volume > 0.7
                    ? "bg-red-500" // High volume (red)
                    : volume > 0.3
                    ? "bg-yellow-500" // Medium volume (yellow)
                    : "bg-green-500" // Low volume (green)
                  : "bg-zinc-300 dark:bg-zinc-600" // Inactive
              }`}
            />
          );
        })}
      </div>

      <div className="text-xs text-zinc-500 min-w-[60px]">
        {isListening ? (
          <span>{Math.round(volume * 100)}%</span>
        ) : (
          <span>Silent</span>
        )}
      </div>
    </div>
  );
};
