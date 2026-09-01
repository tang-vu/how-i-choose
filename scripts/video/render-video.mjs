import { writeFile } from "node:fs/promises";
import path from "node:path";
import { captureJson, ensureDirectory, exists, outputRoot, readNarration, run, secondsToSrt } from "./shared.mjs";

const narration = await readNarration();
const frameDirectory = path.join(outputRoot, "frames");
const voiceDirectory = path.join(outputRoot, "voice");
const clipDirectory = path.join(outputRoot, "clips");
const subtitlePath = path.join(outputRoot, "how-i-choose-submission-preview.srt");
const silentMasterPath = path.join(outputRoot, "master-with-voice.mp4");
const finalPath = path.join(outputRoot, "how-i-choose-submission-preview.mp4");
await ensureDirectory(clipDirectory);

function splitCaption(text, maximumLength = 92) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const captions = [];
  for (const sentenceValue of sentences) {
    const sentence = sentenceValue.trim();
    if (sentence.length <= maximumLength) {
      captions.push(sentence);
      continue;
    }
    const words = sentence.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maximumLength && current) {
        captions.push(current);
        current = word;
      } else current = candidate;
    }
    if (current) captions.push(current);
  }
  return captions;
}

const timeline = [];
let cursor = 0;
for (const [index, segment] of narration.segments.entries()) {
  const framePath = path.join(frameDirectory, `${segment.id}.png`);
  const voicePath = path.join(voiceDirectory, `${segment.id}.wav`);
  if (!(await exists(framePath))) throw new Error(`Missing ${framePath}. Run pnpm video:capture first.`);
  if (!(await exists(voicePath))) throw new Error(`Missing ${voicePath}. Run pnpm video:voice first.`);
  const probe = await captureJson("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", voicePath]);
  const voiceDuration = Number(probe.format.duration);
  const lead = index === 0 ? 1.25 : 0.4;
  const tail = index === narration.segments.length - 1 ? 2.2 : 0.85;
  const duration = voiceDuration + lead + tail;
  timeline.push({ ...segment, framePath, voicePath, voiceDuration, lead, tail, duration, start: cursor });
  cursor += duration;
}

if (cursor > 170) {
  throw new Error(`Planned runtime is ${cursor.toFixed(2)} seconds, beyond the 2:50 hard stop. Regenerate faster narration or shorten the script.`);
}

const subtitleBlocks = [];
let subtitleIndex = 1;
for (const scene of timeline) {
  const captions = splitCaption(scene.text);
  const weights = captions.map((caption) => caption.split(/\s+/).length);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let captionCursor = scene.start + scene.lead;
  for (const [index, caption] of captions.entries()) {
    const duration = scene.voiceDuration * (weights[index] / totalWeight);
    subtitleBlocks.push(`${subtitleIndex}\n${secondsToSrt(captionCursor)} --> ${secondsToSrt(captionCursor + duration)}\n${caption}\n`);
    subtitleIndex += 1;
    captionCursor += duration;
  }
}
await writeFile(subtitlePath, `${subtitleBlocks.join("\n")}\n`);

for (const [index, scene] of timeline.entries()) {
  const clipPath = path.join(clipDirectory, `${scene.id}.mp4`);
  const frames = Math.ceil(scene.duration * 30);
  const panX = index % 2 === 0
    ? "iw/2-(iw/zoom/2)+(on/FRAME_COUNT)*22"
    : "iw/2-(iw/zoom/2)-(on/FRAME_COUNT)*22";
  const videoFilter = [
    "scale=3840:2160:flags=lanczos",
    `zoompan=z='min(1.0+on*0.00011,1.04)':x='${panX.replace("FRAME_COUNT", String(frames))}':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=30`,
    "format=yuv420p",
    "fade=t=in:st=0:d=0.35",
    `fade=t=out:st=${Math.max(0, scene.duration - 0.42).toFixed(3)}:d=0.42`,
  ].join(",");
  const audioFilter = [
    `adelay=${Math.round(scene.lead * 1000)}|${Math.round(scene.lead * 1000)}`,
    `apad=pad_dur=${scene.tail.toFixed(3)}`,
    `atrim=0:${scene.duration.toFixed(3)}`,
    "loudnorm=I=-17:LRA=7:TP=-2",
    "aresample=48000:async=1:first_pts=0",
  ].join(",");
  await run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel", "warning",
    "-loop", "1",
    "-framerate", "30",
    "-i", scene.framePath,
    "-i", scene.voicePath,
    "-filter_complex", `[0:v]${videoFilter}[v];[1:a]${audioFilter}[a]`,
    "-map", "[v]",
    "-map", "[a]",
    "-t", scene.duration.toFixed(3),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "17",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-ar", "48000",
    "-b:a", "192k",
    "-movflags", "+faststart",
    clipPath,
  ]);
}

const concatPath = path.join(clipDirectory, "concat.txt");
await writeFile(concatPath, `${timeline.map(({ id }) => `file '${path.join(clipDirectory, `${id}.mp4`).replaceAll("'", "'\\''")}'`).join("\n")}\n`);
await run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel", "warning",
  "-fflags", "+genpts",
  "-f", "concat",
  "-safe", "0",
  "-i", concatPath,
  "-c:v", "copy",
  "-c:a", "aac",
  "-ar", "48000",
  "-b:a", "192k",
  "-movflags", "+faststart",
  silentMasterPath,
]);

const totalDuration = timeline.reduce((sum, scene) => sum + scene.duration, 0);
const subtitleFilterPath = subtitlePath.replaceAll("\\", "/").replace(":", "\\:").replaceAll("'", "\\'");
const subtitleStyle = "FontName=Segoe UI,FontSize=19,PrimaryColour=&H00F8F5ED,OutlineColour=&HCC081124,BorderStyle=3,BackColour=&H9A081124,Outline=1,Shadow=0,MarginV=44,Alignment=2";
await run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel", "warning",
  "-i", silentMasterPath,
  "-f", "lavfi",
  "-t", totalDuration.toFixed(3),
  "-i", "sine=frequency=55:sample_rate=48000",
  "-f", "lavfi",
  "-t", totalDuration.toFixed(3),
  "-i", "sine=frequency=82.41:sample_rate=48000",
  "-f", "lavfi",
  "-t", totalDuration.toFixed(3),
  "-i", "anoisesrc=color=pink:sample_rate=48000",
  "-filter_complex",
  `[0:v]subtitles='${subtitleFilterPath}':force_style='${subtitleStyle}'[v];` +
  "[1:a]volume=0.010[low];[2:a]volume=0.0045[mid];[3:a]highpass=f=90,lowpass=f=1600,volume=0.0025[air];" +
  `[low][mid][air]amix=inputs=3:duration=longest,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalDuration - 3).toFixed(3)}:d=3[bed];` +
  "[0:a]aresample=48000:async=1:first_pts=0[voice];[voice][bed]amix=inputs=2:duration=first:weights='1 1',loudnorm=I=-16:LRA=7:TP=-1.5,aresample=48000:async=1:first_pts=0[a]",
  "-map", "[v]",
  "-map", "[a]",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "17",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-ar", "48000",
  "-b:a", "256k",
  "-movflags", "+faststart",
  finalPath,
]);

const finalProbe = await captureJson("ffprobe", [
  "-v", "error",
  "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate,sample_rate,channels",
  "-of", "json",
  finalPath,
]);
process.stdout.write(`${JSON.stringify({ output: finalPath, subtitles: subtitlePath, probe: finalProbe }, null, 2)}\n`);
