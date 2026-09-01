# Submission video production

This folder contains the repeatable source for a polished, English-language product film. Generated media is written to `video-output/` and is intentionally ignored by Git.

## Integrity boundary

- Product footage is captured from the real deployed UI and uses only visible human controls.
- The renderer never fabricates ChatGPT chrome, Site-tool calls, or receipts.
- The owner-run real ChatGPT result may be described only as the dated verification already recorded in `JUDGE_CHECKLIST.md`.
- If real ChatGPT footage is added later, it must come from an eligible built-in-browser session and must not expose accounts, tokens, emails, notifications, or unrelated tabs.
- Rendering a local video does not authorize uploading, publication, Devpost submission, or release tagging.

## Commands

```powershell
pnpm video:capture
pnpm video:voice
pnpm video:render
pnpm video:verify
```

`video:voice` reads `MIMO_API_KEY` from the process environment and uses the dedicated Token Plan base URL by default. The key is never printed or written to disk. Override the public, non-secret base URL with `MIMO_BASE_URL` if needed.

The output is:

- `video-output/how-i-choose-submission-preview.mp4`
- `video-output/how-i-choose-submission-preview.srt`
- `video-output/qc/asr-report.json`
- `video-output/qc/master-asr-report.json`

The local file remains a preview until its visual and narration timing are reviewed and the recording-integrity checklist is satisfied.
