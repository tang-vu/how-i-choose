"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";

import { AgentRehearsalService } from "@/application/agent-rehearsal-service";
import { browserCommandDependencies } from "@/application/command-bus";
import { OwnerWorkflowService, type WorkspaceIds } from "@/application/owner-workflow-service";
import { RehearsalQueryService } from "@/application/rehearsal-query-service";
import { BrandMark } from "@/components/brand-mark";
import { WebMcpBridge, workspaceChangedEvent } from "@/components/webmcp-bridge";
import { findActiveRuleConflicts } from "@/domain/conflict-engine";
import { activeRulesForContext, isFieldDisclosed, type CommunicationProfile } from "@/domain/profile";
import { buildAgentProfileProjection } from "@/domain/provenance";
import { buildRehearsalReport } from "@/domain/report-engine";
import type { StructuredPartnerTurn } from "@/domain/rehearsal";
import type { SignalMeaning } from "@/domain/signals";
import { validMayaTurn } from "@/fixtures/maya";
import { scenarioTemplates } from "@/fixtures/scenarios";
import { getDatabase, type ActivityReceipt, type ProfileVersionRecord } from "@/persistence/db";
import { exportWorkspaceJson, importWorkspaceJson } from "@/persistence/import-export";
import { WorkspaceRepository } from "@/persistence/repository";
import { appStore } from "@/state/app-store";

const workspaceIds: WorkspaceIds = {
  profileId: "profile-maya",
  sessionId: "session-maya-demo",
  scenarioId: "scenario-community-workshop",
};

const starterPrompt = `Use How I Choose’s Site tools to rehearse the approved community-workshop scenario. Read and audit the current brief first. To demonstrate the guardrails, intentionally attempt one long two-question partner turn once, then repair it using the structured validation error. Continue only after I tell you I responded on the page. Never infer agreement, never answer for me, and never ratify, publish, share, or export anything. Stop immediately if the red signal appears.`;

const signalTone: Record<SignalMeaning, string> = {
  yes: "green",
  no: "slate",
  not_sure: "amber",
  need_information: "purple",
  need_more_time: "blue",
  rephrase: "orange",
  pause: "slate",
  stop: "red",
  custom: "indigo",
};

function commandInput(workspace: NonNullable<ReturnType<typeof appStore.getState>["workspace"]>) {
  return {
    expectedProfileRevision: workspace.profile.revision,
    expectedSessionVersion: workspace.session.sessionVersion,
    idempotencyKey: `ui-${crypto.randomUUID()}`,
  };
}

function humanAcknowledgmentTurn(eventId: string, meaning: SignalMeaning): StructuredPartnerTurn {
  const base = {
    channel: "text" as const,
    responseTimerSeconds: null,
    acknowledgesSignalEventId: eventId,
    rationale: "A human practice partner explicitly acknowledges the person's selected signal.",
  };
  if (meaning === "need_more_time" || meaning === "yes" || meaning === "no" || meaning === "custom") {
    return {
      ...base,
      segments: [{ kind: "statement", text: meaning === "need_more_time" ? "I will wait until you choose another visible signal." : "I heard your signal and will not add meaning to it." }],
      intentTags: ["acknowledge"],
      responseOptions: [],
    };
  }
  if (meaning === "need_information") {
    return {
      ...base,
      segments: [
        { kind: "statement", text: "The morning starts at nine. The afternoon starts at two." },
        { kind: "question", text: "Would morning or afternoon work better?" },
      ],
      intentTags: ["acknowledge", "provide_information"],
      responseOptions: [
        { id: "human-morning", label: "Morning", value: "morning", preselected: false },
        { id: "human-afternoon", label: "Afternoon", value: "afternoon", preselected: false },
      ],
      meaningKey: "choose-workshop-time",
    };
  }
  return {
    ...base,
    segments: [{ kind: "question", text: "Is morning or afternoon a better time?" }],
    intentTags: ["acknowledge", "rephrase"],
    responseOptions: [
      { id: "human-morning-rephrased", label: "Morning", value: "morning", preselected: false },
      { id: "human-afternoon-rephrased", label: "Afternoon", value: "afternoon", preselected: false },
    ],
    meaningKey: "choose-workshop-time",
  };
}

