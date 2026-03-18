import { cli } from "./cli";

if (import.meta.main) {
  // this file is directly executed with `bun run`
  await (await cli()).parseAsync();
} else {
  // this file is being imported by another file

  if (!process.versions.bun) {
	throw new Error("This module can only be used in a Bun environment.");
  }
}