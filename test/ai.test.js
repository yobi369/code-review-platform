'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeCode } = require('../services/ai');

test('AI analysis rejects missing code', async () => {
  await assert.rejects(() => analyzeCode(''), { statusCode: 400 });
  await assert.rejects(() => analyzeCode(null), { statusCode: 400 });
});

test('AI analysis rejects oversized code before provider access', async () => {
  await assert.rejects(() => analyzeCode('x'.repeat(20001)), { statusCode: 413 });
});

test('AI analysis reports unconfigured provider explicitly', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(() => analyzeCode('const x = 1'), { statusCode: 503 });
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  }
});
