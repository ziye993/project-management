import {
  checkAndCreateTmpFolder, createThumbnail,
  hasTmpFile, isPicFile
} from "../../utils/file.js";
import cache from "../../cache.js";

import {cachePicListKey} from "../../const.js";
import fs from "fs";
import path from "path";
import {getConfig} from "../../utils/jsonFile.js";

const generateTmp = async(filePath)=>{
}

const initPicData = async (dirPath) => {
  const isTmp = await checkAndCreateTmpFolder(dirPath, true);
  if (!isTmp) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const uploadTmpApp = []
    fs.readdir(dirPath, {withFileTypes: true}, async (err, files) => {
      if (err) {
        reject(err);
        return
      }
      const fileDetails = files
      .filter(file => file.isFile()) // 过滤掉文件夹，只保留文件
      .map(file => {
        const filePath = path.join(dirPath, file.name);
        const stats = fs.statSync(filePath);
        const sizeInMB = stats.size / (1024 * 1024); // 转换为MB
        const [prefix, ..._fileName] = file.name.split("-");
        const fileName = _fileName.join("");
        const fileNames = fileName.split(".")
        const fileType = fileNames[fileNames.length - 1];
        if (!hasTmpFile(filePath)) {
          uploadTmpApp.push(async () => await createThumbnail(filePath))
        }
        return {
          path: filePath,
          fileType: fileType,
          tmpPath: filePath, // 如果有临时路径要求，这里可以改动
          name: fileName,
          prefixName: prefix || "", // 根据需求截取文件名
          size: sizeInMB.toFixed(2), // 保留两位小数
          unit: 'MB'
        };
      }).filter(_ => isPicFile(_.fileType));
      cache.set(cachePicListKey, fileDetails);
      const tmpRes = await Promise.allSettled(uploadTmpApp.map(_ => _()))
      resolve(fileDetails);
    });
  });
}

(async () => {
  try {
    const config = getConfig();
    if (config.picUploadPath) {
      await initPicData(config.picUploadPath, true);
    }
  } catch (e) {
    console.log('initPicData error', e)
  }
})()
