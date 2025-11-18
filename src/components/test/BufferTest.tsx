/**
 * Buffer Polyfill Test Component
 * Tests if buffer module is properly polyfilled
 */

import { useEffect, useState } from 'react';
// Test the exact pattern wallet-lib uses
import buffer from 'buffer';

export default function BufferTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const results: string[] = [];

    // Test 0: Test static import (exact wallet-lib pattern)
    try {
      // This is the exact pattern wallet-lib uses: import buffer from 'buffer'; buffer.Buffer.from()
      const testBuf = buffer.Buffer.from([1, 2, 3, 4]);
      results.push(`✓ Static import buffer.Buffer.from() works: ${testBuf.toString('hex')}`);
    } catch (err) {
      results.push(`✗ Static import buffer.Buffer.from() failed: ${err}`);
    }

    // Test 1: Check if Buffer global exists
    try {
      if (typeof Buffer !== 'undefined') {
        results.push('✓ Buffer global exists');
      } else {
        results.push('✗ Buffer global does NOT exist');
      }
    } catch (err) {
      results.push(`✗ Buffer global test failed: ${err}`);
    }

    // Test 2: Try to use Buffer.from()
    try {
      const buf = Buffer.from([1, 2, 3, 4]);
      results.push(`✓ Buffer.from() works: ${buf.toString('hex')}`);
    } catch (err) {
      results.push(`✗ Buffer.from() failed: ${err}`);
    }

    // Test 3: Try to import buffer module (with our shim) and use it like wallet-lib does
    try {
      import('buffer').then((bufferModule) => {
        const updatedResults = [...results];

        // Check what the module exports
        updatedResults.push(`Module exports: ${Object.keys(bufferModule).join(', ')}`);

        // Try the pattern used in wallet-lib: buffer.Buffer.from()
        try {
          if (bufferModule.Buffer) {
            const buf = bufferModule.Buffer.from([1, 2, 3, 4]);
            updatedResults.push(`✓ bufferModule.Buffer.from() works: ${buf.toString('hex')}`);
          } else {
            updatedResults.push('✗ bufferModule.Buffer does NOT exist');
          }
        } catch (err) {
          updatedResults.push(`✗ bufferModule.Buffer.from() failed: ${err}`);
        }

        // Try default import pattern
        try {
          const defaultExport = bufferModule.default;
          if (defaultExport) {
            updatedResults.push(`Default export exists: ${typeof defaultExport}`);
            if (defaultExport.Buffer) {
              const buf = defaultExport.Buffer.from([1, 2, 3, 4]);
              updatedResults.push(`✓ default.Buffer.from() works: ${buf.toString('hex')}`);
            } else {
              updatedResults.push('✗ default.Buffer does NOT exist');
            }
          } else {
            updatedResults.push('✗ No default export');
          }
        } catch (err) {
          updatedResults.push(`✗ Default export test failed: ${err}`);
        }

        setTestResults(updatedResults);
      });
    } catch (err) {
      results.push(`✗ import('buffer') failed: ${err}`);
      setTestResults(results);
    }
  }, []);

  return (
    <div className="max-w-300 mx-auto">
      <h1 className="mt-0 text-3xl font-bold">Buffer Polyfill Test</h1>
      <div className="card-primary">
        <h2 className="text-xl font-bold mb-4">Test Results:</h2>
        <div className="space-y-2">
          {testResults.map((result, idx) => (
            <div
              key={idx}
              className={`p-2 rounded font-mono text-sm ${
                result.startsWith('✓') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
