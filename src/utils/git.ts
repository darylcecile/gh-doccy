import path from "node:path";
import { fatal } from "./logs";

/**
 * Returns the list of files with unstaged changes (modified or untracked)
 * relative to the repository root.
 */
export async function getUnstagedFiles(): Promise<string[]> {
	const root = await getRepoRoot();

	// Modified but not staged (tracked files)
	const modified = await gitExec(["diff", "--name-only"]);
	// Untracked files
	const untracked = await gitExec(["ls-files", "--others", "--exclude-standard"]);

	const files = [
		...modified.split("\n"),
		...untracked.split("\n"),
	].filter(Boolean);

	// Resolve to absolute paths
	return files.map(f => path.resolve(root, f));
}

/**
 * Filters a list of absolute file paths to only those with unstaged changes.
 */
export function filterToUnstaged(filePaths: string[], unstagedFiles: string[]): string[] {
	const unstagedSet = new Set(unstagedFiles);
	return filePaths.filter(fp => unstagedSet.has(fp));
}

/**
 * Returns the absolute path of the git repository root.
 */
async function getRepoRoot(): Promise<string> {
	const root = await gitExec(["rev-parse", "--show-toplevel"]);
	if (!root) fatal("Not inside a git repository.");
	return root.trim();
}

/**
 * Runs a git command and returns stdout as a trimmed string.
 */
async function gitExec(args: string[]): Promise<string> {
	const proc = Bun.spawn(["git", ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});

	const stdout = await new Response(proc.stdout).text();
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text();
		fatal(`git ${args[0]} failed: ${stderr.trim()}`);
	}

	return stdout.trim();
}
