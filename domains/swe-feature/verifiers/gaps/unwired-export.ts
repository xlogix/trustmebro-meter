import { Lang, parse } from '@ast-grep/napi';
import type { GapFinding } from '../../../../core/model/types.ts';
import type { GapRule } from './types.ts';

function langFor(path: string): Lang {
  return path.endsWith('.tsx') ? Lang.Tsx : Lang.TypeScript;
}

interface ExportedSymbol {
  name: string;
  line: number;
}

function exportedSymbols(code: string, lang: Lang): ExportedSymbol[] {
  const root = parse(lang, code).root();
  const out: ExportedSymbol[] = [];
  const patterns = ['export function $NAME($$$P) { $$$B }', 'export const $NAME = $RHS', 'export class $NAME { $$$B }'];
  for (const p of patterns) {
    for (const m of root.findAll(p)) {
      const name = m.getMatch('NAME')?.text();
      if (name) out.push({ name, line: m.range().start.line + 1 });
    }
  }
  return out;
}

// Count files (other than the defining file) that mention the symbol as a word.
async function referencedElsewhere(workspaceDir: string, definingPath: string, name: string): Promise<boolean> {
  const proc = Bun.spawn(['rg', '--count-matches', '--glob', '!node_modules', '--word-regexp', name, workspaceDir], {
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  for (const row of out.split('\n')) {
    if (!row.trim()) continue;
    const colonIdx = row.lastIndexOf(':');
    if (colonIdx === -1) continue;
    const filePath = row.slice(0, colonIdx);
    // Normalise both paths so we can compare reliably regardless of trailing slashes.
    const absDefining = `${workspaceDir}/${definingPath}`;
    if (filePath !== absDefining) return true;
  }
  return false;
}

export const unwiredExport: GapRule = {
  name: 'unwired-export',
  dimension: 'integration',
  async run({ workspaceDir, changedFiles }) {
    const findings: GapFinding[] = [];
    for (const file of changedFiles) {
      if (/\.test\.tsx?$|\.spec\.tsx?$/.test(file.path)) continue;
      if (!/\.tsx?$/.test(file.path)) continue;
      const code = await Bun.file(`${workspaceDir}/${file.path}`)
        .text()
        .catch(() => '');
      if (!code) continue;
      const added = new Set(file.addedLines);
      for (const sym of exportedSymbols(code, langFor(file.path))) {
        if (!added.has(sym.line)) continue;
        if (await referencedElsewhere(workspaceDir, file.path, sym.name)) continue;
        findings.push({
          rule: 'unwired-export',
          dimension: 'integration',
          file: file.path,
          line: sym.line,
          severity: 'soft',
          evidence: `export "${sym.name}" is referenced nowhere else in the workspace`,
        });
      }
    }
    return findings;
  },
};
