import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

interface InviteCodePageProps {
  params: {
    inviteCode: string;
  };
}

const InviteCodePage = async ({ params }: InviteCodePageProps) => {
  const user = await currentUser();

  if (!user) {
    return redirect("/sign-in");
  }

  if (!params.inviteCode) {
    return redirect("/");
  }

  // Get or create the user in database
  let dbUser = await db.user.findUnique({
    where: {
      clerkId: user.id,
    },
  });

  if (!dbUser) {
    dbUser = await db.user.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        username: user.username || user.fullName || "User",
        imageUrl: user.imageUrl,
      },
    });
  }

  // Check if the user is already a member of the server
  const existingServer = await db.server.findFirst({
    where: {
      inviteCode: params.inviteCode,
      members: {
        some: {
          userId: dbUser.id,
        },
      },
    },
  });

  if (existingServer) {
    return redirect(`/servers/${existingServer.id}`);
  }

  // Find the server with the invite code
  const server = await db.server.findUnique({
    where: {
      inviteCode: params.inviteCode,
    },
  });

  if (!server) {
    return redirect("/");
  }

  // Add the user to the server
  const updatedServer = await db.server.update({
    where: {
      id: server.id,
    },
    data: {
      members: {
        create: [
          {
            userId: dbUser.id,
          },
        ],
      },
    },
  });

  if (updatedServer) {
    return redirect(`/servers/${updatedServer.id}`);
  }

  return null;
};

export default InviteCodePage;
