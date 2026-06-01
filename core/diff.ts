import type { DiffFile } from './model/types.ts';

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  let newLine = 0;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//, '').trim();
      if (path === '/dev/null') continue;
      current = { path, addedLines: [] };
      files.push(current);
      continue;
    }
    const hunk = HUNK.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+') && !line.startsWith('+++')) {
      current.addedLines.push(newLine);
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // removal: does not advance the new-file counter
    } else if (line.startsWith(' ')) {
      newLine++;
    }
  }
  return files;
}
