const {
  filterNoiseFiles,
  rankFilesBySignal,
  applyTokenBudget,
  buildReviewPayload,
} = require('../utils/diffBudget');

const makeFile = (filename, changes = 10, patch = 'x'.repeat(100)) => ({
  filename,
  status: 'modified',
  additions: changes,
  deletions: 0,
  changes,
  patch,
});

describe('filterNoiseFiles', () => {
  test('filters out node_modules paths', () => {
    const { kept, skipped } = filterNoiseFiles([makeFile('node_modules/lodash/index.js')]);
    expect(kept).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('ignored_path');
  });

  test('filters out lock files', () => {
    const { kept, skipped } = filterNoiseFiles([makeFile('package-lock.json')]);
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toBe('ignored_path');
  });

  test('filters out minified files', () => {
    const { kept, skipped } = filterNoiseFiles([makeFile('dist/bundle.min.js')]);
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toBe('ignored_path');
  });

  test('filters out files with no patch (binary or too large)', () => {
    const file = { ...makeFile('image.png'), patch: null };
    const { kept, skipped } = filterNoiseFiles([file]);
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toBe('no_patch_binary_or_too_large');
  });

  test('keeps real source files', () => {
    const { kept } = filterNoiseFiles([makeFile('src/auth.js')]);
    expect(kept).toHaveLength(1);
  });

  test('keeps multiple valid files', () => {
    const files = [makeFile('src/auth.js'), makeFile('src/payment.js'), makeFile('README.md')];
    const { kept } = filterNoiseFiles(files);
    expect(kept).toHaveLength(3);
  });
});

describe('rankFilesBySignal', () => {
  test('ranks by changes descending', () => {
    const files = [makeFile('low.js', 5), makeFile('high.js', 50), makeFile('medium.js', 20)];
    const ranked = rankFilesBySignal(files);
    expect(ranked[0].filename).toBe('high.js');
    expect(ranked[2].filename).toBe('low.js');
  });

  test('boosts source files over markdown', () => {
    const files = [
      makeFile('README.md', 20),
      makeFile('auth.js', 20),
    ];
    const ranked = rankFilesBySignal(files);
    expect(ranked[0].filename).toBe('auth.js');
  });

  test('boosts known hotspot files', () => {
    const files = [makeFile('normal.js', 20), makeFile('hotspot.js', 20)];
    const ranked = rankFilesBySignal(files, { hotspotFilenames: new Set(['hotspot.js']) });
    expect(ranked[0].filename).toBe('hotspot.js');
  });

  test('does not mutate the original array', () => {
    const files = [makeFile('a.js', 5), makeFile('b.js', 50)];
    const original = [...files];
    rankFilesBySignal(files);
    expect(files[0].filename).toBe(original[0].filename);
  });
});

describe('applyTokenBudget', () => {
  test('includes files that fit within budget', () => {
    const files = [makeFile('small.js', 10, 'x'.repeat(100))];
    const { included, skippedForBudget } = applyTokenBudget(files, { maxTokens: 7000 });
    expect(included).toHaveLength(1);
    expect(skippedForBudget).toHaveLength(0);
  });

  test('excludes files that exceed budget', () => {
    const bigPatch = 'x'.repeat(7000 * 4 + 1);
    const files = [makeFile('huge.js', 100, bigPatch)];
    const { included, skippedForBudget } = applyTokenBudget(files, { maxTokens: 7000 });
    expect(included).toHaveLength(0);
    expect(skippedForBudget).toHaveLength(1);
    expect(skippedForBudget[0].reason).toBe('over_token_budget');
  });

  test('fills budget greedily - includes small files after a large one is skipped', () => {
    const bigPatch = 'x'.repeat(6000 * 4);
    const smallPatch = 'x'.repeat(100);
    const files = [makeFile('big.js', 100, bigPatch), makeFile('small.js', 10, smallPatch)];
    const { included } = applyTokenBudget(files, { maxTokens: 7000 });
    expect(included).toHaveLength(2);
  });

  test('returns tokensUsed', () => {
    const files = [makeFile('file.js', 10, 'x'.repeat(400))];
    const { tokensUsed } = applyTokenBudget(files, { maxTokens: 7000 });
    expect(tokensUsed).toBe(100);
  });
});

describe('buildReviewPayload', () => {
  test('partialAnalysis is false when nothing is skipped', () => {
    const files = [makeFile('src/auth.js')];
    const { partialAnalysis, skippedFiles } = buildReviewPayload(files);
    expect(partialAnalysis).toBe(false);
    expect(skippedFiles).toHaveLength(0);
  });

  test('partialAnalysis is true when noise files are skipped', () => {
    const files = [makeFile('src/auth.js'), makeFile('node_modules/lib.js')];
    const { partialAnalysis, skippedFiles } = buildReviewPayload(files);
    expect(partialAnalysis).toBe(true);
    expect(skippedFiles).toHaveLength(1);
  });

  test('filesToAnalyze is sorted by signal (source before markdown)', () => {
    const files = [makeFile('README.md', 20), makeFile('auth.js', 20)];
    const { filesToAnalyze } = buildReviewPayload(files);
    expect(filesToAnalyze[0].filename).toBe('auth.js');
  });

  test('returns empty filesToAnalyze for all-noise input', () => {
    const files = [makeFile('package-lock.json'), makeFile('node_modules/lib.js')];
    const { filesToAnalyze, partialAnalysis } = buildReviewPayload(files);
    expect(filesToAnalyze).toHaveLength(0);
    expect(partialAnalysis).toBe(true);
  });
});
