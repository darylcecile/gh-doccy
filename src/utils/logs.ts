
// ── ANSI escape codes ─────────────────────────────────────────
const CODES = {
  reset:     "\x1b[0m",
  bold:      "\x1b[1m",
  dim:       "\x1b[2m",
  underline: "\x1b[4m",
  red:       "\x1b[31m",
  yellow:    "\x1b[33m",
  cyan:      "\x1b[36m",
  magenta:   "\x1b[35m",
} as const;

/**
 * Wrap a string with an ANSI style, automatically resetting at the end.
 * Styles can be composed: `style.bold(style.red("text"))`.
 */
export const style = {
  bold:      (s: string) => `${CODES.bold}${s}${CODES.reset}`,
  dim:       (s: string) => `${CODES.dim}${s}${CODES.reset}`,
  underline: (s: string) => `${CODES.underline}${s}${CODES.reset}`,
  red:       (s: string) => `${CODES.red}${s}${CODES.reset}`,
  yellow:    (s: string) => `${CODES.yellow}${s}${CODES.reset}`,
  cyan:      (s: string) => `${CODES.cyan}${s}${CODES.reset}`,
  magenta:   (s: string) => `${CODES.magenta}${s}${CODES.reset}`,
} as const;

/**
 * Print an error message and exit.
 */
export function fatal(message: string): never {
  console.error(`${style.red("error:")} ${message}`);
  process.exit(1);
}

/**
 * Print a warning message.
 */
export function warn(message: string): void {
  console.error(`${style.yellow("warn:")} ${message}`);
}

/**
 * Print an info message.
 */
export function info(message: string): void {
  console.error(`${style.cyan("info:")} ${message}`);
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return Bun.sleep(ms);
}
