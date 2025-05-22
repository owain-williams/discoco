import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const HomePage = async () => {
  const user = await currentUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const server = await db.server.findFirst({
    where: {
      members: {
        some: {
          user: {
            clerkId: user.id,
          },
        },
      },
    },
  });

  if (server) {
    return redirect(`/servers/${server.id}`);
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to DiscoCo!</h1>
        <p className="text-muted-foreground mb-8">
          Create a server or join one to get started.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
