import { upgradeWebSocket } from "@hono/node-server";
import { Hono } from "hono";
import { clientIp } from "../client-ip.ts";
import * as presence from "../controllers/presence.ts";
import * as talk from "../controllers/talk.ts";
import { AppError } from "../errors.ts";
import type { AuthEnv } from "../middleware/auth.ts";

// Text frames are JSON events, binary frames are audio from the current speaker.
type ClientEvent =
  { type: "talk_start"; conversationId: string } | { type: "talk_stop" };

function errorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return "Something went wrong";
}

export const talkRoutes = new Hono<AuthEnv>().get(
  "/ws",
  upgradeWebSocket((c) => {
    const userId: string = c.get("userId");
    const ip = clientIp(c);

    return {
      onOpen: (_event, ws) => presence.connect(userId, ip, ws),

      onMessage: async (event, ws) => {
        if (event.data instanceof ArrayBuffer) {
          talk.audio(userId, event.data);
          return;
        }

        let message: ClientEvent;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
          return;
        }

        if (message.type === "talk_start") {
          try {
            await talk.start(userId, message.conversationId);
            ws.send(
              JSON.stringify({
                type: "talk_granted",
                conversationId: message.conversationId,
              }),
            );
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "talk_denied",
                message: errorMessage(error),
              }),
            );
          }
        } else if (message.type === "talk_stop") {
          await talk.stop(userId).catch((error) => {
            ws.send(
              JSON.stringify({ type: "error", message: errorMessage(error) }),
            );
          });
        }
      },

      onClose: (_event, ws) => {
        talk.stop(userId).catch(errorMessage);
        presence.disconnect(userId, ws);
      },
    };
  }),
);
