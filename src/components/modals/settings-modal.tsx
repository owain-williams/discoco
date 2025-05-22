"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { AudioDeviceSettings } from "@/components/audio-device-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Volume2, Bell, Shield } from "lucide-react";

export const SettingsModal = () => {
  const { isOpen, onClose, type } = useModal();

  const isModalOpen = isOpen && type === "settings";

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden max-w-2xl">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold flex items-center justify-center gap-2">
            <Settings className="w-6 h-6" />
            User Settings
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Configure your audio devices and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs defaultValue="audio" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Audio
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="audio" className="mt-6">
              <AudioDeviceSettings />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <div className="text-center text-zinc-500 py-8">
                Notification settings coming soon...
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-6">
              <div className="text-center text-zinc-500 py-8">
                Privacy settings coming soon...
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-6">
              <div className="text-center text-zinc-500 py-8">
                Advanced settings coming soon...
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
