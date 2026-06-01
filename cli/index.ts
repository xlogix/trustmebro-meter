#!/usr/bin/env bun
/**
 * trustmebro CLI entry point.
 *
 * This is a scaffold stub. The real subcommands (`run`, `score`, `report`,
 * `gate`) are defined in plans/v1-completeness-bench/design.md and built
 * during the v1 implementation. Keeping a runnable entry here lets the
 * project typecheck and gives the eventual commands a home.
 */

const USAGE = `trustmebro — measure whether agent-built features are actually finished

Usage:
  trustmebro run <task>      Run a task through Pier and score completeness   (not yet implemented)
  trustmebro score <run>     Score an existing run's artifacts                (not yet implemented)
  trustmebro report          Aggregate runs into a completeness leaderboard   (not yet implemented)
  trustmebro gate <spec>     Gate an existing working tree against a spec     (not yet implemented)

See plans/v1-completeness-bench/design.md for the design.`;

function main(argv: string[]): number {
  const [command] = argv;
  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return command ? 0 : 1;
  }
  console.error(`trustmebro: "${command}" is not implemented yet. See plans/v1-completeness-bench/design.md.`);
  return 1;
}

process.exit(main(process.argv.slice(2)));
