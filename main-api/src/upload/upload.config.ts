import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; 
const RANDOM_RANGE = 1e9; 
const ORIGINALS_DIR = join(process.cwd(), 'uploads', 'originals');

export const imageUploadOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      if (!existsSync(ORIGINALS_DIR)) {
        mkdirSync(ORIGINALS_DIR, { recursive: true });
      }
      cb(null, ORIGINALS_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * RANDOM_RANGE)}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
};