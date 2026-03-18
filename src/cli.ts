import { Command } from "commander";
import { initDocs } from './action/init';
import { lintDocs } from "./action/lint";
import { reviewDocs } from './action/review';
import { loadConfig } from './utils/config';

const config = await loadConfig();
const defaultGlob = `${config.root}/**/*.md`;

export function cli() {
	const program = new Command();

	program
		.name('gh doccy')
		.description('A tool to manage markdown documentation in git repositories')
		.version(require('../package.json').version)
		.helpCommand(true);

	program.command('init')
		.description('Scaffold a new documentation structure in the current directory')
		.option('-f, --force', 'Force initialization even if a docs directory already exists')
		.action(opt => initDocs(opt));

	program.command('lint')
		.description('Check the documentation for issues and staleness')
		.option('-g, --glob <pattern>', 'Glob pattern to specify which markdown files to lint', defaultGlob)
		.option('-u, --unstaged', 'Only lint files that have unstaged changes', false)
		.option('-f, --force', 'Force linting skipping cache', false)
		.option('-l, --level <level>', 'Only show issues with "error" severity, hiding "warn" level issues') // default to error output in CI environments
		.option('-v, --verbose', 'Show progress spinner while linting', false)
		.action(opt => lintDocs(opt));

	program.command('review')
		.description('Review docs')
		.option('-g, --glob <pattern>', 'Glob pattern to specify which markdown files to review', defaultGlob)
		.option('-u, --unstaged', 'Only review files that have unstaged changes', false)
		.option('-y, --yes', 'Automatically approve all changes without prompting', false)
		.action(opt => reviewDocs(opt));

	return program;
}