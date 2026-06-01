import type { GapFinding } from '../../../../core/model/types.ts';
import type { GapRule } from './types.ts';

const MARKERS = /\b(TODO|FIXME|HACK|XXX)\b|not implemented|NotImplementedError|unimplemented/i;

export const leftoverStub: GapRule = {
  name: 'leftover-stub',
  dimension: 'stubs_left',
  async run({ workspaceDir, changedFiles }) {
    const findings: GapFinding[] = [];
    for (const file of changedFiles) {
      const text = await Bun.file(`${workspaceDir}/${file.path}`)
        .text()
        .catch(() => '');
      if (!text) continue;
      const lines = text.split('\n');
      const added = new Set(file.addedLines);
      lines.forEach((content, idx) => {
        const lineNo = idx + 1;
        if (!added.has(lineNo)) return;
        if (MARKERS.test(content)) {
          findings.push({
            rule: 'leftover-stub',
            dimension: 'stubs_left',
            file: file.path,
            line: lineNo,
            severity: 'soft',
            evidence: content.trim(),
          });
        }
      });
    }
    return findings;
  },
};
