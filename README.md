# Roger

A walkie-talkie app for people on the same Wi-Fi. Hold the button to talk, live, one person at a time. Every message is transcribed, and an assistant answers questions about your past conversations.

## How it works

- The iPhone app signs in anonymously with Supabase and keeps a WebSocket open to the server.
- The server finds people on the same network, handles invites, gives the turn to one speaker per conversation and relays their audio live to the others.
- When the speaker lets go, the message is saved in Postgres and transcribed with OpenAI. The Ask tab answers questions from those transcripts with an OpenAI model.

## Folders

- `app/` – iPhone app (Expo, React Native, TanStack Query, react-native-audio-api).
- `server/` – Node and Hono server with the API and WebSocket, deployed on Render.
  - `src/routes/` – HTTP and WebSocket endpoints.
  - `src/controllers/` – business logic: presence, invites, talking, transcription queue, assistant.
  - `src/services/` – Supabase, OpenAI and the open connections.
  - `supabase/` – database migration and local Supabase config for tests.

## Presentation

I (Alexander) will install the app on two devices and demo it the 26th of october and go through the system design, approach and everything in between.