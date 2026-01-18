import { server } from "./server";
import { setLogger } from "./utils/logger";

async function start() {
  setLogger(server.log);

  await server.ready();
  await server.listen({ host: "0.0.0.0", port: 3001 });
  server.log.info("Game Service running at http://0.0.0.0:3001");
  server.log.info("Swagger UI available at http://0.0.0.0:3001/docs");
}

start().catch((err) => {
  server.log.error(err);
  process.exit(1);
});
