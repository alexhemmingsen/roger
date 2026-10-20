import { startServer } from "./app.ts";

const port = Number(process.env.PORT ?? 3000);

startServer(port).on("listening", () => {
  console.log(`Server listening on http://localhost:${port}`);
});
