import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(__filename));
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl.startsWith('file:')) {
  process.exit(0);
}

let filePath = databaseUrl.slice('file:'.length);
if (filePath.startsWith('./')) {
  filePath = path.join(root, 'prisma', filePath.slice(2));
} else if (!path.isAbsolute(filePath)) {
  filePath = path.join(root, 'prisma', filePath);
}

fs.mkdirSync(path.dirname(filePath), { recursive: true });
if (!fs.existsSync(filePath)) {
  fs.closeSync(fs.openSync(filePath, 'w'));
}
