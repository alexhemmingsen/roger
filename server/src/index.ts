import { startServer } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "OPENAI_API_KEY is not set: transcripts and assistant answers are stubbed.",
  );
}

startServer(port).on("listening", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
