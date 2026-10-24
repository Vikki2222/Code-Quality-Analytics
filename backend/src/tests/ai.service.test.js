const mockCreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
    embeddings: { create: jest.fn() },
  }))
);

const { analyzeDiff, parseAndValidateFindings } = require('../services/ai.service');

const VALID_FINDING = {
  category: 'security',
  severity: 'high',
  file: 'src/a.js',
  line: 3,
  title: 'SQL built from input',
  description: 'User input concatenated into SQL.',
  recommendation: 'Use parameters.',
};

const FILES = [{ filename: 'src/a.js', status: 'modified', patch: '+x' }];

beforeEach(() => mockCreate.mockReset());

describe('parseAndValidateFindings', () => {
  test('parses a plain JSON response', () => {
    const out = parseAndValidateFindings(JSON.stringify({ findings: [VALID_FINDING] }), 'm');
    expect(out).toEqual({ findings: [VALID_FINDING], model: 'm' });
  });

  test('strips markdown code fences', () => {
    const raw = '```json\n' + JSON.stringify({ findings: [VALID_FINDING] }) + '\n```';
    expect(parseAndValidateFindings(raw, 'm').findings).toHaveLength(1);
  });

  test('drops findings with an unknown category or severity, or missing fields', () => {
    const raw = JSON.stringify({
      findings: [
        VALID_FINDING,
        { ...VALID_FINDING, category: 'style' },
        { ...VALID_FINDING, severity: 'urgent' },
        { ...VALID_FINDING, title: '' },
      ],
    });
    expect(parseAndValidateFindings(raw, 'm').findings).toEqual([VALID_FINDING]);
  });

  test('nulls a non-numeric line and a missing recommendation', () => {
    const raw = JSON.stringify({ findings: [{ ...VALID_FINDING, line: '3', recommendation: undefined }] });
    const [f] = parseAndValidateFindings(raw, 'm').findings;
    expect(f.line).toBeNull();
    expect(f.recommendation).toBeNull();
  });

  test('throws a readable error for non-JSON', () => {
    expect(() => parseAndValidateFindings('Sorry, I cannot help', 'm')).toThrow(/not valid JSON/);
  });

  test('throws when findings array is missing', () => {
    expect(() => parseAndValidateFindings('{"issues": []}', 'm')).toThrow(/missing a "findings" array/);
  });
});

describe('analyzeDiff', () => {
  test('throws a readable error when the model returns null content', async () => {
    mockCreate.mockResolvedValue({ model: 'free/x', choices: [{ message: { content: null } }] });
    await expect(analyzeDiff(FILES)).rejects.toThrow('AI returned an empty response (model: free/x)');
  });

  test('throws a readable error when the model returns no choices', async () => {
    mockCreate.mockResolvedValue({ choices: [] });
    await expect(analyzeDiff(FILES)).rejects.toThrow(/empty response/);
  });

  test('sends each file patch to the model', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '{"findings": []}' } }] });
    await analyzeDiff(FILES);
    const userMessage = mockCreate.mock.calls[0][0].messages[1].content;
    expect(userMessage).toContain('### File: src/a.js (modified)');
  });
});
