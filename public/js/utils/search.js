const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
  'they', 'this', 'to', 'was', 'will', 'with', 'were', 'from', 'your', 'you', 'we', 'our',
]);

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function tokenize(str) {
  return stripDiacritics(str)
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
}

function stem(token) {
  if (!token || token.length <= 2) return token;
  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('ings') && token.length > 6) {
    return token.slice(0, -4);
  }
  if (token.endsWith('ing') && token.length > 5) {
    return token.slice(0, -3);
  }
  if (token.endsWith('ed') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('ers') && token.length > 5) {
    return token.slice(0, -3);
  }
  if (token.endsWith('er') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('ly') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('ment') && token.length > 6) {
    return token.slice(0, -4);
  }
  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

export function buildSearchIndex(paragraphs = []) {
  return paragraphs.map((text, index) => {
    const source = typeof text === 'string' ? text : String(text ?? '');
    const freq = Object.create(null);
    tokenize(source).forEach((token) => {
      if (STOP_WORDS.has(token)) return;
      const stemmed = stem(token);
      if (!stemmed) return;
      freq[stemmed] = (freq[stemmed] || 0) + 1;
    });
    return {
      index,
      freq,
      length: source.length,
    };
  });
}

export function searchIndex(indexEntries, query, { limit = 25 } = {}) {
  if (!Array.isArray(indexEntries) || !indexEntries.length) return [];
  const terms = tokenize(query)
    .filter((token) => !STOP_WORDS.has(token))
    .map((token) => stem(token))
    .filter((token, idx, arr) => token && arr.indexOf(token) === idx);
  if (!terms.length) {
    return [];
  }
  const matches = [];
  indexEntries.forEach((entry) => {
    let score = 0;
    let coverage = 0;
    terms.forEach((term) => {
      const count = entry.freq[term] || 0;
      if (count > 0) {
        score += count;
        coverage += 1;
      }
    });
    if (score > 0) {
      matches.push({
        index: entry.index,
        score: score * 2 + coverage,
      });
    }
  });
  return matches
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit);
}
