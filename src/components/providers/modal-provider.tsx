"use client";

import { useState, useEffect } from "react";
import { CreateServerModal } from "@/components/modals/create-server-modal";
import { CreateChannelModal } from "@/components/modals/create-channel-modal";
import { InviteServerModal } from "@/components/modals/invite-server-modal";
import { JoinServerModal } from "@/components/modals/join-server-modal";
import { SettingsModal } from "@/components/modals/settings-modal";
import { MessageFileModal } from "@/components/modals/message-file-modal";

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <CreateServerModal />
      <CreateChannelModal />
      <InviteServerModal />
      <JoinServerModal />
      <SettingsModal />
      <MessageFileModal />
    </>
  );
};
