import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIO = {
  socket: {
    server: NetServer & {
      io: ServerIO;
    };
  };
} & any;

export const config = {
  api: {
    bodyParser: false,
  },
};
