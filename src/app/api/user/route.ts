import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { clerkId, email, username, imageUrl } = await req.json();

    if (!clerkId || !email) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: {
        clerkId: clerkId,
      },
    });

    if (existingUser) {
      // Update user if they exist
      const updatedUser = await db.user.update({
        where: {
          clerkId: clerkId,
        },
        data: {
          email,
          username,
          imageUrl,
        },
      });
      return NextResponse.json(updatedUser);
    }

    // Create new user
    const user = await db.user.create({
      data: {
        clerkId,
        email,
        username,
        imageUrl,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("[USER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
