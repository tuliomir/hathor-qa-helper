/**
 * Smoke tests for toastSlice
 * Tests toast notification Redux slice reducers
 */

import { describe, expect, test } from 'bun:test';
import toastReducer, { addToast, removeToast, type Toast, type ToastType } from '../src/store/slices/toastSlice';

describe('toastSlice', () => {
  const initialState = {
    toasts: [] as Toast[],
  };

  describe('initial state', () => {
    test('starts with empty toasts array', () => {
      const state = toastReducer(undefined, { type: 'unknown' });
      expect(state.toasts).toEqual([]);
    });
  });

  describe('addToast', () => {
    test('adds a success toast', () => {
      const toast: Toast = {
        id: 'test-1',
        message: 'Operation successful',
        type: 'success',
      };

      const state = toastReducer(initialState, addToast(toast));

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0]).toEqual(toast);
    });

    test('adds an error toast', () => {
      const toast: Toast = {
        id: 'test-error',
        message: 'Something went wrong',
        type: 'error',
      };

      const state = toastReducer(initialState, addToast(toast));

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].type).toBe('error');
    });

    test('adds toast with custom duration', () => {
      const toast: Toast = {
        id: 'test-duration',
        message: 'Custom duration toast',
        type: 'info',
        duration: 5000,
      };

      const state = toastReducer(initialState, addToast(toast));

      expect(state.toasts[0].duration).toBe(5000);
    });

    test('can add multiple toasts', () => {
      const toasts: Toast[] = [
        { id: '1', message: 'First', type: 'success' },
        { id: '2', message: 'Second', type: 'error' },
        { id: '3', message: 'Third', type: 'warning' },
      ];

      let state = initialState;
      for (const toast of toasts) {
        state = toastReducer(state, addToast(toast));
      }

      expect(state.toasts).toHaveLength(3);
    });

    test('adds toast with link', () => {
      const toast: Toast = {
        id: 'test-link',
        message: 'View transaction:',
        type: 'success',
        link: { url: 'https://example.com/tx/123', label: 'link' },
      };

      const state = toastReducer(initialState, addToast(toast));

      expect(state.toasts[0].link).toEqual({ url: 'https://example.com/tx/123', label: 'link' });
    });

    test('supports all toast types', () => {
      const types: ToastType[] = ['success', 'error', 'warning', 'info'];

      for (const type of types) {
        const toast: Toast = {
          id: `test-${type}`,
          message: `${type} message`,
          type,
        };

        const state = toastReducer(initialState, addToast(toast));
        expect(state.toasts[0].type).toBe(type);
      }
    });
  });

  describe('removeToast', () => {
    test('removes toast by id', () => {
      const stateWithToast = {
        toasts: [{ id: 'to-remove', message: 'Test', type: 'success' as ToastType }],
      };

      const state = toastReducer(stateWithToast, removeToast('to-remove'));

      expect(state.toasts).toHaveLength(0);
    });

    test('removes only the specified toast', () => {
      const stateWithToasts = {
        toasts: [
          { id: '1', message: 'First', type: 'success' as ToastType },
          { id: '2', message: 'Second', type: 'error' as ToastType },
          { id: '3', message: 'Third', type: 'warning' as ToastType },
        ],
      };

      const state = toastReducer(stateWithToasts, removeToast('2'));

      expect(state.toasts).toHaveLength(2);
      expect(state.toasts.find((t) => t.id === '2')).toBeUndefined();
      expect(state.toasts.find((t) => t.id === '1')).toBeDefined();
      expect(state.toasts.find((t) => t.id === '3')).toBeDefined();
    });

    test('does nothing when id not found', () => {
      const stateWithToast = {
        toasts: [{ id: 'existing', message: 'Test', type: 'success' as ToastType }],
      };

      const state = toastReducer(stateWithToast, removeToast('non-existent'));

      expect(state.toasts).toHaveLength(1);
    });

    test('handles empty toasts array', () => {
      const state = toastReducer(initialState, removeToast('any-id'));

      expect(state.toasts).toHaveLength(0);
    });
  });
});
