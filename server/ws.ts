import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws) => {
        console.log("New WebSocket connection");

        ws.on("error", console.error);

        ws.on("close", () => {
            console.log("WebSocket connection closed");
        });
    });
}

export function broadcast(message: any) {
    if (!wss) return;

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}
