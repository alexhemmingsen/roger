import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createClient } from "@supabase/supabase-js";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  inject,
  it,
  vi,
} from "vitest";
import WebSocket from "ws";

// Runs the real server against the local Supabase stack. Only the LLM is replaced,
// so the test can check what the assistant is given.
vi.mock("../services/llm.ts", () => ({
  complete: vi.fn(async () => "stub answer"),
}));

const local = inject("supabase");
if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(local.url)) {
  throw new Error(`Refusing to run against a non-local Supabase: ${local.url}`);
}
process.env.SUPABASE_URL = local.url;
process.env.SUPABASE_PUBLISHABLE_KEY = local.publishableKey;
process.env.SUPABASE_SECRET_KEY = local.secretKey;
delete process.env.SUPABASE_JWKS_URL;
// Keep transcription on its stub, so the test never calls OpenAI.
delete process.env.OPENAI_API_KEY;

const { startServer } = await import("../app.ts");
const { complete } = await import("../services/llm.ts");

const admin = createClient(local.url, local.secretKey, {
  auth: { persistSession: false },
});

type TestUser = { id: string; token: string };
type Event = { type: string; [key: string]: any };

let server: ReturnType<typeof startServer>;
let base: string;
const sockets: WebSocket[] = [];

beforeAll(async () => {
  server = startServer(0);
  await once(server, "listening");
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
  for (const ws of sockets.splice(0)) ws.close();
});

afterAll(() => {
  server.close();
});

