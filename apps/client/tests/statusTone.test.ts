import { describe, expect, test } from 'bun:test';
import { statusTone } from '../src/utils/statusTone';

describe('statusTone', () => {
  test('wallet statuses', () => {
    expect(statusTone('idle')).toBe('idle');
    expect(statusTone('connecting')).toBe('progress');
    expect(statusTone('syncing')).toBe('progress');
    expect(statusTone('ready')).toBe('success');
    expect(statusTone('error')).toBe('error');
  });

  test('transaction statuses', () => {
    expect(statusTone('Unconfirmed')).toBe('progress');
    expect(statusTone('Valid')).toBe('success');
    expect(statusTone('Confirmed')).toBe('success');
    expect(statusTone('Voided')).toBe('error');
    expect(statusTone('Unknown')).toBe('idle');
  });

  test('session and helper-server statuses', () => {
    expect(statusTone('connected')).toBe('success');
    expect(statusTone('disconnected')).toBe('idle');
    expect(statusTone('rejected')).toBe('error');
    expect(statusTone('starting')).toBe('progress');
    expect(statusTone('checking')).toBe('progress');
    expect(statusTone('online')).toBe('success');
    expect(statusTone('offline')).toBe('error');
  });

  test('dry run has its own tone', () => {
    expect(statusTone('dry-run')).toBe('dry-run');
    expect(statusTone('Dry run')).toBe('dry-run');
    expect(statusTone('not sent')).toBe('dry-run');
  });

  test('is case- and whitespace-insensitive', () => {
    expect(statusTone('  READY ')).toBe('success');
    expect(statusTone('Waiting for MetaMask')).toBe('progress');
  });

  test('unknown, empty and nullish values are idle', () => {
    expect(statusTone('something-else')).toBe('idle');
    expect(statusTone('')).toBe('idle');
    expect(statusTone(null)).toBe('idle');
    expect(statusTone(undefined)).toBe('idle');
  });
});
