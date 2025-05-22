import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ChannelType } from "@/generated/prisma";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { VoiceChannel } from "@/components/voice/voice-channel";

interface ChannelIdPageProps {
  params: {
    serverId: string;
    channelId: string;
  };
}

const ChannelIdPage = async ({ params }: ChannelIdPageProps) => {
  const user = await currentUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const channel = await db.channel.findUnique({
    where: {
      id: params.channelId,
    },
  });

  const member = await db.member.findFirst({
    where: {
      serverId: params.serverId,
      user: {
        clerkId: user.id,
      },
    },
    include: {
      user: true,
    },
  });

  if (!channel || !member) {
    redirect("/");
  }

  // Check if this is a voice channel
  if (channel.type === ChannelType.AUDIO) {
    return (
      <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
        <VoiceChannel
          channelId={channel.id}
          channelName={channel.name}
          currentMember={member}
          serverId={channel.serverId}
        />
      </div>
    );
  }

  // Default to text channel interface
  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader
        name={channel.name}
        serverId={channel.serverId}
        type="channel"
      />
      <ChatMessages
        member={member}
        name={channel.name}
        chatId={channel.id}
        type="channel"
        apiUrl="/api/messages"
        socketUrl="/api/socket/messages"
        socketQuery={{
          channelId: channel.id,
          serverId: channel.serverId,
        }}
        paramKey="channelId"
        paramValue={channel.id}
      />
      <ChatInput
        name={channel.name}
        type="channel"
        apiUrl="/api/socket/messages"
        chatId={channel.id}
        query={{
          channelId: channel.id,
          serverId: channel.serverId,
        }}
      />
    </div>
  );
};

export default ChannelIdPage;
