import { getConfig } from "../../utils/jsonFile.js";
import { init } from "./storage.js";
import { registerMedia } from "../../utils/mediaRegistry.js";
import cache from "../../cache.js";
import { cachePicListKey } from "../../const.js";

let upload = init();
let uploadFile = upload.array('files');

export const baseUpload = (type, req, res) => {
  const config = getConfig();
  const pathMap = {
    pic: config?.picUploadPath,
    mov: config?.movUploadPath,
    file: config?.fileUploadPath,
  };

  if (!pathMap[type]) {
    return res.status(500).send({ success: false, code: 1, msg: "你还未设置存储路径", data: null });
  }

  req.savePath = pathMap[type] || '';

  uploadFile(req, res, (err) => {
    if (err) {
      return res.status(400).send({ success: false, msg: '文件上传失败', error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ success: false, msg: '未上传文件' });
    }

    const uploadSource = req.query?.source === 'chat' ? 'chat' : 'normal';
    const filesWithMeta = req.files.map(f => ({ ...f, source: uploadSource }));
    const registered = (type === 'pic' || type === 'mov')
      ? registerMedia(type, filesWithMeta)
      : [];
    cache.del(cachePicListKey);

    res.status(200).send({
      msg: '上传成功',
      data: registered.length ? registered.slice(-req.files.length) : req.files.map(f => ({
        storedName: f.filename,
        originalName: f.originalname,
        size: f.size,
      })),
      code: 0,
      success: true,
    });
  });
};
