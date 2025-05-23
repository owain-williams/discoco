"use client";

import { useEffect, useState } from "react";
import {
  AudioDeviceManager,
  AudioDevice,
  VideoDevice,
} from "@/lib/audio-device-manager";
import { AudioVolumeIndicator } from "@/components/audio-volume-indicator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Volume2, Mic, TestTube, Video } from "lucide-react";

export const AudioDeviceSettings = () => {
  const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
  const [speakers, setSpeakers] = useState<AudioDevice[]>([]);
  const [cameras, setCameras] = useState<VideoDevice[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string | null>(
    null
  );
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [testing, setTesting] = useState<{
    mic: boolean;
    speaker: boolean;
    camera: boolean;
  }>({
    mic: false,
    speaker: false,
    camera: false,
  });
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  const audioManager = AudioDeviceManager.getInstance();

  useEffect(() => {
    loadDevices();
    loadSavedSelections();
  }, []);

  // Handle camera preview
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCameraPreview = async () => {
      if (showCameraPreview && selectedCamera) {
        try {
          stream = await audioManager.getCameraStream(selectedCamera);
          const video = document.getElementById("camera-preview") as HTMLVideoElement;
          if (video) {
            video.srcObject = stream;
          }
        } catch (error) {
          console.error("Error starting camera preview:", error);
          setShowCameraPreview(false);
        }
      }
    };

    const stopCameraPreview = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      const video = document.getElementById("camera-preview") as HTMLVideoElement;
      if (video) {
        video.srcObject = null;
      }
    };

    if (showCameraPreview) {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }

    return () => {
      stopCameraPreview();
    };
  }, [showCameraPreview, selectedCamera]);

  const loadDevices = async () => {
    try {
      const devices = await audioManager.getAvailableDevices();
      setMicrophones(devices.microphones);
      setSpeakers(devices.speakers);
      setCameras(devices.cameras);
    } catch (error) {
      console.error("Failed to load audio/video devices:", error);
    }
  };

  const loadSavedSelections = () => {
    const savedMic = audioManager.getSelectedMicrophone();
    const savedSpeaker = audioManager.getSelectedSpeaker();
    const savedCamera = audioManager.getSelectedCamera();

    if (savedMic) setSelectedMicrophone(savedMic);
    if (savedSpeaker) setSelectedSpeaker(savedSpeaker);
    if (savedCamera) setSelectedCamera(savedCamera);
  };

  const handleMicrophoneChange = (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    audioManager.setSelectedMicrophone(deviceId);
  };

  const handleSpeakerChange = (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    audioManager.setSelectedSpeaker(deviceId);
  };

  const handleCameraChange = (deviceId: string) => {
    setSelectedCamera(deviceId);
    audioManager.setSelectedCamera(deviceId);
  };

  const testMicrophone = async () => {
    if (!selectedMicrophone) return;

    setTesting((prev) => ({ ...prev, mic: true }));
    try {
      const result = await audioManager.testMicrophone(selectedMicrophone);
      alert(
        result
          ? "Microphone test successful!"
          : "Microphone test failed. Check your device."
      );
    } catch (error) {
      alert("Microphone test failed. Check your device and permissions.");
    } finally {
      setTesting((prev) => ({ ...prev, mic: false }));
    }
  };

  const testSpeaker = async () => {
    if (!selectedSpeaker) return;

    setTesting((prev) => ({ ...prev, speaker: true }));
    try {
      const result = await audioManager.testSpeaker(selectedSpeaker);
      alert(
        result
          ? "Speaker test successful!"
          : "Speaker test failed. Check your device."
      );
    } catch (error) {
      alert("Speaker test failed. Check your device.");
    } finally {
      setTesting((prev) => ({ ...prev, speaker: false }));
    }
  };

  const testCamera = async () => {
    if (!selectedCamera) return;

    setTesting((prev) => ({ ...prev, camera: true }));
    try {
      const result = await audioManager.testCamera(selectedCamera);
      alert(
        result
          ? "Camera test successful!"
          : "Camera test failed. Check your device."
      );
    } catch (error) {
      alert("Camera test failed. Check your device and permissions.");
    } finally {
      setTesting((prev) => ({ ...prev, camera: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Microphone Settings
          </CardTitle>
          <CardDescription>
            Select and test your microphone for voice communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedMicrophone || ""}
                onValueChange={handleMicrophoneChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a microphone" />
                </SelectTrigger>
                <SelectContent>
                  {microphones.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={testMicrophone}
              disabled={!selectedMicrophone || testing.mic}
              variant="outline"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing.mic ? "Testing..." : "Test"}
            </Button>
          </div>

          {/* Real-time volume indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Input Level</label>
              <Button
                onClick={() => setShowVolumeIndicator(!showVolumeIndicator)}
                variant="outline"
                size="sm"
              >
                {showVolumeIndicator ? "Stop" : "Monitor"}
              </Button>
            </div>
            <AudioVolumeIndicator
              deviceId={selectedMicrophone || undefined}
              isActive={showVolumeIndicator}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Speaker Settings
          </CardTitle>
          <CardDescription>
            Select and test your speakers or headphones for audio output
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedSpeaker || ""}
                onValueChange={handleSpeakerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select speakers/headphones" />
                </SelectTrigger>
                <SelectContent>
                  {speakers.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={testSpeaker}
              disabled={!selectedSpeaker || testing.speaker}
              variant="outline"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing.speaker ? "Testing..." : "Test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Camera Settings
          </CardTitle>
          <CardDescription>
            Select and test your camera for video communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedCamera || ""}
                onValueChange={handleCameraChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={testCamera}
              disabled={!selectedCamera || testing.camera}
              variant="outline"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing.camera ? "Testing..." : "Test"}
            </Button>
          </div>

          {/* Camera preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Camera Preview</label>
              <Button
                onClick={() => setShowCameraPreview(!showCameraPreview)}
                variant="outline"
                size="sm"
                disabled={!selectedCamera}
              >
                {showCameraPreview ? "Stop Preview" : "Start Preview"}
              </Button>
            </div>
            {showCameraPreview && selectedCamera && (
              <div className="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video">
                <video
                  id="camera-preview"
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={loadDevices} variant="outline">
          Refresh Devices
        </Button>
        <Button onClick={loadSavedSelections} variant="outline">
          Load Saved Settings
        </Button>
      </div>
    </div>
  );
};
