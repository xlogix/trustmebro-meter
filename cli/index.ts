#!/usr/bin/env bun
import type { CriterionResult } from '../core/model/types.ts';
import { runGate } from './gate.ts';

const USAGE = `trustmebro — measure whether agent-built features are actually finished

Usage:
  trustmebro gate <workdir> [--diff <file>] [--results <file>]   Score an existing working tree
  trustmebro run <task>                                          (deferred to the Pier-loop plan)

See plans/v1-completeness-bench/design.md for the design.`;

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function gate(argv: string[]): Promise<number> {
  const workdir = argv[0];
  if (!workdir) {
    console.error('gate: missing <workdir>');
    return 1;
  }
  const diffPath = flag(argv, '--diff');
  let diffText: string;
  if (diffPath) {
    diffText = await Bun.file(diffPath).text();
  } else {
    const proc = Bun.spawn(['git', '-C', workdir, 'diff', 'HEAD'], { stdout: 'pipe', stderr: 'pipe' });
    diffText = await new Response(proc.stdout).text();
    const code = await proc.exited;
    if (code !== 0) {
      const stderr = (await new Response(proc.stderr).text()).trim();
      console.error(
        `gate: could not compute a diff for "${workdir}" via \`git diff HEAD\` (git exit ${code}). ` +
          `Pass --diff <file>, or run inside a git repo with at least one commit.${stderr ? '\n' + stderr : ''}`,
      );
      return 1;
    }
  }

  const resultsPath = flag(argv, '--results');
  const results: CriterionResult[] = resultsPath ? JSON.parse(await Bun.file(resultsPath).text()) : [];

  const { score, markdown } = await runGate({ workdir, diffText, results });
  console.log(markdown);
  return score.binaryPass ? 0 : 2; // non-zero so CI can gate on it
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return command ? 0 : 1;
  }
  if (command === 'gate') return gate(rest);
  console.error(`trustmebro: "${command}" is not implemented yet. See plans/v1-completeness-bench/design.md.`);
  return 1;
}

process.exit(await main(process.argv.slice(2)));
