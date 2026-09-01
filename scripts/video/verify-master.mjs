import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDirectory, outputRoot, readNarration, run } from "./shared.mjs";

const apiKey = process.env.MIMO_API_KEY;
const baseUrl = (process.env.MIMO_BASE_URL ?? "https://token-plan-sgp.xiaomimimo.com/v1").replace(/\/$/, "");
if (!apiKey) throw new Error("MIMO_API_KEY is required for final mixed-audio ASR verification.");

const masterPath = path.join(outputRoot, "how-i-choose-submission-preview.mp4");
const qcDirectory = path.join(outputRoot, "qc");
const wavPath = path.join(qcDirectory, "master-asr-input.wav");
const reportPath = path.join(qcDirectory, "master-asr-report.json");
await ensureDirectory(qcDirectory);

await run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  "-i", masterPath,
  "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
  wavPath,
]);

const encodedAudio = (await readFile(wavPath)).toString("base64");
const response = await fetch(`${baseUrl}/chat/completions`, {
  method: "POST",
  headers: { "api-key": apiKey, "content-type": "application/json" },
  body: JSON.stringify({
    model: "mimo-v2.5-asr",
    messages: [{
      role: "user",
      content: [{
        type: "input_audio",
        input_audio: { data: `data:audio/wav;base64,${encodedAudio}`, format: "wav" },
      }],
    }],
    asr_options: { language: "en" },
    stream: false,
  }),
});
if (!response.ok) throw new Error(`MiMo ASR returned ${response.status}: ${(await response.text()).slice(0, 800)}`);
const result = await response.json();
const rawTranscript = result?.choices?.[0]?.message?.content;
const transcript = (typeof rawTranscript === "string" ? rawTranscript : "")
  .replace(/<?\/?(?:think|chinese|english)>/gi, " ")
  .replace(/^\s*\d+\.\s*/, "")
  .replace(/\s+/g, " ")
  .trim();

function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function wordErrorRate(expectedText, actualText) {
  const expected = words(expectedText);
  const actual = words(actualText);
  const previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 1; row <= expected.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= actual.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return expected.length === 0 ? 0 : previous[actual.length] / expected.length;
}

const narration = await readNarration();
const expected = narration.segments.map(({ text }) => text).join(" ");
const errorRate = wordErrorRate(expected, transcript);
const report = {
  model: "mimo-v2.5-asr",
  source: path.basename(masterPath),
  expected,
  transcript,
  wordErrorRate: Number(errorRate.toFixed(4)),
  passed: transcript.length > 0 && errorRate <= 0.05,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) throw new Error(`Final mixed-audio ASR check failed with WER ${report.wordErrorRate}.`);
process.stdout.write(`Final mixed-audio ASR check passed with WER ${report.wordErrorRate}.\n`);
