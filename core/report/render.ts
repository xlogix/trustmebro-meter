import type { DimensionScore, Score } from '../model/types.ts';

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function dimensionLine(d: DimensionScore): string {
  const value = d.evaluated ? pct(d.score) : 'n/a (not evaluated in v1)';
  return `- **${d.dimension}**: ${value}`;
}

export function renderMarkdown(score: Score): string {
  const verdict = score.binaryPass ? '✅ COMPLETE' : '❌ INCOMPLETE';
  const lines: string[] = [
    `# trustmebro completeness report`,
    ``,
    `**Verdict:** ${verdict}  (regression: ${score.regressionGreen ? 'green' : 'red'})`,
    ``,
    `## Rubric`,
    ...score.dimensions.map(dimensionLine),
  ];
  if (score.gaps.length > 0) {
    lines.push(``, `## Gaps (${score.gaps.length})`);
    for (const g of score.gaps) {
      lines.push(`- \`${g.file}:${g.line}\` [${g.rule}/${g.severity}] — ${g.evidence}`);
    }
  }
  return lines.join('\n') + '\n';
}

export function renderJson(score: Score): string {
  return JSON.stringify(score, null, 2);
}
