import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Message, User } from "@/generated/prisma";

// Type for message with user relation
export type MessageWithUser = Message & {
  user: User;
};

// Type for the API response
export type MessagesResponse = {
  items: MessageWithUser[];
  nextCursor: string | null;
};

const fetchMessages = async ({
  pageParam = undefined,
  chatId,
}: {
  pageParam?: string | null;
  chatId: string;
  apiUrl: string;
}): Promise<MessagesResponse> => {
  const url = new URL("/api/messages", window.location.origin);
  url.searchParams.set("chatId", chatId);
  if (pageParam) {
    url.searchParams.set("cursor", pageParam);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  return response.json();
};

const sendMessage = async ({
  apiUrl,
  values,
}: {
  apiUrl: string;
  values: { content: string; fileUrl?: string };
}) => {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  return response.json();
};

export const useMessages = ({
  chatId,
}: {
  chatId: string;
  apiUrl: string;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
}) => {
  return useInfiniteQuery<MessagesResponse>({
    queryKey: ["messages", chatId],
    queryFn: ({ pageParam }) =>
      fetchMessages({
        pageParam: pageParam as string | undefined,
        chatId,
        apiUrl: "",
      }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    initialPageParam: null,
    refetchInterval: 1000, // Refetch every second for real-time effect
    enabled: !!chatId,
  });
};

export const useSendMessage = ({
  apiUrl,
  chatId,
}: {
  apiUrl: string;
  chatId: string;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: { content: string; fileUrl?: string }) =>
      sendMessage({ apiUrl, values }),
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });
};
