import app from '../../app.js';
import cache from '../../cache.js';
import path from 'path';
import {
  convertToSystemPath,
  getDirectoryContents,
  systemPathToArray,
} from "../../utils/file.js";
import { DEFAULT_PATH } from "../../const.js";
import { initDataStorage } from '../../initDataStorage.js';
import { getConfig } from "../../utils/jsonFile.js";
import { getMediaList, deleteMedia } from '../../utils/mediaRegistry.js';
import { buildMediaLinks } from '../../utils/accessLinks.js';
import { encodeUrlPath, fixStoredFilename } from '../../utils/filenameEncoding.js';
import { ok, fail } from '../../utils/httpResponse.js';

function resolveDirPath(body = {}) {
  if (body.absPath) return path.normalize(body.absPath);
  if (body.path?.length) return convertToSystemPath(body.path);
  return DEFAULT_PATH;
}

function mapMediaItem(type, item, config) {
  const requestPath = type === 'pic' ? config.picRequestPath : config.movRequestPath;
  const storedName = fixStoredFilename(item.storedName);
  return {
    storedName,
    name: item.displayName || item.originalName,
    originalName: item.originalName,
    size: item.size,
    uploadedAt: item.uploadedAt,
    url: encodeUrlPath(requestPath, storedName),
    links: buildMediaLinks(type, storedName),
  };
}

app.post('/api/file/fileList', async (req, res) => {
  const dirPath = resolveDirPath(req.body);
  try {
    const data = await getDirectoryContents(dirPath || DEFAULT_PATH);
    const currentPath = dirPath && dirPath !== DEFAULT_PATH ? systemPathToArray(dirPath) : [];
    ok(res, {
      ...data,
      currentPath,
      currentAbsPath: dirPath === DEFAULT_PATH ? '' : dirPath,
    });
  } catch (error) {
    console.log(error);
    fail(res, 500, 1, error.message || '读取目录失败');
  }
});

app.post('/api/file/getPicList', async (req, res) => {
  try {
    initDataStorage();
    const config = getConfig(true);
    if (!config.picUploadPath) {
      return ok(res, [], '未配置照片路径');
    }
    cache.del('PicListCache');
    const chatOnly = req.body?.chatOnly === true;
    const source = chatOnly ? 'chat' : 'normal';
    const list = getMediaList('pic', config.picUploadPath, { source });
    const data = list.map(item => mapMediaItem('pic', item, config));
    ok(res, data);
  } catch (error) {
    console.log(error);
    fail(res, 500, 1, error.message);
  }
});

app.post('/api/file/getMovList', async (req, res) => {
  try {
    initDataStorage();
    const config = getConfig(true);
    if (!config.movUploadPath) {
      return ok(res, [], '未配置影视路径');
    }
    const chatOnly = req.body?.chatOnly === true;
    const source = chatOnly ? 'chat' : 'normal';
    const list = getMediaList('mov', config.movUploadPath, { source });
    const data = list.map(item => mapMediaItem('mov', item, config));
    ok(res, data);
  } catch (error) {
    console.log(error);
    fail(res, 500, 1, error.message);
  }
});

app.post('/api/file/getFileLinks', (req, res) => {
  const { type, storedName } = req.body;
  if (!type || !storedName) {
    return fail(res, 400, 1, '缺少参数');
  }
  ok(res, buildMediaLinks(type, fixStoredFilename(storedName)));
});

app.post('/api/file/deleteMedia', (req, res) => {
  try {
    const { type, storedName } = req.body;
    if (!type || !storedName) {
      return fail(res, 400, 1, '缺少参数');
    }
    initDataStorage();
    const config = getConfig(true);
    const uploadDir = type === 'pic' ? config.picUploadPath : config.movUploadPath;
    if (!uploadDir) {
      return fail(res, 400, 2, '未配置存储路径');
    }
    const deleted = deleteMedia(type, storedName, uploadDir);
    if (!deleted) {
      return fail(res, 400, 3, '文件不存在或已删除');
    }
    ok(res, null, '删除成功');
  } catch (error) {
    fail(res, 500, 4, error.message);
  }
});

app.post('/api/refreshCache', (req, res) => {
  cache.clear();
  ok(res, null, 'Cache cleared and refreshed.');
});
