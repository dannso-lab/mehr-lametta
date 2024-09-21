import { Server } from "socket.io";
import { Context } from "../context";

export async function setupRelayService(context: Context) {
  console.log("install relay servic");
  const io = new Server(context.httpServer);
  io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
}
