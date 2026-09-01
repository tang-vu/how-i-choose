import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDirectory, outputRoot, readNarration } from "./shared.mjs";

const apiKey = process.env.MIMO_API_KEY;
const baseUrl = (process.env.MIMO_BASE_URL ?? "https://token-plan-sgp.xiaomimimo.com/v1").replace(/\/$/, "");

if (!apiKey) {
  throw new Error("MIMO_API_KEY is not set. Create a fresh key and expose it through the environment; never paste it into source files.");
}

const narration = await readNarration();
const voiceDirectory = path.join(outputRoot, "voice");
const qcDirectory = path.join(outputRoot, "qc");
const reportPath = path.join(qcDirectory, "asr-report.json");
await ensureDirectory(voiceDirectory);
await ensureDirectory(qcDirectory);

const requestedIds = new Set(process.argv.slice(2));
const segmentsToGenerate = requestedIds.size === 0
  ? narration.segments
  : narration.segments.filter(({ id }) => requestedIds.has(id));
if (requestedIds.size > 0 && segmentsToGenerate.length !== requestedIds.size) {
  const knownIds = new Set(narration.segments.map(({ id }) => id));
  const unknownIds = [...requestedIds].filter((id) => !knownIds.has(id));
  throw new Error(`Unknown narration segment: ${unknownIds.join(", ")}`);
}

async function callMiMo(body) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiMo API returned ${response.status}: ${errorText.slice(0, 800)}`);
  }
  return response.json();
}

function normalizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function cleanTranscript(text) {
  return text
    .replace(/<?\/?(?:think|chinese|english)>/gi, " ")
    .replace(/^\s*\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordErrorRate(expectedText, actualText) {
  const expected = normalizeWords(expectedText);
  const actual = normalizeWords(actualText);
  const rows = Array.from({ length: expected.length + 1 }, () => new Array(actual.length + 1).fill(0));
  for (let index = 0; index <= expected.length; index += 1) rows[index][0] = index;
  for (let index = 0; index <= actual.length; index += 1) rows[0][index] = index;
  for (let row = 1; row <= expected.length; row += 1) {
    for (let column = 1; column <= actual.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1),
      );
    }
  }
  return expected.length === 0 ? 0 : rows[expected.length][actual.length] / expected.length;
}

let previousSegments = [];
if (requestedIds.size > 0) {
  try {
    previousSegments = JSON.parse(await readFile(reportPath, "utf8")).segments ?? [];
  } catch {
    previousSegments = [];
  }
}
const reportById = new Map(previousSegments.map((segment) => [segment.id, segment]));
for (const [index, segment] of segmentsToGenerate.entries()) {
  const wavPath = path.join(voiceDirectory, `${segment.id}.wav`);
  process.stdout.write(`[${index + 1}/${segmentsToGenerate.length}] TTS ${segment.id}\n`);
  const synthesis = await callMiMo({
    model: "mimo-v2.5-tts",
    messages: [
      { role: "user", content: narration.style },
      { role: "assistant", content: segment.text },
    ],
    audio: { format: "wav", voice: narration.voice },
    stream: false,
  });
  const audioData = synthesis?.choices?.[0]?.message?.audio?.data;
  if (typeof audioData !== "string" || audioData.length === 0) {
    throw new Error(`MiMo TTS did not return audio data for ${segment.id}`);
  }
  await writeFile(wavPath, Buffer.from(audioData, "base64"));

  process.stdout.write(`[${index + 1}/${segmentsToGenerate.length}] ASR ${segment.id}\n`);
  const encodedAudio = (await readFile(wavPath)).toString("base64");
  const recognition = await callMiMo({
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
  });
  const transcriptValue = recognition?.choices?.[0]?.message?.content;
  const rawTranscript = typeof transcriptValue === "string"
    ? transcriptValue
    : Array.isArray(transcriptValue)
      ? transcriptValue.map((part) => typeof part === "string" ? part : part?.text ?? "").join(" ")
      : "";
  const transcript = cleanTranscript(rawTranscript);
  const errorRate = wordErrorRate(segment.text, transcript);
  reportById.set(segment.id, {
    id: segment.id,
    expected: segment.text,
    transcript,
    wordErrorRate: Number(errorRate.toFixed(4)),
    passed: transcript.length > 0 && errorRate <= 0.05,
  });
}

const report = narration.segments.map(({ id }) => reportById.get(id)).filter(Boolean);
await writeFile(reportPath, `${JSON.stringify({ model: "mimo-v2.5-asr", voice: narration.voice, segments: report }, null, 2)}\n`);
const generatedIds = new Set(segmentsToGenerate.map(({ id }) => id));
const failures = report.filter(({ id, passed }) => generatedIds.has(id) && !passed);
if (failures.length > 0) {
  throw new Error(`ASR quality check failed for: ${failures.map(({ id }) => id).join(", ")}. Review video-output/qc/asr-report.json.`);
}
process.stdout.write(`Voice generation and ASR verification passed for ${segmentsToGenerate.length} generated segment${segmentsToGenerate.length === 1 ? "" : "s"}.\n`);
