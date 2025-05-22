"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavigationItemProps {
  id: string;
  imageUrl: string | null;
  name: string;
}

export const NavigationItem = ({ id, imageUrl, name }: NavigationItemProps) => {
  const params = useParams();
  const router = useRouter();

  const onClick = () => {
    router.push(`/servers/${id}`);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className="group relative flex items-center"
            variant="ghost"
            size="icon"
          >
            <div
              className={cn(
                "absolute left-0 bg-primary rounded-r-full transition-all w-[4px]",
                params?.serverId !== id && "group-hover:h-[20px]",
                params?.serverId === id ? "h-[36px]" : "h-[8px]"
              )}
            />
            <div
              className={cn(
                "relative group flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] transition-all overflow-hidden",
                params?.serverId === id &&
                  "bg-primary/10 text-primary rounded-[16px]"
              )}
            >
              {imageUrl ? (
                <Image fill src={imageUrl} alt="Channel" />
              ) : (
                <div className="flex items-center justify-center bg-background dark:bg-neutral-700 group-hover:bg-emerald-500 h-full w-full text-emerald-500 group-hover:text-white transition">
                  {name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
