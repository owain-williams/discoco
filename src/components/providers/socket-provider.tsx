"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io as ClientIO, Socket } from "socket.io-client";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
    }

    // Delay connection to prevent rapid reconnections during development
    connectTimeoutRef.current = setTimeout(() => {
      const socketInstance = ClientIO(
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        {
          path: "/socket.io/",
          addTrailingSlash: false,
          transports: ["websocket", "polling"],
          timeout: 20000,
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: 3,
          forceNew: false,
          upgrade: true,
          rememberUpgrade: true,
        }
      );

      socketInstance.on("connect", () => {
        console.log("✅ Socket connected successfully! ID:", socketInstance.id);
        console.log(
          "✅ Socket transport:",
          socketInstance.io.engine.transport.name
        );
        console.log("✅ Socket connected to server");
        setIsConnected(true);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected! Reason:", reason);
        console.log(
          "❌ Socket transport was:",
          socketInstance.io.engine?.transport?.name
        );
        setIsConnected(false);

        // Only attempt reconnection for specific reasons
        if (
          reason === "io server disconnect" ||
          reason === "io client disconnect"
        ) {
          console.log("❌ Manual disconnect, not attempting reconnection");
          return;
        }
      });

      socketInstance.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error.message);
        console.error("❌ Error details:", error);
        setIsConnected(false);
      });

      socketInstance.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
        setIsConnected(true);
      });

      socketInstance.on("reconnect_error", (error) => {
        console.error("Socket reconnection error:", error);
      });

      socketInstance.on("reconnect_failed", () => {
        console.error("Socket reconnection failed after maximum attempts");
        setIsConnected(false);
      });

      setSocket(socketInstance);
    }, 100); // Small delay to prevent rapid connections

    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }

      if (socket) {
        socket.disconnect();
        socket.close();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