async function signUp(displayName?: string): Promise<TestUser> {
  const client = createClient(local.url, local.publishableKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  const user = { id: data.user!.id, token: data.session!.access_token };
  if (displayName) {
    const { status } = await call(user, "PUT", "/api/me", { displayName });
    expect(status).toBe(200);
  }
  return user;
}

async function call(
  user: TestUser | null,
  method: string,
  path: string,
  body?: unknown,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user && { Authorization: `Bearer ${user.token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function connect(user: TestUser): Promise<WebSocket> {
  const ws = new WebSocket(`${base.replace("http", "ws")}/api/ws`, {
    headers: { Authorization: `Bearer ${user.token}` },
  });
  sockets.push(ws);
  await once(ws, "open");
  return ws;
}

// Subscribe before triggering the action, so the event can't be missed.
function nextEvent(ws: WebSocket, type: string): Promise<Event> {
  return new Promise((resolve) => {
    const onMessage = (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) return;
      const event = JSON.parse(String(data));
      if (event.type !== type) return;
      ws.off("message", onMessage);
      resolve(event);
    };
    ws.on("message", onMessage);
  });
}

async function startConversation(
  from: TestUser,
  fromWs: WebSocket,
  to: TestUser,
): Promise<string> {
  const invite = await call(from, "POST", "/api/conversations/invites", {
    userId: to.id,
  });
  const accepted = nextEvent(fromWs, "invite_accepted");
  const { body } = await call(
    to,
    "POST",
    `/api/conversations/invites/${invite.body.id}/accept`,
  );
  await accepted;
  return body.id;
}

// One second of 16 kHz mono 16-bit audio, sent as ten 100 ms chunks.
async function talk(
  speakerWs: WebSocket,
  listenerWs: WebSocket,
  conversationId: string,
): Promise<Event> {
  const granted = nextEvent(speakerWs, "talk_granted");
  speakerWs.send(JSON.stringify({ type: "talk_start", conversationId }));
  await granted;
  for (let i = 0; i < 10; i++) speakerWs.send(Buffer.alloc(3_200, 1));
  const ended = nextEvent(listenerWs, "talk_ended");
  speakerWs.send(JSON.stringify({ type: "talk_stop" }));
  return ended;
}

async function waitForTranscript(user: TestUser, conversationId: string) {
  return vi.waitFor(
    async () => {
      const { body } = await call(
        user,
        "GET",
        `/api/conversations/${conversationId}/messages`,
      );
      expect(body.at(-1).transcript).toBeTruthy();
      return body;
    },
    { timeout: 5_000 },
  );
}

describe("health", () => {
  it("reports healthy when connected to Supabase", async () => {
    expect(await call(null, "GET", "/health")).toEqual({
      status: 200,
      body: { ok: true },
    });
  });
});

describe("auth", () => {
  it("rejects HTTP and WebSocket requests without a valid token", async () => {
    expect((await call(null, "GET", "/api/me")).status).toBe(401);
    expect(
      (await call({ id: "x", token: "not-a-jwt" }, "GET", "/api/me")).status,
    ).toBe(401);

    const ws = new WebSocket(`${base.replace("http", "ws")}/api/ws`);
    const [, response] = await once(ws, "unexpected-response");
    expect(response.statusCode).toBe(401);
  });
});

describe("users", () => {
  it("asks for a display name first, then saves it", async () => {
    const user = await signUp();

    expect((await call(user, "GET", "/api/me")).status).toBe(404);
    expect(
      (await call(user, "PUT", "/api/me", { displayName: "x".repeat(41) }))
        .status,
    ).toBe(400);
    expect((await call(user, "PUT", "/api/me", {})).status).toBe(400);

    await call(user, "PUT", "/api/me", { displayName: "  Alex  " });
    const { status, body } = await call(user, "GET", "/api/me");
    expect(status).toBe(200);
    expect(body).toMatchObject({ id: user.id, display_name: "Alex" });
  });
});

describe("conversations", () => {
  it("finds nearby users and starts a conversation through an invite", async () => {
    const alex = await signUp("Alex");
    const sam = await signUp("Sam");
    const outsider = await signUp("Kim");
    const alexWs = await connect(alex);
    const samWs = await connect(sam);

    const nearby = await call(alex, "GET", "/api/nearby");
    const nearbyIds = nearby.body.map((u: { id: string }) => u.id);
    expect(nearbyIds).toContain(sam.id);
    expect(nearbyIds).not.toContain(alex.id);

    const invited = nextEvent(samWs, "invite");
    const invite = await call(alex, "POST", "/api/conversations/invites", {
      userId: sam.id,
    });
    expect(invite.status).toBe(201);
    expect((await invited).from.display_name).toBe("Alex");

    const accepted = nextEvent(alexWs, "invite_accepted");
    const conversation = await call(
      sam,
      "POST",
      `/api/conversations/invites/${invite.body.id}/accept`,
    );
    expect(conversation.status).toBe(201);
    expect(
      conversation.body.members
        .map((m: { display_name: string }) => m.display_name)
        .sort(),
    ).toEqual(["Alex", "Sam"]);
    expect((await accepted).conversation.id).toBe(conversation.body.id);

    const list = await call(alex, "GET", "/api/conversations");
    expect(list.body.map((c: { id: string }) => c.id)).toEqual([
      conversation.body.id,
    ]);
    expect(
      (await call(sam, "GET", `/api/conversations/${conversation.body.id}`))
        .status,
    ).toBe(200);
    expect(
      (
        await call(
          outsider,
          "GET",
          `/api/conversations/${conversation.body.id}`,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          sam,
          "POST",
          `/api/conversations/invites/${invite.body.id}/accept`,
        )
      ).status,
    ).toBe(404);
  });

  it("lets the invited user decline", async () => {
    const alex = await signUp("Alex");
    const sam = await signUp("Sam");
    const alexWs = await connect(alex);
    await connect(sam);

    const invite = await call(alex, "POST", "/api/conversations/invites", {
      userId: sam.id,
    });
    const declined = nextEvent(alexWs, "invite_declined");
    const response = await call(
      sam,
      "POST",
      `/api/conversations/invites/${invite.body.id}/decline`,
    );

    expect(response.status).toBe(204);
    expect((await declined).inviteId).toBe(invite.body.id);
    expect((await call(sam, "GET", "/api/conversations")).body).toEqual([]);
  });

  it("rejects invites to users who aren't online", async () => {
    const alex = await signUp("Alex");
    const sam = await signUp("Sam");
    await connect(alex);

    const response = await call(alex, "POST", "/api/conversations/invites", {
      userId: sam.id,
    });

    expect(response.status).toBe(409);
  });
});

describe("talk", () => {
  it("relays a talk to the other member and saves the transcribed message", async () => {
    const alex = await signUp("Alex");
    const sam = await signUp("Sam");
    const outsider = await signUp("Kim");
    const alexWs = await connect(alex);
    const samWs = await connect(sam);
    const conversationId = await startConversation(alex, alexWs, sam);

    let audioBytes = 0;
    samWs.on("message", (data: Buffer, isBinary) => {
      if (isBinary) audioBytes += data.length;
    });
    const started = nextEvent(samWs, "talk_started");
    const granted = nextEvent(alexWs, "talk_granted");
    alexWs.send(JSON.stringify({ type: "talk_start", conversationId }));
    await granted;
    expect((await started).speakerId).toBe(alex.id);

    const denied = nextEvent(samWs, "talk_denied");
    samWs.send(JSON.stringify({ type: "talk_start", conversationId }));
    expect((await denied).message).toBe("Someone is already talking");

    for (let i = 0; i < 10; i++) alexWs.send(Buffer.alloc(3_200, 1));
    const ended = nextEvent(samWs, "talk_ended");
    alexWs.send(JSON.stringify({ type: "talk_stop" }));
    const { message } = await ended;
    expect(audioBytes).toBe(32_000);
    expect(message).toMatchObject({
      conversation_id: conversationId,
      sender_id: alex.id,
    });

    const history = await waitForTranscript(sam, conversationId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: message.id,
      transcript: "(stub transcript of 1.0s of audio)",
      sender: { id: alex.id, display_name: "Alex" },
    });
    expect(
      (
        await call(
          outsider,
          "GET",
          `/api/conversations/${conversationId}/messages`,
        )
      ).status,
    ).toBe(404);
  });
});

describe("assistant", () => {
  it("answers from all of the user's conversations, and only theirs", async () => {
    const alex = await signUp("Alex");
    const sam = await signUp("Sam");
    const kim = await signUp("Kim");
    const alexWs = await connect(alex);
    const samWs = await connect(sam);
    const kimWs = await connect(kim);
    const withSam = await startConversation(alex, alexWs, sam);
    const withKim = await startConversation(alex, alexWs, kim);
    await talk(samWs, alexWs, withSam);
    await talk(kimWs, alexWs, withKim);
    await waitForTranscript(alex, withSam);
    await waitForTranscript(alex, withKim);

    const response = await call(alex, "POST", "/api/assistant/ask", {
      question: "What did Sam and Kim say?",
    });
    expect(response).toEqual({ status: 200, body: { answer: "stub answer" } });
    const alexPrompt = vi.mocked(complete).mock.calls.at(-1)![0].prompt;
    expect(alexPrompt).toContain("The person asking is Alex.");
    expect(alexPrompt).toContain("Sam: (stub transcript of 1.0s of audio)");
    expect(alexPrompt).toContain("Kim: (stub transcript of 1.0s of audio)");
    expect(alexPrompt).toContain("Question: What did Sam and Kim say?");

    await call(kim, "POST", "/api/assistant/ask", { question: "Anything?" });
    const kimPrompt = vi.mocked(complete).mock.calls.at(-1)![0].prompt;
    expect(kimPrompt).toContain("Kim: (stub transcript");
    expect(kimPrompt).not.toContain("Sam:");
  });
});

describe("database rules", () => {
  it("keeps a deleted user's messages but removes their membership", async () => {
    const alex = await signUp("Alex");
    const sam = await signUp("Sam");
    const alexWs = await connect(alex);
    const samWs = await connect(sam);
    const conversationId = await startConversation(alex, alexWs, sam);
    await talk(samWs, alexWs, conversationId);
    await waitForTranscript(alex, conversationId);

    const { error } = await admin.auth.admin.deleteUser(sam.id);
    expect(error).toBeNull();

    const history = await call(
      alex,
      "GET",
      `/api/conversations/${conversationId}/messages`,
    );
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toMatchObject({ sender_id: null, sender: null });
    const conversation = await call(
      alex,
      "GET",
      `/api/conversations/${conversationId}`,
    );
    expect(conversation.body.members.map((m: { id: string }) => m.id)).toEqual([
      alex.id,
    ]);
  });

  it("rejects display names over 40 characters in the database itself", async () => {
    const user = await signUp();

    const { error } = await admin
      .from("users")
      .insert({ id: user.id, display_name: "x".repeat(41) });

    expect(error?.code).toBe("23514");
  });
});
