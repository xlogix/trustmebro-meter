import { Lang, parse } from '@ast-grep/napi';
import type { GapFinding } from '../../../../core/model/types.ts';
import type { GapRule } from './types.ts';

const TEST_FNS = ['it', 'test', 'describe'];
const MODIFIERS = ['skip', 'only'];

function langFor(path: string): Lang {
  return path.endsWith('.tsx') ? Lang.Tsx : Lang.TypeScript;
}

export const skippedTests: GapRule = {
  name: 'skipped-tests',
  dimension: 'test_honesty',
  async run({ workspaceDir, changedFiles }) {
    const findings: GapFinding[] = [];
    for (const file of changedFiles) {
      if (!/\.test\.tsx?$|\.spec\.tsx?$/.test(file.path)) continue;
      const text = await Bun.file(`${workspaceDir}/${file.path}`)
        .text()
        .catch(() => '');
      if (!text) continue;
      const added = new Set(file.addedLines);
      const root = parse(langFor(file.path), text).root();

      // .skip / .only
      for (const fn of TEST_FNS) {
        for (const mod of MODIFIERS) {
          for (const m of root.findAll(`${fn}.${mod}($$$ARGS)`)) {
            const line = m.range().start.line + 1;
            if (!added.has(line)) continue;
            findings.push({
              rule: 'skipped-tests',
              dimension: 'test_honesty',
              file: file.path,
              line,
              severity: 'soft',
              evidence: `${fn}.${mod}(...) — test disabled`,
            });
          }
        }
      }

      // assertion-free test bodies: it('...', <callback>) with no expect/assert
      for (const fn of ['it', 'test']) {
        for (const m of root.findAll(`${fn}($DESC, $FN)`)) {
          const line = m.range().start.line + 1;
          if (!added.has(line)) continue;
          const body = m.getMatch('FN')?.text() ?? '';
          if (!/\bexpect\s*\(|\bassert\b/.test(body)) {
            findings.push({
              rule: 'skipped-tests',
              dimension: 'test_honesty',
              file: file.path,
              line,
              severity: 'soft',
              evidence: `${fn}(...) has no assertion`,
            });
          }
        }
      }
    }
    return findings;
  },
};
