export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

export interface VideoDevice {
  deviceId: string;
  label: string;
  kind: "videoinput";
}

export class AudioDeviceManager {
  private static instance: AudioDeviceManager;
  private devices: AudioDevice[] = [];
  private videoDevices: VideoDevice[] = [];
  private selectedMicrophoneId: string | null = null;
  private selectedSpeakerId: string | null = null;
  private selectedCameraId: string | null = null;

  constructor() {
    // Only load saved devices if we're in the browser
    if (typeof window !== "undefined") {
      this.loadSavedDevices();
    }
  }

  static getInstance(): AudioDeviceManager {
    if (!AudioDeviceManager.instance) {
      AudioDeviceManager.instance = new AudioDeviceManager();
    }
    return AudioDeviceManager.instance;
  }

  async getAvailableDevices(): Promise<{
    microphones: AudioDevice[];
    speakers: AudioDevice[];
    cameras: VideoDevice[];
  }> {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();

      const microphones: AudioDevice[] = devices
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 4)}`,
          kind: "audioinput" as const,
        }));

      const speakers: AudioDevice[] = devices
        .filter((device) => device.kind === "audiooutput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 4)}`,
          kind: "audiooutput" as const,
        }));

      const cameras: VideoDevice[] = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 4)}`,
          kind: "videoinput" as const,
        }));

      this.devices = [...microphones, ...speakers];
      this.videoDevices = cameras;

      return { microphones, speakers, cameras };
    } catch (error) {
      console.error("Error getting audio/video devices:", error);
      return { microphones: [], speakers: [], cameras: [] };
    }
  }

  async getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error("Error getting microphone stream:", error);
      throw error;
    }
  }

  setSelectedMicrophone(deviceId: string) {
    this.selectedMicrophoneId = deviceId;
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("selected-microphone", deviceId);
    }
  }

  setSelectedSpeaker(deviceId: string) {
    this.selectedSpeakerId = deviceId;
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("selected-speaker", deviceId);
    }
  }

  setSelectedCamera(deviceId: string) {
    this.selectedCameraId = deviceId;
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("selected-camera", deviceId);
    }
  }

  getSelectedMicrophone(): string | null {
    return this.selectedMicrophoneId;
  }

  getSelectedSpeaker(): string | null {
    return this.selectedSpeakerId;
  }

  getSelectedCamera(): string | null {
    return this.selectedCameraId;
  }

  async setSpeakerForAudioElement(
    audioElement: HTMLAudioElement,
    deviceId: string
  ): Promise<boolean> {
    try {
      // Check if setSinkId is supported
      if ("setSinkId" in audioElement) {
        await (
          audioElement as HTMLAudioElement & {
            setSinkId: (deviceId: string) => Promise<void>;
          }
        ).setSinkId(deviceId);
        return true;
      } else {
        console.warn("setSinkId not supported in this browser");
        return false;
      }
    } catch (error) {
      console.error("Error setting speaker device:", error);
      return false;
    }
  }

  private loadSavedDevices() {
    // Check if we're in the browser environment
    if (typeof window !== "undefined" && window.localStorage) {
      this.selectedMicrophoneId = localStorage.getItem("selected-microphone");
      this.selectedSpeakerId = localStorage.getItem("selected-speaker");
      this.selectedCameraId = localStorage.getItem("selected-camera");
    }
  }

  // Test audio functionality
  async testMicrophone(deviceId: string): Promise<boolean> {
    try {
      const stream = await this.getMicrophoneStream(deviceId);

      // Test if audio is being captured
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      return new Promise((resolve) => {
        const checkAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

          // Clean up
          stream.getTracks().forEach((track) => track.stop());
          audioContext.close();

          resolve(average > 0);
        };

        setTimeout(checkAudio, 100);
      });
    } catch (error) {
      console.error("Error testing microphone:", error);
      return false;
    }
  }

  async testSpeaker(deviceId: string): Promise<boolean> {
    try {
      // Create a test audio element
      const audio = new Audio();

      // Use a short, quiet test tone data URL (440Hz sine wave for 100ms)
      const testTone =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBzOR2fPGdSsFJnnF8N+RTwcYfuQyABI=";

      audio.src = testTone;

      // Set the output device if setSinkId is supported
      if ("setSinkId" in audio && deviceId) {
        await (
          audio as HTMLAudioElement & {
            setSinkId: (deviceId: string) => Promise<void>;
          }
        ).setSinkId(deviceId);
      }

      // Play the test audio
      await audio.play();

      return new Promise((resolve) => {
        audio.addEventListener("ended", () => {
          resolve(true);
        });

        audio.addEventListener("error", () => {
          resolve(false);
        });

        // Fallback timeout
        setTimeout(() => resolve(false), 1000);
      });
    } catch (error) {
      console.error("Error testing speaker:", error);
      return false;
    }
  }

  // Get volume level from microphone stream
  getVolumeLevel(stream: MediaStream): number {
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      // Clean up
      audioContext.close();

      return average;
    } catch (error) {
      console.error("Error getting volume level:", error);
      return 0;
    }
  }

  // Get camera stream
  async getCameraStream(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error("Error getting camera stream:", error);
      throw error;
    }
  }

  // Get combined audio/video stream
  async getAudioVideoStream(
    audioDeviceId?: string,
    videoDeviceId?: string
  ): Promise<MediaStream> {
    // Use more flexible constraints to avoid OverconstrainedError
    const constraints: MediaStreamConstraints = {
      audio: audioDeviceId
        ? {
            deviceId: { ideal: audioDeviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
      video: videoDeviceId
        ? {
            deviceId: { ideal: videoDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
    };

    console.log("getAudioVideoStream constraints:", constraints);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("getAudioVideoStream result:", stream);
      console.log("Audio tracks:", stream.getAudioTracks());
      console.log("Video tracks:", stream.getVideoTracks());
      return stream;
    } catch (error) {
      console.error("Error getting audio/video stream:", error);

      // Fallback to basic constraints if the ideal ones fail
      console.log("Trying fallback constraints...");
      try {
        const fallbackConstraints: MediaStreamConstraints = {
          audio: true,
          video: true,
        };

        const fallbackStream = await navigator.mediaDevices.getUserMedia(
          fallbackConstraints
        );
        console.log("Fallback stream successful:", fallbackStream);
        return fallbackStream;
      } catch (fallbackError) {
        console.error("Fallback constraints also failed:", fallbackError);
        throw fallbackError;
      }
    }
  }

  // Test camera functionality
  async testCamera(deviceId: string): Promise<boolean> {
    try {
      const stream = await this.getCameraStream(deviceId);
      const videoTrack = stream.getVideoTracks()[0];

      if (videoTrack && videoTrack.readyState === "live") {
        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }

      // Clean up
      stream.getTracks().forEach((track) => track.stop());
      return false;
    } catch (error) {
      console.error("Error testing camera:", error);
      return false;
    }
  }
}