export function WorkspaceApp() {
  const workspace = useStore(appStore, (state) => state.workspace);
  const hydration = useStore(appStore, (state) => state.hydration);
  const hydrationError = useStore(appStore, (state) => state.errorCode);
  const repository = useMemo(() => new WorkspaceRepository(getDatabase()), []);
  const owner = useMemo(
    () => new OwnerWorkflowService(repository, workspaceIds, browserCommandDependencies),
    [repository],
  );
  const humanPartner = useMemo(
    () => new AgentRehearsalService(repository, workspaceIds, browserCommandDependencies, "owner_ui"),
    [repository],
  );
  const ownerQueries = useMemo(
    () => new RehearsalQueryService(repository, workspaceIds, browserCommandDependencies, "owner_ui"),
    [repository],
  );
  const [receipts, setReceipts] = useState<ActivityReceipt[]>([]);
  const [versions, setVersions] = useState<ProfileVersionRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Loading your local workspace.");
  const [onboarding, setOnboarding] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [plainLanguage, setPlainLanguage] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [textScale, setTextScale] = useState<1 | 1.15 | 1.3>(1);
  const [patchDrafts, setPatchDrafts] = useState<Record<string, string>>({});
  const [undoProfile, setUndoProfile] = useState<CommunicationProfile | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    await appStore.getState().refresh(repository, workspaceIds);
    const [nextReceipts, nextVersions] = await Promise.all([
      repository.listReceipts(),
      repository.listProfileVersions(workspaceIds.profileId),
    ]);
    setReceipts(nextReceipts);
    setVersions(nextVersions);
  }, [repository]);

  useEffect(() => {
    const initialize = async () => {
      await appStore.getState().hydrate(repository, workspaceIds);
      const blankRequested = new URLSearchParams(window.location.search).get("start") === "blank";
      if (blankRequested) {
        await owner.resetBlankProfile();
        localStorage.setItem("how-i-choose-onboarded", "yes");
        window.history.replaceState(null, "", `${window.location.pathname}#my-signals`);
      } else if (!appStore.getState().workspace) {
        await owner.resetSyntheticDemo();
      }
      await refresh();
      setOnboarding(!blankRequested && localStorage.getItem("how-i-choose-onboarded") !== "yes");
      setCurrentTime(Date.now());
      setNotice("Your local workspace is ready.");
    };
    void initialize();
  }, [owner, refresh, repository]);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      void refresh().then(() => setNotice("A Site tool finished. The local workspace is up to date."));
    };
    window.addEventListener(workspaceChangedEvent, handleWorkspaceChange);
    return () => window.removeEventListener(workspaceChangedEvent, handleWorkspaceChange);
  }, [refresh]);

  const run = useCallback(async (
    action: () => Promise<{ ok: boolean; code: string } | void>,
    successMessage: string,
  ) => {
    setBusy(true);
    try {
      const result = await action();
      await refresh();
      setNotice(
        result && !result.ok
          ? `${result.code}. Nothing was partially applied.`
          : successMessage,
      );
    } catch (error) {
      const correlation = `local-${crypto.randomUUID().slice(0, 8)}`;
      setNotice(`That action could not be completed (${correlation}). Your existing data is unchanged.`);
      console.error(correlation, error);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const finishOnboarding = useCallback(() => {
    localStorage.setItem("how-i-choose-onboarded", "yes");
    setOnboarding(false);
  }, []);

  if (hydration === "idle" || hydration === "loading" || !workspace) {
    return (
      <main className="workspace-loading" aria-busy="true">
        <BrandMark size={56} />
        <h1>{hydrationError ? "Your local workspace could not open." : "Opening your local workspace…"}</h1>
        <p>{hydrationError ?? "No network or account is needed."}</p>
      </main>
    );
  }

  const { profile, scenario, session } = workspace;
  const mode = session.agentAccessEnabled ? "agent" : "human";
  const activeRules = activeRulesForContext(profile, session.contextId);
  const conflicts = findActiveRuleConflicts(activeRules);
  const projection = buildAgentProfileProjection(profile, session, scenario);
  const report = buildRehearsalReport(session, new Date().toISOString());
  const latestVersion = versions.at(-1);
  const guideIsDraft = !latestVersion || latestVersion.revision !== profile.revision;
  const guideVerified = receipts.some(
    (receipt) => receipt.toolName === "verify_support_guide" && receipt.code === "OK" && receipt.profileRevision === profile.revision,
  );
  const guideReviewIsStale = currentTime !== null && (!profile.reviewedAt || currentTime - new Date(profile.reviewedAt).getTime() > 180 * 24 * 60 * 60 * 1_000);
  const pendingSignal = session.pendingSignalEventId
    ? session.events.find((event) => event.id === session.pendingSignalEventId)
    : undefined;
  const acceptedTurns = session.events.filter((event) => event.type === "partner_turn_accepted");
  const canOfferTurn = session.state === "active" && !pendingSignal;
  const pendingSuggestions = profile.rules.filter(
    (rule) => rule.provenance.source === "agent_suggestion" && !rule.provenance.reviewedAt,
  );
  const profileRules = profile.rules.filter(
    (rule) => !(rule.provenance.source === "agent_suggestion" && !rule.provenance.reviewedAt),
  );

  const resetSample = () => run(async () => {
    await owner.resetSyntheticDemo();
    setUndoProfile(null);
  }, "Synthetic Maya demo restored to its starting state.");
  const resetBlank = () => run(async () => {
    await owner.resetBlankProfile();
    setUndoProfile(null);
  }, "Blank self-authored profile created.");

  const selectSignal = (signalId: string) =>
    run(
      () => owner.selectSignal({ ...commandInput(workspace), signalId }),
      "Your signal was recorded exactly as selected.",
    );

  const reviewSuggestion = (ruleId: string, outcome: "accepted" | "rejected" | "rewritten", fallbackText: string) =>
    run(
      () => owner.reviewAgentSuggestion({
        ...commandInput(workspace),
        ruleId,
        outcome,
        ...(outcome === "rewritten" ? { rewrittenDisplayText: patchDrafts[ruleId] ?? fallbackText } : {}),
      }),
      outcome === "accepted"
        ? "You accepted this suggestion through visible review."
        : outcome === "rejected"
          ? "You rejected this suggestion; it will not affect the protocol."
          : "Your rewritten wording is now person-authored.",
    );

  const exportJson = async () => {
    const json = await exportWorkspaceJson(repository, new Date().toISOString());
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "how-i-choose-profile.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("A local JSON export was prepared by your visible action.");
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    await run(async () => {
      await importWorkspaceJson(repository, await file.text());
    }, "The validated local JSON file was imported.");
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(starterPrompt);
    setNotice("The ChatGPT starter prompt was copied.");
  };

  return (
    <div
      className="product-app"
      data-contrast={highContrast ? "high" : "standard"}
      data-quiet={quietMode}
      data-reduced-motion={reducedMotion}
      style={{ "--user-text-scale": textScale } as React.CSSProperties}
    >
      <a className="skip-link" href="#workspace-main">Skip to main content</a>
      <div className="live-region" aria-live="polite" aria-atomic="true">{notice}</div>

      <header className="product-header">
        <Link className="brand" href="/" aria-label="How I Choose home">
          <BrandMark />
          <span><strong>How I Choose</strong><small>My signals. My pace. How I choose.</small></span>
        </Link>
        <div className="header-tools">
          <span className="alpha-badge">Open alpha</span>
          <WebMcpBridge />
        </div>
      </header>

      <nav className="product-nav" aria-label="Primary">
        {[
          ["my-signals", "My Signals"],
          ["practice-room", "Practice Room"],
          ["what-helps", "What Helps"],
          ["rehearsal-audit", "Rehearsal Audit"],
          ["support-guide", "Support Guide"],
          ["history", "History"],
          ["privacy", "Privacy"],
        ].map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
      </nav>

      {(session.state === "active" || session.state === "paused") && (
        <div className="safety-bar" role="region" aria-label="Persistent rehearsal controls">
          <div>
            <strong>{session.state === "paused" ? "Rehearsal paused" : "Rehearsal active"}</strong>
            <span>{pendingSignal?.type === "signal_selected" ? ` Pending: ${pendingSignal.meaning.replaceAll("_", " ")}.` : " You control the pace."}</span>
          </div>
          <div>
            {session.state === "paused" ? (
              <button
                className="control-button resume"
                disabled={busy}
                onClick={() => run(() => owner.resume(commandInput(workspace)), "You resumed through the visible page.")}
                type="button"
              >Resume</button>
            ) : (
              <button
                className="control-button pause"
                disabled={busy}
                onClick={() => {
                  const signal = profile.signals.find(({ semanticMeaning }) => semanticMeaning === "pause");
                  if (signal) void selectSignal(signal.id);
                }}
                type="button"
              >Pause</button>
            )}
            <button
              className="control-button stop"
              disabled={busy}
              onClick={() => {
                const signal = profile.signals.find(({ semanticMeaning }) => semanticMeaning === "stop");
                if (signal) void selectSignal(signal.id);
              }}
              type="button"
            >Stop</button>
          </div>
        </div>
      )}

      {onboarding && (
        <section className="onboarding-panel" aria-labelledby="onboarding-title">
          <div>
            <p className="eyebrow">First time here</p>
            <h1 id="onboarding-title">Start with your signals—not a diagnosis.</h1>
            <p>This alpha is for adults authoring their own communication preferences. Communication difficulty is not inability to decide.</p>
          </div>
          <ol>
            <li><strong>Define what helps.</strong><span>Choose pacing, wording, channels, and signals.</span></li>
            <li><strong>Practice at your pace.</strong><span>No timers, auto-advance, or inferred agreement.</span></li>
            <li><strong>Review the partner.</strong><span>The audit never grades you.</span></li>
          </ol>
          <div className="onboarding-actions">
            <button className="button primary" onClick={() => { void resetSample(); finishOnboarding(); }} type="button">Use synthetic Maya sample</button>
            <button className="button secondary" onClick={() => { void resetBlank(); finishOnboarding(); }} type="button">Start a blank profile</button>
            <button className="text-button" onClick={finishOnboarding} type="button">Continue with current local data</button>
          </div>
        </section>
      )}

      <main id="workspace-main" className="workspace-main" tabIndex={-1}>
        <section className="workspace-intro" aria-labelledby="workspace-title">
          <div className="workspace-title-grid">
            <div>
              <p className="eyebrow">{profile.title.includes("Maya") ? "Synthetic sample profile" : "Self-authored profile"}</p>
              <h1 id="workspace-title">{profile.title}</h1>
            </div>
            <div className="workspace-promise">
              <span aria-hidden="true" className="promise-mark">↳</span>
              <p>{plainLanguage ? "You choose. The partner adapts." : "The protocol belongs to the person. The accountability belongs to the communication partner."}</p>
              <small>Communication difficulty is not inability to decide.</small>
            </div>
          </div>
          <dl className="revision-strip">
            <div><dt>Profile</dt><dd>revision {profile.revision}</dd></div>
            <div><dt>Ratified</dt><dd>{profile.ratifiedVersion ? `version ${profile.ratifiedVersion}` : "not yet"}</dd></div>
            <div><dt>Agent access</dt><dd>{projection.sharedFieldCount} of {projection.totalFieldCount} fields</dd></div>
            <div><dt>Session</dt><dd>{session.state.replaceAll("_", " ")} · v{session.sessionVersion}</dd></div>
          </dl>
          <div className="toolbar" aria-label="Workspace actions">
            <button className="button secondary" disabled={busy} onClick={() => void resetSample()} type="button">Reset judge demo</button>
            <button className="button secondary" disabled={busy} onClick={() => void resetBlank()} type="button">New blank profile</button>
            <button className="button secondary" disabled={busy || !undoProfile} onClick={() => {
              if (!undoProfile) return;
              void run(() => owner.restorePreviousDraft({ ...commandInput(workspace), previousProfile: undoProfile }), "Your last profile draft edit was undone.").then(() => setUndoProfile(null));
            }} type="button">Undo last draft edit</button>
            <button className="button secondary" onClick={() => void exportJson()} type="button">Export JSON</button>
            <label className="button secondary file-button">Import JSON<input accept="application/json,.json" onChange={(event) => void importJson(event.target.files?.[0])} type="file" /></label>
          </div>
          <ol className="rehearsal-flow" aria-label="Rehearsal protocol flow">
            <li data-state="complete"><span>01</span><div><strong>Define</strong><small>Person-authored protocol</small></div></li>
            <li data-state={scenario.status === "approved" ? "complete" : "current"}><span>02</span><div><strong>Approve</strong><small>Visible scenario review</small></div></li>
            <li data-state={session.state === "active" || session.state === "paused" ? "current" : session.state === "stopped" || session.state === "debrief" || session.state === "protocol_patch_staged" || session.state === "complete" ? "complete" : "upcoming"}><span>03</span><div><strong>Rehearse</strong><small>Every turn is checked</small></div></li>
            <li data-state={report.entries.length > 0 ? "current" : "upcoming"}><span>04</span><div><strong>Reflect</strong><small>Partner-only evidence</small></div></li>
          </ol>
        </section>

        <section className="product-section" id="my-signals" aria-labelledby="signals-title">
          <div className="section-heading">
            <div><p className="eyebrow">01 · Source of truth</p><h2 id="signals-title">My Signals</h2></div>
            <p>You select every semantic signal directly. Silence creates no event and never means yes.</p>
          </div>

          <div className="signal-principles" aria-label="Signal guarantees">
            <span>Person selected</span><span>Meaning is explicit</span><span>No timer</span><span>Never inferred</span>
          </div>

          <form
            className="profile-title-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setUndoProfile(structuredClone(profile));
              void run(() => owner.updateProfileTitle({ ...commandInput(workspace), title: String(data.get("title")) }), "Profile title saved as a new draft revision.");
            }}
          >
            <label htmlFor="profile-title">Profile title</label>
            <input defaultValue={profile.title} id="profile-title" key={`${profile.revision}-title`} maxLength={120} name="title" required />
            <button className="button secondary" disabled={busy} type="submit">Save title</button>
          </form>

          <div className="signal-board" aria-label="Semantic signal board">
            {profile.signals.map((signal) => {
              const allowed = session.state === "active" || (session.state === "paused" && signal.semanticMeaning === "stop");
              return (
                <button
                  className={`signal-button ${signalTone[signal.semanticMeaning]}`}
                  disabled={busy || !allowed}
                  key={signal.id}
                  onClick={() => void selectSignal(signal.id)}
                  title={allowed ? signal.expectedPartnerAction : "Start or resume a rehearsal to use this signal."}
                  type="button"
                >
                  <span className="signal-shape" aria-hidden="true" />
                  <strong>{signal.label}</strong>
                  <small>{signal.description}</small>
                </button>
              );
            })}
          </div>

          <details className="editor-panel">
            <summary>Add a custom signal</summary>
            <form
              className="stacked-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                setUndoProfile(structuredClone(profile));
                void run(() => owner.addCustomSignal({
                  ...commandInput(workspace),
                  label: String(data.get("label")),
                  description: String(data.get("description")),
                  expectedPartnerAction: String(data.get("action")),
                  agentVisible: data.get("visible") === "on",
                }), "Custom signal added as a draft change.");
                form.reset();
              }}
            >
              <label>Visible label<input maxLength={120} name="label" required /></label>
              <label>What it means<textarea maxLength={500} name="description" required /></label>
              <label>What the partner should do<textarea maxLength={500} name="action" required /></label>
              <label className="check-row"><input name="visible" type="checkbox" /> Agent may read this signal in the active rehearsal</label>
              <button className="button primary" disabled={busy} type="submit">Add signal</button>
            </form>
          </details>
        </section>

        <section className="product-section practice-section" id="practice-room" aria-labelledby="practice-title">
          <div className="section-heading">
            <div><p className="eyebrow">02 · Owner-controlled</p><h2 id="practice-title">Practice Room</h2></div>
            <div className="segmented" role="group" aria-label="Practice mode">
              <button
                aria-pressed={mode === "human"}
                disabled={busy || mode === "human"}
                onClick={() => void run(
                  () => owner.setAgentAccess({ ...commandInput(workspace), enabled: false }),
                  "Human-only mode is active. Site tools cannot read or change this rehearsal.",
                )}
                type="button"
              >Human-only</button>
              <button
                aria-pressed={mode === "agent"}
                disabled={busy || mode === "agent"}
                onClick={() => void run(
                  () => owner.setAgentAccess({ ...commandInput(workspace), enabled: true }),
                  "Agent rehearsal is active. Site tools may use only the fields you exposed.",
                )}
                type="button"
              >Agent rehearsal</button>
            </div>
          </div>

          <div className="scenario-card">
            <div><span className="status-label">{scenario.synthetic ? "Synthetic low-stakes scenario" : "Self-authored low-stakes scenario"}</span><h3>{scenario.title}</h3><p>{scenario.summary}</p></div>
            <div className="scenario-actions">
              <label>Scenario template
                <select
                  aria-label="Scenario template"
                  disabled={busy || (session.state !== "ready" && session.state !== "scenario_draft")}
                  onChange={(event) => void run(() => owner.chooseScenarioTemplate({ ...commandInput(workspace), templateId: event.target.value as "community-workshop" | "library-meetup" | "neighborhood-garden" }), "A low-stakes scenario template was loaded for visible review.")}
                  value={scenarioTemplates.find(({ title }) => title === scenario.title)?.id ?? ""}
                >
                  {!scenarioTemplates.some(({ title }) => title === scenario.title) && <option value="">Current custom scenario</option>}
                  {scenarioTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
                </select>
              </label>
              {session.state === "scenario_draft" && <button className="button primary" disabled={busy} onClick={() => void run(() => owner.submitScenarioForReview(commandInput(workspace)), "Scenario is awaiting your visible approval.")} type="button">Review this scenario</button>}
              {session.state === "awaiting_owner_review" && <button className="button primary" disabled={busy} onClick={() => void run(() => owner.approveScenario(commandInput(workspace)), "Scenario approved through the visible page.")} type="button">Approve scenario</button>}
              {mode === "human" && session.state === "ready" && <button className="button primary" disabled={busy} onClick={() => void run(() => owner.startHumanRehearsal(commandInput(workspace)), "Human-only rehearsal started.")} type="button">Start human rehearsal</button>}
            </div>
          </div>

          <ul className="practice-trust-strip" aria-label="Current rehearsal protections">
            <li><span aria-hidden="true">01</span><div><strong>{mode === "human" ? "Site tools blocked" : "Scoped access on"}</strong><small>Owner-controlled mode</small></div></li>
            <li><span aria-hidden="true">02</span><div><strong>Every turn checked</strong><small>Same deterministic engine</small></div></li>
            <li><span aria-hidden="true">03</span><div><strong>No inferred response</strong><small>Only visible signals count</small></div></li>
          </ul>

          {mode === "human" ? (
            <div className="practice-grid">
              <div>
                <h3>Partner turns</h3>
                {acceptedTurns.length === 0 ? <p className="empty-state">No partner turn yet. The page will never auto-advance.</p> : (
                  <ol className="turn-list">
                    {acceptedTurns.map((event) => <li key={event.id}>{event.turn.segments.map(({ text }) => text).join(" ")}<small>Accepted under profile revision {session.profileRevision}</small></li>)}
                  </ol>
                )}
              </div>
              <div className="secondary-panel">
                <h3>Human partner practice</h3>
                <p>Use the same deterministic validator as an agent turn.</p>
                <p><strong>Site tools are blocked.</strong> Switch to Agent rehearsal to grant scoped agent access.</p>
                <button
                  className="button primary"
                  disabled={busy || !canOfferTurn}
                  onClick={() => void run(() => humanPartner.offerPartnerTurn({ ...commandInput(workspace), turn: validMayaTurn }), "The validated human partner turn is visible in the room.")}
                  type="button"
                >Offer the sample one-question turn</button>
                {pendingSignal?.type === "signal_selected" && <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void run(() => humanPartner.offerPartnerTurn({ ...commandInput(workspace), turn: humanAcknowledgmentTurn(pendingSignal.id, pendingSignal.meaning) }), "The human practice partner acknowledged your selected signal.")}
                  type="button"
                >Acknowledge selected signal</button>}
                {!canOfferTurn && <p className="disabled-reason">{session.state !== "active" ? `Unavailable while session is ${session.state.replaceAll("_", " ")}.` : "A pending signal must be acknowledged first."}</p>}
              </div>
            </div>
          ) : (
            <div className="agent-mode-panel">
              <div className="turn-stage">
                <div className="turn-stage-header"><p className="eyebrow">Visible partner output</p><span>{acceptedTurns.length ? "Protocol checked" : "Awaiting a valid turn"}</span></div>
                <h3>Partner turn</h3>
                {acceptedTurns.length === 0 ? <p className="empty-state">No partner turn yet. The page will never auto-advance.</p> : (
                  <ol className="turn-list">{acceptedTurns.map((event) => <li key={event.id}>{event.turn.segments.map(({ text }) => text).join(" ")}<small>Accepted under profile revision {session.profileRevision}</small></li>)}</ol>
                )}
              </div>
              <aside className="agent-boundary" aria-label="Agent authority boundary">
                <p className="eyebrow">Live authority boundary</p>
                <h3>ChatGPT can collaborate—never take over.</h3>
                <p><strong>Scoped agent access is on.</strong> Only shared fields can be read.</p>
                <dl>
                  <div><dt>May</dt><dd>Read · audit · offer · stage</dd></div>
                  <div><dt>Never</dt><dd>Signal · resume · ratify · share</dd></div>
                </dl>
              </aside>
              <div className="prompt-panel">
                <div><p className="eyebrow">One-paste demo</p><h3>Give ChatGPT the rehearsal brief.</h3><p>The prompt deliberately demonstrates rejection, repair, and owner authority.</p></div>
                <textarea aria-label="ChatGPT starter prompt" readOnly rows={6} value={starterPrompt} />
                <button className="button primary" onClick={() => void copyPrompt()} type="button">Copy ChatGPT starter prompt</button>
              </div>
            </div>
          )}

          {session.state === "paused" && <div className="persistent-message pause-message" role="status"><strong>Paused.</strong> No new partner turn can appear. Only you can resume through the visible button above.</div>}
          {session.state === "stopped" && <div className="persistent-message stop-message" role="alert"><strong>Stopped.</strong> This rehearsal is terminal. Further partner turns are blocked. <button className="button secondary" disabled={busy} onClick={() => void run(() => owner.openDebrief(commandInput(workspace)), "You opened debrief for the stopped rehearsal.")} type="button">Open debrief</button></div>}
        </section>

        <section className="product-section" id="what-helps" aria-labelledby="helps-title">
          <div className="section-heading"><div><p className="eyebrow">03 · Controlled rules</p><h2 id="helps-title">What Helps</h2></div><p>Draft and retired rules do not affect rehearsal evaluation.</p></div>
          {profileRules.length === 0 ? <p className="empty-state">No communication rules yet. Start with channel, one-question, pacing, processing time, language, or signal handling.</p> : (
            <div className="rule-list">
              {profileRules.map((rule) => {
                const shared = rule.agentVisible && isFieldDisclosed(profile, "rule", rule.id);
                return (
                  <article className="rule-card" key={rule.id}>
                    <div className="rule-meta"><span>{rule.category.replaceAll("_", " ")}</span><span>{rule.strength} · {rule.effect}</span><span>{rule.status}</span></div>
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      const text = String(new FormData(event.currentTarget).get("displayText"));
                      setUndoProfile(structuredClone(profile));
                      void run(() => owner.updateRule({ ...commandInput(workspace), ruleId: rule.id, changes: { displayText: text } }), "Rule saved as a person-authored draft revision.");
                    }}>
                      <label htmlFor={`rule-${rule.id}`}>Rule wording</label>
                      {rule.category === "channel" && <label>Allowed communication channels
                        <select
                          aria-label="Allowed communication channels"
                          disabled={busy}
                          onChange={(event) => {
                            const textOnly = event.target.value === "text";
                            setUndoProfile(structuredClone(profile));
                            void run(() => owner.updateRule({
                              ...commandInput(workspace),
                              ruleId: rule.id,
                              changes: {
                                controlledValue: event.target.value,
                                displayText: textOnly ? "Use text-only communication." : "Use text first; speech may also be offered.",
                              },
                            }), textOnly ? "You changed this rehearsal to text-only communication." : "You allowed text and speech for this rehearsal.");
                          }}
                          value={rule.controlledValue}
                        >
                          <option value="text,speech">Text and speech</option>
                          <option value="text">Text only</option>
                        </select>
                      </label>}
                      <textarea defaultValue={rule.displayText} id={`rule-${rule.id}`} key={`${profile.revision}-${rule.id}`} maxLength={500} name="displayText" required />
                      <div className="rule-actions">
                        <label className="check-row"><input checked={shared} onChange={(event) => {
                          setUndoProfile(structuredClone(profile));
                          void run(() => owner.setDisclosure({ ...commandInput(workspace), fieldKind: "rule", fieldId: rule.id, agentVisible: event.target.checked }), "Agent field access updated for the next invocation.");
                        }} type="checkbox" /> Agent can access</label>
                        <button className="button secondary" disabled={busy} type="submit">Save rule</button>
                      </div>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="product-section" id="rehearsal-audit" aria-labelledby="audit-title">
          <div className="section-heading"><div><p className="eyebrow">04 · Deterministic checks</p><h2 id="audit-title">Rehearsal Audit</h2></div><p>This audit evaluates protocol coverage and the communication partner—never the person.</p></div>
          <div className="audit-summary">
            <article><span className={conflicts.length ? "audit-fail" : "audit-pass"}>{conflicts.length ? "Needs review" : "Ready"}</span><h3>Active rule conflicts</h3><p>{conflicts.length ? `${conflicts.length} equal-strength conflict(s) found.` : "No equal-strength conflicts."}</p></article>
            <article><span className={projection.sharedFieldCount ? "audit-pass" : "audit-fail"}>{projection.sharedFieldCount} shared</span><h3>Agent disclosure</h3><p>{projection.totalFieldCount - projection.sharedFieldCount} field(s) stay outside the active agent brief.</p></article>
            <article><span className={scenario.status === "approved" ? "audit-pass" : "audit-fail"}>{scenario.status.replaceAll("_", " ")}</span><h3>Owner review</h3><p>An agent may start only after visible approval.</p></article>
            <article><span className={report.needsHumanReview ? "audit-fail" : "audit-pass"}>{report.entries.length} evidence items</span><h3>Partner adherence</h3><p>{report.unresolvedSignalEventIds.length} signal(s) unresolved.</p></article>
          </div>
          {conflicts.length > 0 && <ul className="error-list">{conflicts.map((conflict) => <li key={conflict.id}>{conflict.reason.replaceAll("_", " ")}: {conflict.ruleIds.join(" and ")}</li>)}</ul>}
          <details className="accessible-report"><summary>Accessible adherence report</summary><ul>{report.entries.map((item) => <li key={item.id}><strong>{item.category.replaceAll("_", " ")}:</strong> {item.label}. Evidence: {item.evidenceEventIds.join(", ") || "none"}.</li>)}</ul></details>
        </section>

        <section className="product-section guide-section" id="support-guide" aria-labelledby="guide-title">
          <div className="section-heading"><div><p className="eyebrow">05 · Derived, then reviewed</p><h2 id="guide-title">Support Guide</h2></div><div className="guide-actions"><button className="button secondary" onClick={() => window.print()} type="button">Print guide</button>{guideIsDraft && <button className="button secondary" disabled={busy} onClick={() => void run(() => ownerQueries.verifySupportGuide(), "The current guide derivation was verified.")} type="button">Verify derivation</button>}{guideIsDraft && <button className="button primary" disabled={busy || pendingSuggestions.length > 0 || !guideVerified} onClick={() => void run(() => owner.ratify(commandInput(workspace)), "A new owner-controlled ratified version was created.")} type="button">Ratify visible draft</button>}</div></div>
          <article className="support-guide" aria-label="Support guide preview">
            {guideIsDraft && <div className="draft-watermark">Draft · visible owner review required</div>}
            <h3>{profile.title}</h3>
            <p className="guide-purpose">Communication difficulty is not inability to decide. Silence or delayed response is never agreement.</p>
            <h4>What helps</h4>
            {activeRules.length ? <ul>{activeRules.map((rule) => <li key={rule.id}>{rule.displayText}<small>Source: accepted rule {rule.id}</small></li>)}</ul> : <p>No active accepted rules yet.</p>}
            <h4>My signals</h4>
            <dl>{profile.signals.map((signal) => <div key={signal.id}><dt>{signal.label}</dt><dd>{signal.description} Partner action: {signal.expectedPartnerAction}</dd></div>)}</dl>
            <blockquote>Ask me directly whenever possible. This guide explains how to communicate with me. It is not consent, a capacity assessment, an advance directive, or medical authorization.</blockquote>
          </article>
          {guideReviewIsStale && <div className="persistent-message pause-message" role="status"><strong>Review date warning.</strong> This guide has no review date within the last 180 days. Review the current wording before relying on or ratifying it.</div>}
          <div className="derivation-check"><strong>Derivation preview</strong><span>{activeRules.length} guide statements map to {activeRules.length} accepted active source rules. {guideIsDraft ? "Draft watermark required." : `Verified against ratified version ${latestVersion?.ratifiedVersion}.`}</span></div>
          {guideIsDraft && <p className="fine-print derivation-status">{guideVerified ? `Verified for profile revision ${profile.revision}. Ratification is available after all staged items are reviewed.` : "Run Verify derivation for this profile revision before ratification."}</p>}

          <div className="patch-panel secondary-panel">
            <h3>Staged protocol changes</h3>
            {pendingSuggestions.length === 0 ? <p className="empty-state">No staged agent suggestions. If an agent proposes one after rehearsal, its exact before-and-after diff and provenance will appear here for per-item review.</p> : (
              <ul className="patch-list">{pendingSuggestions.map((rule) => {
                const target = rule.provenance.targetRuleId ? profile.rules.find(({ id }) => id === rule.provenance.targetRuleId) : undefined;
                return <li key={rule.id}>
                  <div className="patch-diff" aria-label={`Exact diff for ${rule.id}`}>
                    <div><strong>Before</strong><p>{target?.displayText ?? "No existing rule — this is an addition."}</p></div>
                    <div><strong>After (agent draft)</strong><p>{rule.displayText}</p></div>
                  </div>
                  <p className="fine-print">Patch {rule.provenance.sourcePatchId} · session {rule.provenance.sourceSessionId} · evidence {rule.provenance.sourceEventIds?.join(", ")}</p>
                  <label htmlFor={`rewrite-${rule.id}`}>Your wording if you choose Rewrite</label>
                  <textarea
                    id={`rewrite-${rule.id}`}
                    maxLength={500}
                    onChange={(event) => setPatchDrafts((current) => ({ ...current, [rule.id]: event.target.value }))}
                    value={patchDrafts[rule.id] ?? rule.displayText}
                  />
                  <div className="patch-actions">
                    <button className="button primary" disabled={busy} onClick={() => void reviewSuggestion(rule.id, "accepted", rule.displayText)} type="button">Accept</button>
                    <button className="button secondary" disabled={busy} onClick={() => void reviewSuggestion(rule.id, "rejected", rule.displayText)} type="button">Reject</button>
                    <button className="button secondary" disabled={busy} onClick={() => void reviewSuggestion(rule.id, "rewritten", rule.displayText)} type="button">Rewrite as mine</button>
                  </div>
                </li>;
              })}</ul>
            )}
            {pendingSuggestions.length > 0 && <p className="disabled-reason">Ratification stays unavailable until you accept, reject, or rewrite every item.</p>}
          </div>
        </section>

        <section className="product-section" id="history" aria-labelledby="history-title">
          <div className="section-heading"><div><p className="eyebrow">06 · Local evidence</p><h2 id="history-title">History</h2></div><p>Older ratified versions are immutable and stay in this browser.</p></div>
          {versions.length === 0 ? <p className="empty-state">No ratified version yet.</p> : (
            <div aria-label="Scrollable ratified profile version table" className="table-wrap" role="region" tabIndex={0}><table><caption>Ratified profile versions</caption><thead><tr><th>Version</th><th>Profile revision</th><th>Reviewed</th><th>SHA-256</th></tr></thead><tbody>{versions.map((version) => <tr key={version.id}><td>{version.ratifiedVersion}</td><td>{version.revision}</td><td>{new Date(version.ratifiedAt).toLocaleString()}</td><td><code>{version.hash.slice(0, 12)}…</code></td></tr>)}</tbody></table></div>
          )}
          <div className="activity-panel secondary-panel">
            <h3>Site tools and local activity</h3>
            {receipts.length === 0 ? <p>No activity receipts yet.</p> : <ol>{receipts.slice(0, 12).map((receipt) => <li key={receipt.id}><strong>{receipt.toolName}</strong><span>{receipt.code} · profile r{receipt.profileRevision} · session v{receipt.sessionVersion}</span><small>{new Date(receipt.completedAt).toLocaleTimeString()} · changed IDs: {receipt.changedIds.join(", ") || "none"}</small></li>)}</ol>}
            <p className="fine-print">Receipts contain tool names, timing, codes, revisions, and changed IDs—not profile or rehearsal prose.</p>
          </div>
        </section>

        <section className="product-section" id="privacy" aria-labelledby="privacy-title">
          <div className="section-heading"><div><p className="eyebrow">07 · Local-first, honestly described</p><h2 id="privacy-title">Privacy & accessibility</h2></div><p>No account, analytics, advertising, remote database, or hidden telemetry.</p></div>
          <div className="privacy-grid">
            <article><h3>What stays local</h3><p>Your profiles and rehearsals are stored in this browser’s local database. They are not encrypted.</p></article>
            <article><h3>When Site tools run</h3><p>Only fields marked “Agent can access” may be returned to the active browser agent. Those returned fields are processed by that agent. Private notes are never available through Site tools.</p></article>
            <article><h3>Product boundary</h3><p>This is communication practice, not a consent system, capacity assessment, advance directive, medical authorization, emergency plan, or legal instrument.</p></article>
            <article><h3>Alpha evidence</h3><p>No diagnosis is required. This open alpha has not been clinically validated. Challenge data and personas are synthetic. Healthcare deployment requires future compensated co-design and governance work.</p></article>
          </div>
          <fieldset className="accessibility-settings">
            <legend>Display and cognitive accessibility</legend>
            <label>Text size<select onChange={(event) => setTextScale(Number(event.target.value) as 1 | 1.15 | 1.3)} value={textScale}><option value="1">Standard</option><option value="1.15">Large</option><option value="1.3">Extra large</option></select></label>
            <label className="check-row"><input checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} type="checkbox" /> High contrast</label>
            <label className="check-row"><input checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} type="checkbox" /> Reduced motion</label>
            <label className="check-row"><input checked={quietMode} onChange={(event) => setQuietMode(event.target.checked)} type="checkbox" /> Quiet mode (hide secondary panels)</label>
            <label className="check-row"><input checked={plainLanguage} onChange={(event) => setPlainLanguage(event.target.checked)} type="checkbox" /> Plain language</label>
          </fieldset>
          <details><summary>Manual accessibility smoke-test checklist</summary><ul><li>Complete onboarding, editing, signals, rehearsal, import/export, and ratification by keyboard only.</li><li>Check Pause, Stop, errors, stale revisions, and new partner turns with a screen reader.</li><li>Verify 200% text size, 400% zoom/320px reflow, forced colors, reduced motion, and print.</li><li>Confirm every signal has text, no meaning relies on color, and focus stays visible.</li></ul></details>
        </section>
      </main>

      <footer className="product-footer">
        <span>How I Choose · Open alpha · No diagnosis required</span>
        <span>v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"} · build {process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local"}</span>
        <a href="https://github.com/tang-vu/how-i-choose">Public source</a>
      </footer>
    </div>
  );
}
