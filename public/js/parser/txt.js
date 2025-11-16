const UTF8 = new TextDecoder('utf-8');

export function extractTxtMetadata(fileName, buffer) {
  const text = UTF8.decode(buffer.slice(0, 4096));
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  const title = firstLine && firstLine.length < 80 && looksLikeHeading(firstLine)
    ? firstLine
    : inferTitleFromFileName(fileName);
  return {
    title: title || inferTitleFromFileName(fileName),
    author: undefined,
    mediaType: 'text/plain',
  };
}

function inferTitleFromFileName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || 'Untitled';
}

function looksLikeHeading(line) {
  if (/^chapter\b/i.test(line)) return true;
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upper = line.replace(/[^A-Z]/g, '').length;
  return upper / letters.length > 0.6;
}

export function parseTxt(buffer) {
  const text = UTF8.decode(buffer);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((para) => para.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return paragraphs;
}
