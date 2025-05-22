"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";

const formSchema = z.object({
  inviteCode: z.string().min(1, {
    message: "Invite code is required.",
  }),
});

export const JoinServerModal = () => {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "joinServer";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inviteCode: "",
    },
  });

  const { mutate: joinServer, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Extract just the invite code if a full URL is provided
      const inviteCode = values.inviteCode.includes("/invite/")
        ? values.inviteCode.split("/invite/")[1]
        : values.inviteCode;

      const response = await fetch(`/api/invite/${inviteCode}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Invalid invite code");
      }

      return response.json();
    },
    onSuccess: (server) => {
      form.reset();
      onClose();
      router.push(`/servers/${server.id}`);
      router.refresh();
    },
    onError: (error) => {
      console.error("Failed to join server:", error);
      form.setError("inviteCode", {
        message: "Invalid invite code or server not found",
      });
    },
  });

  const isLoading = form.formState.isSubmitting || isPending;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    joinServer(values);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Join a Server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Enter an invite code below to join an existing server
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-8 px-6">
              <FormField
                control={form.control}
                name="inviteCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
                      Invite Code
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                        placeholder="Enter invite code or paste invite link"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="bg-gray-100 px-6 py-4">
              <Button variant="primary" disabled={isLoading}>
                Join Server
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
