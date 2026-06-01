import { expect, test } from 'bun:test';
import { skippedTests } from '../../domains/swe-feature/verifiers/gaps/skipped-tests.ts';

test('flags .skip / .only and assertion-free tests', async () => {
  const dir = `/tmp/tmb-skip-${Date.now()}`;
  const src = [
    "it.skip('a', () => { expect(1).toBe(1); });", // line 1: skipped
    "it('b', () => { doThing(); });", // line 2: no expect -> assertion-free
    "it('c', () => { expect(2).toBe(2); });", // line 3: fine
  ].join('\n');
  await Bun.write(`${dir}/a.test.ts`, src);

  const findings = await skippedTests.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'a.test.ts', addedLines: [1, 2, 3] }],
  });

  const lines = findings.map((f) => f.line).sort();
  expect(lines).toEqual([1, 2]);
  expect(findings.every((f) => f.dimension === 'test_honesty')).toBe(true);
});
