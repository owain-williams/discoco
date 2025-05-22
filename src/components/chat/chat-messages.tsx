"use client";

import { Fragment, useRef, ElementRef, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, ServerCrash } from "lucide-react";
import { Member, Message, User } from "@/generated/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/hooks/use-messages";
import { useSocket } from "@/components/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";

const DATE_FORMAT = "d MMM yyyy, HH:mm";

interface ChatMessagesProps {
  name: string;
  member: Member;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
  type: "channel" | "conversation";
}

type MessageWithUser = Message & {
  user: User;
};

export const ChatMessages = ({
  name,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
  type,
}: ChatMessagesProps) => {
  const chatRef = useRef<ElementRef<"div">>(null);
  const bottomRef = useRef<ElementRef<"div">>(null);
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useMessages({
      chatId,
      apiUrl,
      paramKey,
      paramValue,
    });

  const messages = data?.pages?.flatMap((page) => page.items) || [];

  useEffect(() => {
    if (!socket) {
      return;
    }

    // Join the channel room
    socket.emit("join-channel", chatId);

    const channelKey = `chat:${chatId}:messages`;

    const messageHandler = (message: MessageWithUser) => {
      queryClient.setQueryData(["messages", chatId], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return {
            pages: [
              {
                items: [message],
                nextCursor: null,
              },
            ],
          };
        }

        const newData = { ...oldData };
        newData.pages[0] = {
          ...newData.pages[0],
          items: [message, ...newData.pages[0].items],
        };

        return newData;
      });

      // Scroll to bottom when new message arrives
      setTimeout(() => {
        bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    socket.on(channelKey, messageHandler);

    return () => {
      socket.off(channelKey, messageHandler);
      socket.emit("leave-channel", chatId);
    };
  }, [socket, chatId, queryClient]);

  // Auto-scroll to bottom when messages load
  useEffect(() => {
    setTimeout(() => {
      bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  if (status === "pending") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Something went wrong!
        </p>
      </div>
    );
  }

  return (
    <div ref={chatRef} className="flex-1 flex flex-col py-4 overflow-y-auto">
      {!hasNextPage && <div className="flex-1" />}
      {!hasNextPage && !messages.length && (
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-zinc-500 dark:bg-zinc-400 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {type === "channel" ? "#" : name.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-xl md:text-3xl font-bold">
              {type === "channel"
                ? `Welcome to #${name}!`
                : `Start your conversation with ${name}`}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              {type === "channel"
                ? `This is the start of the #${name} channel.`
                : `This is the beginning of your direct message history with ${name}.`}
            </p>
          </div>
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          {isFetchingNextPage ? (
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin my-4" />
          ) : (
            <Button
              onClick={() => fetchNextPage()}
              variant="link"
              size="sm"
              className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
            >
              Load previous messages
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-col-reverse mt-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className="relative group flex items-center hover:bg-black/5 p-4 transition w-full"
          >
            <div className="group flex gap-x-2 items-start w-full">
              <div className="cursor-pointer hover:drop-shadow-md transition">
                <Avatar>
                  <AvatarImage src={message.user.imageUrl || ""} />
                  <AvatarFallback>
                    {message.user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col w-full">
                <div className="flex items-center gap-x-2">
                  <div className="flex items-center">
                    <p className="font-semibold text-sm hover:underline cursor-pointer">
                      {message.user.username}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {format(new Date(message.createdAt), DATE_FORMAT)}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};
