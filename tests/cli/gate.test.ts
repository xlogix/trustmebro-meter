import { expect, test } from 'bun:test';
import { runGate } from '../../cli/gate.ts';

test('gate exits 1 (tool error) when it cannot compute a diff, not a fake INCOMPLETE', async () => {
  const dir = `/tmp/tmb-nogit-${Date.now()}`;
  await Bun.write(`${dir}/trustmebro.toml`, '[meta]\nprovenance = "novel"\n');
  const cliPath = new URL('../../cli/index.ts', import.meta.url).pathname;
  const proc = Bun.spawn(['bun', 'run', cliPath, 'gate', dir], { stdout: 'pipe', stderr: 'pipe' });
  const code = await proc.exited;
  const stderr = await new Response(proc.stderr).text();
  expect(code).toBe(1); // NOT 2 (incomplete) and NOT 0
  expect(stderr).toMatch(/could not compute a diff/i);
});

test('gate produces a report flagging stub + skipped + unwired on the fixture', async () => {
  const dir = `/tmp/tmb-gate-${Date.now()}`;
  await Bun.write(
    `${dir}/trustmebro.toml`,
    await Bun.file(new URL('../fixtures/sample.trustmebro.toml', import.meta.url)).text(),
  );
  await Bun.write(
    `${dir}/src/ItemsList.tsx`,
    'export function ItemsList() {\n  // TODO: fetch from /api/items\n  return null;\n}\nexport const UNUSED = 1;\n',
  );
  await Bun.write(`${dir}/src/ItemsList.test.tsx`, "it.skip('renders', () => { expect(true).toBe(true); });\n");

  const diff = await Bun.file(new URL('../fixtures/diffs/add-items-list.diff', import.meta.url)).text();
  const { score, markdown } = await runGate({
    workdir: dir,
    diffText: diff,
    results: [{ id: 'list-renders-from-api', passed: false }],
  });

  expect(score.binaryPass).toBe(false); // critical criterion failed
  expect(markdown).toContain('INCOMPLETE');
  expect(score.gaps.some((g) => g.rule === 'leftover-stub')).toBe(true);
  expect(score.gaps.some((g) => g.rule === 'skipped-tests')).toBe(true);
  expect(score.gaps.some((g) => g.rule === 'unwired-export')).toBe(true);
});
