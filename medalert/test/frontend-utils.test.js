import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanScanned,
  formatDateTime,
  isEmail,
  isNationalId,
  isPhone,
  joinList,
  normalizePhone,
  passwordProblems,
  qrPath,
  splitList,
} from '../frontend/js/utils.js';

test('normalizePhone removes common formatting and handles nullish values', () => {
  assert.equal(normalizePhone('+1 (234) 567-890'), '+1234567890');
  assert.equal(normalizePhone(null), '');
});

test('isEmail accepts a valid address and rejects malformed addresses', () => {
  assert.equal(isEmail(' patient@example.com '), true);
  assert.equal(isEmail('patient.example.com'), false);
  assert.equal(isEmail('patient@localhost'), false);
});

test('isPhone accepts 7-15 digits after normalization', () => {
  assert.equal(isPhone('+1 (234) 567-890'), true);
  assert.equal(isPhone('123456'), false);
  assert.equal(isPhone('1234567890123456'), false);
  assert.equal(isPhone('123-45a-7890'), false);
});

test('isNationalId accepts exactly eight digits after trimming', () => {
  assert.equal(isNationalId(' 12345678 '), true);
  assert.equal(isNationalId('1234567'), false);
  assert.equal(isNationalId('1234567a'), false);
});

test('passwordProblems enforces inclusive 6-12 character bounds', () => {
  assert.deepEqual(passwordProblems('12345'), ['Use at least 6 characters.']);
  assert.deepEqual(passwordProblems('123456'), []);
  assert.deepEqual(passwordProblems('123456789012'), []);
  assert.deepEqual(passwordProblems('1234567890123'), ['Use no more than 12 characters.']);
});

test('splitList trims values and removes case-insensitive duplicates and blanks', () => {
  assert.deepEqual(splitList(' Penicillin\ninsulin, PENICILLIN,\n , aspirin '), [
    'Penicillin',
    'insulin',
    'aspirin',
  ]);
  assert.deepEqual(splitList(null), []);
});

test('joinList joins arrays with newlines and rejects non-arrays', () => {
  assert.equal(joinList(['allergy', 'condition']), 'allergy\ncondition');
  assert.equal(joinList('allergy'), '');
});

test('formatDateTime returns a localized value for valid dates and empty text for invalid dates', () => {
  assert.notEqual(formatDateTime('2025-01-02T03:04:00.000Z'), '');
  assert.equal(formatDateTime('not-a-date'), '');
});

test('cleanScanned trims surrounding whitespace', () => {
  assert.equal(cleanScanned('  MEDALERT:abc123\n'), 'MEDALERT:abc123');
  assert.equal(cleanScanned(null), '');
});

test('qrPath emits one SVG subpath for each dark module with the quiet-zone offset', () => {
  assert.equal(qrPath(['10', '01']), 'M4 4h1v1h-1zM5 5h1v1h-1z');
  assert.equal(qrPath(['1'], 2), 'M2 2h1v1h-1z');
});
