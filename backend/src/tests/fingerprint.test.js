const {
  normalizeTitle,
  computeStructuralKey,
  cosineSimilarity,
  findBestMatch,
  SIMILARITY_THRESHOLD,
} = require('../utils/fingerprint');

describe('normalizeTitle', () => {
  test('lowercases and strips punctuation', () => {
    expect(normalizeTitle('Missing Token!')).toBe(normalizeTitle('missing token'));
  });

  test('strips numbers', () => {
    expect(normalizeTitle('Error on line 42')).toBe(normalizeTitle('Error on line 99'));
  });

  test('removes stopwords', () => {
    const result = normalizeTitle('This is a missing test');
    expect(result).not.toMatch(/\bthis\b/);
    expect(result).not.toMatch(/\bis\b/);
    expect(result).not.toMatch(/\ba\b/);
  });

  test('order-invariant - same tokens in different order produce same result', () => {
    expect(normalizeTitle('Missing authentication tests')).toBe(
      normalizeTitle('Tests for authentication are missing')
    );
  });

  test('crude stemming collapses common suffix variants', () => {
    expect(normalizeTitle('missing tests')).toBe(normalizeTitle('missing test'));
  });

  test('different issues produce different normalized strings', () => {
    expect(normalizeTitle('Missing authentication tests')).not.toBe(
      normalizeTitle('Missing input validation')
    );
  });
});

describe('computeStructuralKey', () => {
  const base = {
    owner: 'Vikki2222',
    repo: 'workshop',
    filePath: 'auth.js',
    category: 'testing',
    title: 'Missing authentication tests',
  };

  test('same input always produces same key (deterministic)', () => {
    expect(computeStructuralKey(base)).toBe(computeStructuralKey(base));
  });

  test('differently-worded but same-meaning titles produce same key', () => {
    const keyA = computeStructuralKey({ ...base, title: 'Missing authentication tests' });
    const keyB = computeStructuralKey({ ...base, title: 'Tests for authentication are missing' });
    expect(keyA).toBe(keyB);
  });

  test('different files produce different keys', () => {
    const keyA = computeStructuralKey({ ...base, filePath: 'auth.js' });
    const keyB = computeStructuralKey({ ...base, filePath: 'payment.js' });
    expect(keyA).not.toBe(keyB);
  });

  test('different categories produce different keys', () => {
    const keyA = computeStructuralKey({ ...base, category: 'testing' });
    const keyB = computeStructuralKey({ ...base, category: 'security' });
    expect(keyA).not.toBe(keyB);
  });

  test('different repos produce different keys', () => {
    const keyA = computeStructuralKey({ ...base, repo: 'workshop' });
    const keyB = computeStructuralKey({ ...base, repo: 'syncwise' });
    expect(keyA).not.toBe(keyB);
  });

  test('key is a 64-char hex string (SHA-256)', () => {
    const key = computeStructuralKey(base);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('cosineSimilarity', () => {
  test('identical vectors produce similarity of 1', () => {
    const v = [1, 0, 0, 1];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  test('orthogonal vectors produce similarity of 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  test('opposite vectors produce similarity of -1', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  test('similarity is symmetric', () => {
    const a = [0.5, 0.3, 0.8];
    const b = [0.1, 0.9, 0.4];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
  });
});

describe('findBestMatch', () => {
  const highSimilarityEmbedding = [1, 0, 0];
  const lowSimilarityEmbedding = [0, 1, 0];

  const candidates = [
    { id: 1, embedding: JSON.stringify([1, 0, 0]), representative_title: 'Missing auth tests' },
    { id: 2, embedding: JSON.stringify([0, 1, 0]), representative_title: 'Poor error handling' },
  ];

  const parsedCandidates = candidates.map((c) => ({
    ...c,
    embedding: JSON.parse(c.embedding),
  }));

  test('returns best match above threshold', () => {
    const result = findBestMatch(highSimilarityEmbedding, parsedCandidates);
    expect(result).not.toBeNull();
    expect(result.fingerprint.id).toBe(1);
    expect(result.score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  });

  test('returns null when best match is below threshold', () => {
    const result = findBestMatch([0, 0, 1], parsedCandidates);
    expect(result).toBeNull();
  });

  test('returns null for empty candidates list', () => {
    expect(findBestMatch(highSimilarityEmbedding, [])).toBeNull();
  });

  test('skips candidates with null embedding', () => {
    const withNull = [{ id: 3, embedding: null, representative_title: 'Something' }];
    expect(findBestMatch(highSimilarityEmbedding, withNull)).toBeNull();
  });
});
