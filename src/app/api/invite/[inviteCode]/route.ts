import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { MemberRole } from "@/generated/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { inviteCode: string } }
) {
  try {
    const user = await currentUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.inviteCode) {
      return new NextResponse("Invite code missing", { status: 400 });
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

    // Check if the server exists and user is not already a member
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
      return NextResponse.json(existingServer);
    }

    // Add user to the server
    const server = await db.server.update({
      where: {
        inviteCode: params.inviteCode,
      },
      data: {
        members: {
          create: [
            {
              userId: dbUser.id,
              role: MemberRole.GUEST,
            },
          ],
        },
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.log("[INVITE_CODE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
