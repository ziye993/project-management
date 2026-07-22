let cmd;
const openUrl = (port) => {
  // Docker / 无头环境不要弹浏览器
  if (process.env.OPEN_BROWSER === '0' || process.env.DOCKER === '1') return;
  const url = `http://localhost:${port}/project/home`;
  switch (process.platform) {
    case 'win32':
      cmd = `start "" "${url}"`;
      break;
    case 'darwin':
      cmd = `open "${url}"`;
      break;
    case 'linux':
      cmd = `xdg-open "${url}"`;
      break;
    default:
      console.log(`Open in browser: ${url}`);
      return;
  }
  import('child_process').then(({ exec }) => {
    exec(cmd, (err) => {
      if (err) console.log(`Open in browser: ${url}`);
    });
  });
};

export default openUrl;
