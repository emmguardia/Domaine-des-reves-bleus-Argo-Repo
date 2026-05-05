import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Taille max 5 Mo */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** MIME types autorisés → extension sûre (on n'utilise jamais l'extension du client) */
const ALLOWED_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/** Signatures magiques (début de fichier) pour vérifier le contenu réel */
const MAGIC = [
  { sig: Buffer.from([0xff, 0xd8, 0xff]), ext: '.jpg' },
  { sig: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ext: '.png' },
  { sig: Buffer.from([0x47, 0x49, 0x46, 0x38]), ext: '.gif' },
  { sig: Buffer.from([0x52, 0x49, 0x46, 0x46]), ext: '.webp' }, // RIFF, on vérifie WEBP après
];

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'products');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype] || '.bin';
    const name = `${randomUUID()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME[file.mimetype]) {
    return cb(new Error('Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP.'), false);
  }
  cb(null, true);
};

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('image');

/**
 * Vérifie les magic bytes du fichier pour s'assurer que c'est bien une image.
 * Supprime le fichier et appelle next(err) si invalide.
 */
export function validateImageMagic(req, res, next) {
  if (!req.file || !req.file.path) return next();
  const filepath = req.file.path;
  const buffer = Buffer.allocUnsafe(12);
  let fd;
  try {
    fd = fs.openSync(filepath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
  } catch (err) {
    try { fs.unlinkSync(filepath); } catch (_) {}
    return next(err);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  let valid = false;
  for (const { sig, ext } of MAGIC) {
    if (buffer.compare(sig, 0, sig.length, 0, sig.length) === 0) {
      if (ext === '.webp') {
        valid = buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP';
      } else {
        valid = true;
      }
      break;
    }
  }

  if (!valid) {
    try { fs.unlinkSync(filepath); } catch (_) {}
    return res.status(400).json({
      error: 'Erreur',
      detail: 'Le fichier ne semble pas être une image valide (JPEG, PNG, GIF ou WebP).',
    });
  }
  next();
}
