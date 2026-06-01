import { expect, test } from 'bun:test';
import { leftoverStub } from '../../domains/swe-feature/verifiers/gaps/leftover-stub.ts';

test('flags TODO and not-implemented markers on ADDED lines only', async () => {
  const dir = `/tmp/tmb-stub-${Date.now()}`;
  await Bun.write(
    `${dir}/src/a.ts`,
    ['const ok = 1;', '// TODO: wire this up', 'throw new Error("not implemented");'].join('\n'),
  );

  const findings = await leftoverStub.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'src/a.ts', addedLines: [2, 3] }],
  });

  expect(findings.map((f) => f.line).sort()).toEqual([2, 3]);
  expect(findings[0]!.dimension).toBe('stubs_left');
  expect(findings.every((f) => f.rule === 'leftover-stub')).toBe(true);
});

test('ignores markers on lines that were not added', async () => {
  const dir = `/tmp/tmb-stub2-${Date.now()}`;
  await Bun.write(`${dir}/src/b.ts`, ['// TODO: pre-existing', 'const x = 1;'].join('\n'));

  const findings = await leftoverStub.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'src/b.ts', addedLines: [2] }],
  });
  expect(findings).toHaveLength(0);
});
