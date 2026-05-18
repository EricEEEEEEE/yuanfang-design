import { gitStatusShort } from "./helpers/standard-api-v2-client";
import { parseSampleCount, runDefaultSmoke, runGeneratedSmoke, runSampling } from "./helpers/standard-api-v2-runners";

async function main(): Promise<void> {
  const sampleCount = parseSampleCount(process.env.STANDARD_API_V2_SAMPLE_COUNT);
  if (sampleCount) await runSampling(sampleCount);
  else await runDefaultSmoke();
  if (process.env.STANDARD_API_V2_GENERATED_SMOKE === "1") await runGeneratedSmoke();
  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("STANDARD_API_V2_TEST_FAILED", message);
  process.exit(1);
});
