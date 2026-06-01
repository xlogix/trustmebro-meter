import { expect, test } from 'bun:test';
import { unwiredExport } from '../../domains/swe-feature/verifiers/gaps/unwired-export.ts';

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
