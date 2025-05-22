import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  if (global.io) {
    console.log("Socket.IO server is running");
    return new Response("Socket.IO server is running", { status: 200 });
  } else {
    console.log("Socket.IO server not found");
    return new Response("Socket.IO server not found", { status: 500 });
  }
}
