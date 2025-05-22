import { create } from "zustand";
import { ChannelType } from "@/generated/prisma";

export type ModalType =
  | "createServer"
  | "createChannel"
  | "inviteServer"
  | "joinServer"
  | "settings";

interface ModalData {
  channelType?: ChannelType;
  server?: {
    id: string;
    name: string;
    imageUrl: string | null;
    inviteCode: string;
  };
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));
