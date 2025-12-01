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

function toBase64(u8) {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < u8.length; i += step) {
    const chunk = u8.subarray(i, i + step);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

function extractCover(zip, pkgDoc, rootPath) {
  // EPUB 2: <meta name="cover" content="id">
  const metaCover = pkgDoc.querySelector('meta[name="cover"]');
  if (metaCover) {
    const coverId = metaCover.getAttribute('content');
    const item = coverId && pkgDoc.querySelector(`manifest > item[id="${coverId}"]`);
    if (item) {
      const href = item.getAttribute('href');
      const mediaType = item.getAttribute('media-type') || 'image/jpeg';
      const coverPath = resolvePath(rootPath, href);
      try {
        const binary = readBinaryEntry(zip, coverPath);
        const base64 = toBase64(binary);
        return `data:${mediaType};base64,${base64}`;
      } catch {}
    }
  }
  // EPUB 3: manifest item with properties ~= "cover-image"
  const propItem = pkgDoc.querySelector('manifest > item[properties~="cover-image"]');
  if (propItem) {
    const href = propItem.getAttribute('href');
    const mediaType = propItem.getAttribute('media-type') || 'image/jpeg';
    const coverPath = resolvePath(rootPath, href);
    try {
      const binary = readBinaryEntry(zip, coverPath);
      const base64 = toBase64(binary);
      return `data:${mediaType};base64,${base64}`;
    } catch {}
  }
  // Guide reference fallback
  const guideRef = pkgDoc.querySelector('guide > reference[type="cover"], guide > reference[type="cover-image"]');
  if (guideRef) {
    const href = guideRef.getAttribute('href');
    const coverPath = resolvePath(rootPath, href);
    try {
      const binary = readBinaryEntry(zip, coverPath);
      const base64 = toBase64(binary);
      return `data:image/jpeg;base64,${base64}`;
    } catch {}
  }
  return undefined;
}

function extractContentFromDoc(doc, sink) {
  const nodes = doc.body?.querySelectorAll('h1, h2, h3, p, div, section') || [];
  nodes.forEach((node) => {
    const text = node.textContent?.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      if (text.length >= 3) {
        sink.chapters.push({ title: text, index: sink.paragraphs.length });
      }
      return;
    }
    if (text.length > 20) {
      sink.paragraphs.push(text);
    }
  });
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
  const sink = { paragraphs: [], chapters: [] };
  packageDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    const href = manifest.get(idref);
    if (!href) return;
    try {
      const fullPath = resolvePath(rootPath, href);
      const xhtml = readEntry(zip, fullPath);
      const doc = XML_PARSER.parseFromString(xhtml, 'application/xhtml+xml');
      extractContentFromDoc(doc, sink);
    } catch (err) {
      console.warn('Skip spine item', href, err);
    }
  });
  return sink;
}
