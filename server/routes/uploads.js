import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { requireAdmin } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';
import { uploadBuffer } from '../services/cloudinary.js';

const r = Router();

// multipart/form-data with a single "image" field -> { url }
r.post('/', requireAdmin, upload.single('image'), wrap(async (req, res) => {
  if (!req.file) throw bad('Choose an image to upload');
  const result = await uploadBuffer(req.file.buffer);
  res.status(201).json({ url: result.secure_url });
}));

export default r;
