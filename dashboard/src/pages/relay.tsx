import { useEffect } from "react";
import { io } from "socket.io-client";

export function RelayPage() {
  useEffect(() => {
    const socket = io();
  }, []);
  return (
    <>
      <div>h i</div>
    </>
  );
}
