import { unzipSync, strFromU8 } from 'fflate';

const XML_PARSER = new DOMParser();

function parseXml(text) {
  const doc = XML_PARSER.parseFromString(text, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(parserError.textContent || 'Invalid XML');
  }
  return doc;
}

function getRootFile(zipMap) {
  const containerText = readEntry(zipMap, 'META-INF/container.xml');
  const container = parseXml(containerText);
  const rootfile = container.querySelector('rootfile');
  if (!rootfile) throw new Error('Rootfile missing');
  return rootfile.getAttribute('full-path');
}

function readEntry(zipMap, path) {
  const normalized = path.replace(/^\.\//, '');
  const entry = zipMap[normalized];
  if (!entry) throw new Error(`Missing entry: ${normalized}`);
  return strFromU8(entry);
}

function readBinaryEntry(zipMap, path) {
  const normalized = path.replace(/^\.\//, '');
  const entry = zipMap[normalized];
  if (!entry) throw new Error(`Missing entry: ${normalized}`);
  return entry;
}

function resolvePath(basePath, relative) {
  if (!relative) return relative;
  if (/^https?:/i.test(relative)) return relative;
  const baseParts = basePath.split('/');
  baseParts.pop();
  const relParts = relative.split('/');
  for (const part of relParts) {
    if (part === '..') baseParts.pop();
    else if (part !== '.') baseParts.push(part);
  }
  return baseParts.join('/');
}

function extractCover(zip, pkgDoc, rootPath) {
  const metaCover = pkgDoc.querySelector('meta[name="cover"]');
  if (!metaCover) return undefined;
  const coverId = metaCover.getAttribute('content');
  if (!coverId) return undefined;
  const item = pkgDoc.querySelector(`manifest > item[id="${coverId}"]`);
  if (!item) return undefined;
  const href = item.getAttribute('href');
  const mediaType = item.getAttribute('media-type') || 'image/jpeg';
  const coverPath = resolvePath(rootPath, href);
  try {
    const binary = readBinaryEntry(zip, coverPath);
    const base64 = btoa(String.fromCharCode(...binary));
    return `data:${mediaType};base64,${base64}`;
  } catch (err) {
    console.warn('Failed to extract cover', err);
    return undefined;
  }
}

function extractTextFromDoc(doc) {
  const paragraphs = [];
  doc.querySelectorAll('p, div, section').forEach((node) => {
    const text = node.textContent?.replace(/\s+/g, ' ').trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  });
  return paragraphs;
}

export function extractEpubMetadata(buffer) {
  const zip = unzipSync(new Uint8Array(buffer));
  const rootPath = getRootFile(zip);
  const packageDoc = parseXml(readEntry(zip, rootPath));
  const metadata = packageDoc.querySelector('metadata');
  const title = metadata?.querySelector('title')?.textContent?.trim() || 'Untitled';
  const creator = metadata?.querySelector('creator')?.textContent?.trim();
  return {
    title,
    author: creator,
    cover: extractCover(zip, packageDoc, rootPath),
    mediaType: 'application/epub+zip',
    rootPath,
  };
}

export function parseEpub(buffer) {
  const zip = unzipSync(new Uint8Array(buffer));
  const rootPath = getRootFile(zip);
  const packageDoc = parseXml(readEntry(zip, rootPath));
  const manifest = new Map();
  packageDoc.querySelectorAll('manifest > item').forEach((item) => {
    manifest.set(item.getAttribute('id'), item.getAttribute('href'));
  });
  const paragraphs = [];
  packageDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    const href = manifest.get(idref);
    if (!href) return;
    try {
      const fullPath = resolvePath(rootPath, href);
      const xhtml = readEntry(zip, fullPath);
      const doc = XML_PARSER.parseFromString(xhtml, 'application/xhtml+xml');
      paragraphs.push(...extractTextFromDoc(doc));
    } catch (err) {
      console.warn('Skip spine item', href, err);
    }
  });
  return paragraphs;
}
