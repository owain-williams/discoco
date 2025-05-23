import { NextResponse } from "next/server";

export async function GET() {
  if (global.io) {
    console.log("Socket.IO server is running");
    return new NextResponse("Socket.IO server is running", { status: 200 });
  } else {
    console.log("Socket.IO server not found");
    return new NextResponse("Socket.IO server not found", { status: 500 });
  }
}
