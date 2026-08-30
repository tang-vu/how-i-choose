# Demo script — 2 minutes 40 seconds

Submission title: **How I Choose: Communication practice that respects every signal.**

Target recording length: 2:40. Hard stop: 2:50, leaving at least ten seconds under the three-minute limit. Use only the synthetic Maya profile and the low-stakes community-workshop scenario. Record the deployed top-level `/demo/` page in an eligible ChatGPT built-in browser. Do not splice in fake tool calls, receipts, or support status.

## Before recording

1. Open `https://how-i-choose.vercel.app/demo/` in the eligible ChatGPT browser.
2. Select `Continue with current local data` if onboarding appears, then `Reset judge demo`.
3. Confirm the page says `Site tools available`, session `ready`, and profile revision 1.
4. Open ChatGPT beside the Practice Room and paste the exact prompt below.
5. Set browser zoom and capture dimensions so ChatGPT, the signal board, state strip, current turn, and activity panel remain legible.
6. Rehearse once. If real discovery fails, do not record a simulated success; document the blocker in `JUDGE_CHECKLIST.md`.

## Exact ChatGPT starter prompt

> Use How I Choose’s Site tools to rehearse the approved community-workshop scenario. Read and audit the current brief first. To demonstrate the guardrails, intentionally attempt one long two-question partner turn once, then repair it using the structured validation error. Continue only after I tell you I responded on the page. Never infer agreement, never answer for me, and never ratify, publish, share, or export anything. Stop immediately if the red signal appears.

## Timed narration and actions

| Time | Screen action | Narration |
| --- | --- | --- |
| 0:00–0:12 | Show the product title, synthetic label, privacy count, and `ready` state. | “How I Choose is a local-first communication rehearsal workspace. The person defines the protocol; the app evaluates whether the communication partner adapted.” |
| 0:12–0:25 | Briefly show Maya’s text-first, one-question, 12-word, literal-language, and two-option rules. | “Maya is synthetic. Her low-stakes protocol asks for text first, one short literal question, at most two options, and explicit handling of every signal.” |
| 0:25–0:40 | Paste the starter prompt. Let ChatGPT call `get_rehearsal_brief` and `audit_rehearsal_readiness`, then start the already-approved session. Keep the activity panel visible. | “Site tools receive only fields Maya exposed. The agent can audit and start this visibly approved scenario, but it cannot approve, answer, resume, or ratify for her.” |
| 0:40–0:55 | ChatGPT intentionally offers the long two-question turn. Show the structured `INVALID_PARTNER_TURN` response and exact violations. | “The deliberate bad turn never appears as an accepted question. Deterministic checks reject two questions and the word-limit breach, then return repair instructions.” |
| 0:55–1:07 | ChatGPT submits the repaired one-question turn. Show it in the Practice Room. | “The repair passes the same domain engine used by human-only practice, so the valid turn becomes visible.” |
| 1:07–1:25 | The person clicks `Amber — not sure`. Tell ChatGPT the response was made on the page. ChatGPT reads `not_sure` and offers the differently worded question. | “Only the person selects a semantic signal. ChatGPT reads exactly ‘not sure,’ acknowledges it, and rephrases without silently changing the choice.” |
| 1:25–1:42 | Change `Allowed communication channels` from text and speech to text only. Let ChatGPT’s stale write fail, then let it reread and offer a text-only turn. | “Maya changes her protocol mid-session. The stale write is rejected. After rereading revision two, the agent adapts instead of overwriting her change.” |
| 1:42–1:55 | The person clicks the visible red Stop signal. Let ChatGPT attempt no further substantive turn; show the stopped state and blocked mutation result/activity. | “The person selects Stop. Stop is terminal, and further partner turns are blocked. Silence and delay never create agreement.” |
| 1:55–2:12 | Open `Rehearsal Audit`; show rule violation, repaired violation, signal acknowledgment, stale recovery, and Stop honored. | “The report grades partner adherence only. It contains no person, comprehension, capacity, consistency, consent, emotion, or diagnosis score.” |
| 2:12–2:27 | Open debrief. Let ChatGPT stage one protocol improvement. Show the exact before/after diff and provenance; visibly accept or reject the item. | “The agent may stage a provenance-linked suggestion, but every item remains a draft until the person reviews it.” |
| 2:27–2:40 | Open `Support Guide`, run derivation verification, show the draft watermark and required boundary statement, then point to the visible owner-only ratification control without asking the agent to use it. | “The guide is checked against accepted source rules. Ratification is a visible owner workflow—never a Site tool. How I Choose is open alpha communication practice, not a consent system.” |

## Recording integrity

- Keep ChatGPT’s actual tool-call UI and the app’s matching receipts visible when possible.
- Wait for each invocation to complete; do not edit the DOM, seed fake receipts, or replace responses in post-production.
- The person, not ChatGPT, must click Amber, edit the channel rule, click Stop, and review the suggestion.
- If timing runs long, shorten narration—not the guardrail evidence.
- Do not show real names, profiles, browser accounts, tokens, emails, notifications, or unrelated tabs.
- Do not publish or submit the video without explicit owner authorization.
