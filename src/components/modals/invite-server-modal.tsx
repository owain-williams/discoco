"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";

export const InviteServerModal = () => {
  const { isOpen, onClose, onOpen, type, data } = useModal();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "inviteServer";
  const { server } = data;

  const inviteUrl = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/invite/${server?.inviteCode}`;

  const { mutate: regenerateInviteCode } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/servers/${server?.id}/invite-code`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to regenerate invite code");
      }
      return response.json();
    },
    onSuccess: (updatedServer) => {
      // Update the modal data with the new invite code
      onClose();
      // Reopen the modal with updated server data
      setTimeout(() => {
        onOpen("inviteServer", { server: updatedServer });
      }, 100);
    },
    onError: (error) => {
      console.error("Failed to regenerate invite code:", error);
    },
  });

  const onCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  const onNew = () => {
    setIsLoading(true);
    regenerateInviteCode();
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Invite Friends
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Give your friends a link to this server
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <Label className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
            Server invite link
          </Label>
          <div className="flex items-center mt-2 gap-x-2">
            <Input
              disabled={isLoading}
              className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
              value={inviteUrl}
              readOnly
            />
            <Button disabled={isLoading} onClick={onCopy} size="icon">
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button
            onClick={onNew}
            disabled={isLoading}
            variant="link"
            size="sm"
            className="text-xs text-zinc-500 mt-4"
          >
            Generate a new link
            <RefreshCw className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
