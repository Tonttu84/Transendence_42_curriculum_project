import { dbMigrate } from './db/db.js';
import { server } from './server.js';

const start = async () => {
  try {
    await dbMigrate();
    await server.ready();
    await server.listen({ host: '0.0.0.0', port: 3003 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

await start();
