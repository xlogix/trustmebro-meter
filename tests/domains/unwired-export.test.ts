import { expect, test } from 'bun:test';
import { unwiredExport } from '../../domains/swe-feature/verifiers/gaps/unwired-export.ts';

test('non-source files (e.g. a .diff dropped in the workspace) do not count as references', async () => {
  const dir = `/tmp/tmb-unwired-nonsrc-${Date.now()}`;
  await Bun.write(
    `${dir}/src/ItemsList.tsx`,
    'export function ItemsList() { return null; }\nexport const UNUSED = 1;\n',
  );
  await Bun.write(
    `${dir}/src/App.tsx`,
    "import { ItemsList } from './ItemsList';\nexport const App = () => ItemsList();\n",
  );
  // a stray diff/markdown file that mentions both symbols must NOT count as a reference:
  await Bun.write(`${dir}/changes.diff`, '+export const UNUSED = 1;\n+ItemsList();\n');
  await Bun.write(`${dir}/NOTES.md`, 'UNUSED and ItemsList are mentioned here.\n');

  const findings = await unwiredExport.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'src/ItemsList.tsx', addedLines: [1, 2] }],
  });
  // UNUSED only referenced in non-source files -> still flagged; ItemsList referenced in App.tsx -> not flagged.
  expect(findings).toHaveLength(1);
  expect(findings[0]!.evidence).toContain('UNUSED');
});

test('flags an exported symbol referenced nowhere else', async () => {
  const dir = `/tmp/tmb-unwired-${Date.now()}`;
  await Bun.write(
    `${dir}/src/ItemsList.tsx`,
    'export function ItemsList() { return null; }\nexport const UNUSED = 1;\n',
  );
  await Bun.write(
    `${dir}/src/App.tsx`,
    "import { ItemsList } from './ItemsList';\nexport const App = () => ItemsList();\n",
  );

  const findings = await unwiredExport.run({
    workspaceDir: dir,
    changedFiles: [{ path: 'src/ItemsList.tsx', addedLines: [1, 2] }],
  });

  // ItemsList is imported by App; UNUSED is referenced nowhere -> only UNUSED flagged.
  expect(findings).toHaveLength(1);
  expect(findings[0]!.evidence).toContain('UNUSED');
  expect(findings[0]!.dimension).toBe('integration');
});

test('flags UNUSED when workspaceDir has a trailing slash', async () => {
  const dir = `/tmp/tmb-unwired-trailing-${Date.now()}`;
  await Bun.write(
    `${dir}/src/ItemsList.tsx`,
    'export function ItemsList() { return null; }\nexport const UNUSED = 1;\n',
  );
  await Bun.write(
    `${dir}/src/App.tsx`,
    "import { ItemsList } from './ItemsList';\nexport const App = () => ItemsList();\n",
  );

  const findings = await unwiredExport.run({
    workspaceDir: `${dir}/`, // trailing slash — must not break matching
    changedFiles: [{ path: 'src/ItemsList.tsx', addedLines: [1, 2] }],
  });

  // Same assertion as the base test: only UNUSED should be flagged.
  expect(findings).toHaveLength(1);
  expect(findings[0]!.evidence).toContain('UNUSED');
});
