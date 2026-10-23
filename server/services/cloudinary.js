import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';

cloudinary.config({ ...config.cloudinary, secure: true });

export function uploadBuffer(buffer, folder = 'deboyz') {
  if (!config.cloudinary.cloud_name) {
    throw Object.assign(new Error('Cloudinary is not configured'), { status: 503 });
  }
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'image' }, (err, result) => (err ? reject(err) : resolve(result)))
      .end(buffer);
  });
}
