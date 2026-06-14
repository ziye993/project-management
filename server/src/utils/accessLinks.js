import os from 'os';
import { getConfig } from './jsonFile.js';
import { encodeUrlPath, encodeUrlPathRelative } from './filenameEncoding.js';

const PORT = 30000;

export function getLanAddresses() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  return results;
}

export function buildAccessLinks(requestPath, storedName) {
  const config = getConfig();
  const links = [];
  const urlPath = encodeUrlPath(requestPath, storedName);

  if (config.publicBaseUrl) {
    links.push({
      type: 'public',
      label: '公网链接',
      url: `${config.publicBaseUrl.replace(/\/$/, '')}${urlPath}`,
    });
  }

  links.push({
    type: 'localhost',
    label: '本机 localhost',
    url: `http://localhost:${PORT}${urlPath}`,
  });

  links.push({
    type: 'localhost',
    label: '本机 127.0.0.1',
    url: `http://127.0.0.1:${PORT}${urlPath}`,
  });

  for (const lan of getLanAddresses()) {
    links.push({
      type: 'lan',
      label: `局域网 ${lan.address} (${lan.name})`,
      url: `http://${lan.address}:${PORT}${urlPath}`,
    });
  }

  return links;
}

export function buildAccessLinksRelative(base, relativePath) {
  const config = getConfig();
  const links = [];
  const urlPath = encodeUrlPathRelative(base, relativePath);

  if (config.publicBaseUrl) {
    links.push({
      type: 'public',
      label: '公网链接',
      url: `${config.publicBaseUrl.replace(/\/$/, '')}${urlPath}`,
    });
  }

  links.push({
    type: 'localhost',
    label: '本机 localhost',
    url: `http://localhost:${PORT}${urlPath}`,
  });

  links.push({
    type: 'localhost',
    label: '本机 127.0.0.1',
    url: `http://127.0.0.1:${PORT}${urlPath}`,
  });

  for (const lan of getLanAddresses()) {
    links.push({
      type: 'lan',
      label: `局域网 ${lan.address} (${lan.name})`,
      url: `http://${lan.address}:${PORT}${urlPath}`,
    });
  }

  return links;
}

export function buildMediaLinks(type, storedName) {
  const config = getConfig();
  const base = type === 'pic' ? config.picRequestPath
    : type === 'mov' ? config.movRequestPath
      : config.fileRequestPath;
  return buildAccessLinks(base, storedName);
}
