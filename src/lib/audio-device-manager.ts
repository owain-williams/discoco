export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

export class AudioDeviceManager {
  private static instance: AudioDeviceManager;
  private devices: AudioDevice[] = [];
  private selectedMicrophoneId: string | null = null;
  private selectedSpeakerId: string | null = null;

  constructor() {
    this.loadSavedDevices();
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
  }> {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true });

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

      this.devices = [...microphones, ...speakers];

      return { microphones, speakers };
    } catch (error) {
      console.error("Error getting audio devices:", error);
      return { microphones: [], speakers: [] };
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
    localStorage.setItem("selected-microphone", deviceId);
  }

  setSelectedSpeaker(deviceId: string) {
    this.selectedSpeakerId = deviceId;
    localStorage.setItem("selected-speaker", deviceId);
  }

  getSelectedMicrophone(): string | null {
    return this.selectedMicrophoneId;
  }

  getSelectedSpeaker(): string | null {
    return this.selectedSpeakerId;
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
    this.selectedMicrophoneId = localStorage.getItem("selected-microphone");
    this.selectedSpeakerId = localStorage.getItem("selected-speaker");
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
}
