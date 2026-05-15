import {
  gitStatusShort,
  parseSampleCount,
  runDefaultApiSmoke,
  runSampling,
  VALID_PAYLOAD,
} from "./helpers/standard-api-v1-smoke";

async function main(): Promise<void> {
  const sampleCount = parseSampleCount(process.env.STANDARD_API_V1_SAMPLE_COUNT);

  if (sampleCount) {
    await runSampling(VALID_PAYLOAD, sampleCount);
  } else {
    await runDefaultApiSmoke();
  }

  console.log("GIT_STATUS_SHORT", gitStatusShort());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("STANDARD_API_V1_TEST_FAILED", message);
  process.exit(1);
});
