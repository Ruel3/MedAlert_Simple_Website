import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMatrix } from '../backend/qr.js';

test('makeMatrix returns a square binary QR matrix for short text', () => {
  const matrix = makeMatrix('MEDALERT:abc123');

  assert.equal(matrix.length, 21);
  assert.ok(matrix.every((row) => row.length === 21));
  assert.ok(matrix.every((row) => /^[01]+$/.test(row)));
});

test('makeMatrix selects a larger QR version when the payload grows', () => {
  const matrix = makeMatrix('A'.repeat(18));

  assert.equal(matrix.length, 25);
  assert.ok(matrix.every((row) => row.length === 25));
});

test('makeMatrix rejects text beyond the supported QR capacity', () => {
  assert.throws(() => makeMatrix('A'.repeat(3000)), {
    name: 'RangeError',
    message: 'Text too long for this QR encoder',
  });
});
