import multer from 'multer';

// Files stay in memory, then get streamed to Cloudinary. Nothing touches disk
// (Render's filesystem is ephemeral anyway).
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpe?g|png|webp)$/.test(file.mimetype)) {
      return cb(Object.assign(new Error('Only JPG, PNG or WebP images are allowed'), { status: 400 }));
    }
    cb(null, true);
  },
});
