import { expect, test } from 'bun:test';
import { parseUnifiedDiff } from '../../core/diff.ts';

test('extracts changed files and 1-indexed added line numbers', () => {
  const diff = [
    'diff --git a/src/a.ts b/src/a.ts',
    '--- /dev/null',
    '+++ b/src/a.ts',
    '@@ -0,0 +1,3 @@',
    '+const x = 1;',
    '+const y = 2;',
    '+const z = 3;',
  ].join('\n');

  const files = parseUnifiedDiff(diff);
  expect(files).toHaveLength(1);
  expect(files[0]!.path).toBe('src/a.ts');
  expect(files[0]!.addedLines).toEqual([1, 2, 3]);
});

test('tracks new-file line numbers across context and removals', () => {
  const diff = ['+++ b/src/b.ts', '@@ -1,2 +1,3 @@', ' keep();', '-gone();', '+added();', ' tail();'].join('\n');

  const files = parseUnifiedDiff(diff);
  // new file: line 1 ' keep()', line 2 '+added()', line 3 ' tail()'
  expect(files[0]!.addedLines).toEqual([2]);
});
