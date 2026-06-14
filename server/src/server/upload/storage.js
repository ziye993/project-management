import multer from 'multer';
import { fixFilenameEncoding } from '../../utils/filenameEncoding.js';

export const init = () => {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      const savePath = req.savePath;
      if (!savePath) return cb(new Error('No save path'));
      cb(null, savePath);
    },
    filename(req, file, cb) {
      const original = fixFilenameEncoding(file.originalname);
      cb(null, `${Date.now()}-${original}`);
    },
  });
  return multer({ storage });
};
