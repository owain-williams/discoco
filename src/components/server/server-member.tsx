"use client";

import { Crown, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Member, MemberRole, User } from "@/generated/prisma";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ServerMemberProps {
  member: Member & { user: User };
}

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: (
    <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />
  ),
  [MemberRole.ADMIN]: <Crown className="h-4 w-4 ml-2 text-yellow-500" />,
};

export const ServerMember = ({ member }: ServerMemberProps) => {
  const params = useParams();
  const router = useRouter();

  const icon = roleIconMap[member.role];

  const onClick = () => {
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
  };

  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={cn(
        "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
        params?.memberId === member.id && "bg-zinc-700/20 dark:bg-zinc-700"
      )}
    >
      <Avatar className="h-8 w-8 md:h-8 md:w-8">
        <AvatarImage src={member.user.imageUrl || ""} />
        <AvatarFallback>
          {member.user.username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p
        className={cn(
          "font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
          params?.memberId === member.id &&
            "text-primary dark:text-zinc-200 dark:group-hover:text-white"
        )}
      >
        {member.user.username}
      </p>
      {icon}
    </Button>
  );
};
