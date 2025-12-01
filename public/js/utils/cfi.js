const BASE_CFI_PATH = '/6/2[paperread]!/4/2';

function clamp(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function buildCfi(paraIndex = 0, offset = 0) {
  const paragraph = clamp(paraIndex);
  const charOffset = clamp(offset);
  const nodeIndex = Math.max(1, paragraph + 1) * 2;
  return `epubcfi(${BASE_CFI_PATH}/${nodeIndex}[para-${paragraph}]text()[1]:${charOffset})`;
}

export function parseCfi(cfi) {
  if (typeof cfi !== 'string') return null;
  const match = /para-(\d+)\]text\(\)\[1\]:(\d+)/.exec(cfi);
  if (!match) return null;
  return {
    paraIndex: Number.parseInt(match[1], 10),
    offset: Number.parseInt(match[2], 10) || 0,
  };
}

export function resolveCfi(cfi, fallbackPara = 0) {
  const parsed = parseCfi(cfi);
  if (!parsed) {
    return {
      paraIndex: clamp(fallbackPara),
      offset: 0,
    };
  }
  return {
    paraIndex: clamp(parsed.paraIndex),
    offset: clamp(parsed.offset),
  };
}
