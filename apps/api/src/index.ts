import { env } from "./config.ts";
import { createServer } from "./server.ts";
import { migrate } from "./migrate.ts";
import { refreshFeed } from "./feed.ts";

await migrate();
try {
  await refreshFeed();
} catch (err) {
  console.error("feed_bootstrap_failed", err instanceof Error ? err.message : "unknown");
}

const server = createServer();
server.listen(env.port, () => {
  console.log(JSON.stringify({ msg: "api_listen", port: env.port }));
});

if (process.env.KEEPER_EMBEDDED === "true") {
  const { startKeeper } = await import("@tminus/keeper/run");
  startKeeper();
}
