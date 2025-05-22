import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { MemberRole } from "@/generated/prisma";

export async function POST(req: Request) {
  try {
    const { name, imageUrl } = await req.json();
    console.log("Creating server with data:", { name, imageUrl });

    const user = await currentUser();
    console.log("Current user:", user?.id);

    if (!user) {
      console.error("No user found");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!name) {
      console.error("No name provided");
      return new NextResponse("Name is required", { status: 400 });
    }

    // Get or create the user in database
    console.log("Looking for user with clerkId:", user.id);
    let dbUser = await db.user.findUnique({
      where: {
        clerkId: user.id,
      },
    });
    console.log("Found dbUser:", dbUser?.id);

    if (!dbUser) {
      console.log("User not found, creating new user");
      dbUser = await db.user.create({
        data: {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress || "",
          username: user.username || user.fullName || "User",
          imageUrl: user.imageUrl,
        },
      });
      console.log("Created new user:", dbUser.id);
    }

    const server = await db.server.create({
      data: {
        name,
        imageUrl,
        inviteCode: uuidv4(),
        members: {
          create: [
            {
              userId: dbUser.id,
              role: MemberRole.ADMIN,
            },
          ],
        },
        channels: {
          create: [
            {
              name: "general",
              userId: dbUser.id,
            },
          ],
        },
      },
    });

    console.log("Server created successfully:", server.id);
    return NextResponse.json(server);
  } catch (error) {
    console.error("[SERVERS_POST] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
