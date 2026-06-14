export let cachePicListKey = "PicListCache";  // 缓存Pic key

export const PATH_CACHE_KEY = 'fileSystemList';
export const DEFAULT_PATH = "/";
export const VIDEO_TYPE_ENUM = [
  "mp4", "avi", "mov", "mkv", "webm", "flv", "wmv", "mpeg", "mpg", "3gp", "ogv", "vob" // 视频
]
export const FILE_TYPE_ENUM = [
  "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tiff", "ico", "heif", // 图片
  ...VIDEO_TYPE_ENUM, // 作为图像属性,因该包括视频文件
];

