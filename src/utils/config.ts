import z from "zod";
import { fatal } from "./logs";
import { parse, type StringValue } from "ms";
import { weakCache } from "./mem";

const configSchema = z.object({
	skipTypes: z.array(z.string()).optional().default(["code", "inlineCode", "html"]),
	dictionaryLang: z.enum(["en_GB", "en_US"]).optional().default("en_US"),
	dateFormat: z.string().optional().default("DD-MMM-YYYY"),
	defaultStalenessThreshold: z.string().refine((val) => parse(val) !== Number.NaN, {
		message: "Invalid staleness threshold format. Use formats like '12hr', '30d', '4w', '6M', '1y'."
	}).optional().default("30d") as z.ZodType<StringValue>,
	strictness: z.object({
		spelling: z.enum(["off", "warn", "error"]).optional(),
		staleness: z.enum(["off", "warn", "error"]).optional(),
		missingData: z.enum(["off", "warn", "error"]).optional(),
		brokenLinks: z.enum(["off", "warn", "error"]).optional(),
	}).optional().default({
		spelling: "warn",
		staleness: "warn",
		missingData: "warn",
		brokenLinks: "warn",
	})
});

type Config = z.infer<typeof configSchema>;

export async function loadConfig(): Promise<Config> {
	return weakCache.passThrough("config", async () => {
		const configFiles = [
			`${process.cwd()}/.doccyrc`,
			`${process.cwd()}/.doccyrc.yaml`,
			`${process.cwd()}/.doccyrc.json`,
			`${process.cwd()}/config/.doccyrc`,
			`${process.cwd()}/config/.doccyrc.yaml`,
			`${process.cwd()}/config/.doccyrc.json`
		];

		for (const configPath of configFiles) {
			const configFile = Bun.file(configPath);
			if (await configFile.exists()) {
				const rawContent = await configFile.text();

				try {
					return configSchema.parse(configPath.endsWith(".json") ? JSON.parse(rawContent) : Bun.YAML.parse(rawContent));
				} catch (err) {
					fatal(`Failed to parse config file at ${configPath}: ${err}`);
				}
			}
		}

		return configSchema.parse({});
	});
}

export async function initConfig() {
	const defaultConfig = configSchema.parse({});
	const configContent = Bun.YAML.stringify(defaultConfig, null, 2);
	const configPath = `${process.cwd()}/.doccyrc.yaml`;

	try {
		await Bun.write(configPath, configContent);
		console.log(`Initialized default config at ${configPath}`);
	} catch (err) {
		fatal(`Failed to write default config file: ${err}`);
	}
}