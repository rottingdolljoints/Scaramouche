import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function loadEvents(client) {
  const eventsPath = join(__dirname, '../events');
  const eventFiles = await readdir(eventsPath).then((files) =>
    files.filter((file) => file.endsWith('.js'))
  );

  logger.info(`Found ${eventFiles.length} event files to load`);

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);

    try {
      logger.info(`Loading event file: ${file}`);

      const { default: event } = await import(`file://${filePath}`);

      if (!event?.name || typeof event.execute !== 'function') {
        logger.warn(`Event ${file} is missing required "name" or "execute" properties.`);
        continue;
      }

      const safeExecute = async (...args) => {
        try {
          await event.execute(...args, client);
        } catch (error) {
          logger.error(`Error executing event ${event.name} from file ${file}:`, error);
        }
      };

      if (event.once) {
        client.once(event.name, safeExecute);
        logger.info(`✅ Registered once event: ${event.name} from ${file}`);
      } else {
        client.on(event.name, safeExecute);
        logger.info(`✅ Registered event: ${event.name} from ${file}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to import event file: ${file}`);
      logger.error(`Full path: ${filePath}`);
      logger.error(error?.stack || error?.message || error);
    }
  }
}
