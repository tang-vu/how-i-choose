import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { SiteToolsStatus } from "@/components/site-tools-status";

const sections = [
  "My Signals",
  "Practice Room",
  "What Helps",
  "Rehearsal Audit",
  "Support Guide",
  "History",
  "Privacy",
] as const;

export function AppShell({ demo = false }: { demo?: boolean }) {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <Link aria-label="How I Choose home" className="brand" href="/">
          <BrandMark />
          <span>
            <strong>How I Choose</strong>
            <small>My signals. My pace. How I choose.</small>
          </span>
        </Link>
        <SiteToolsStatus />
      </header>

      <div className="workspace">
        <nav aria-label="Primary" className="primary-nav">
          <p className="eyebrow">Workspace</p>
          <ul>
            {sections.map((section, index) => (
              <li key={section}>
                <a aria-current={index === 0 ? "page" : undefined} href={`#${section.toLowerCase().replaceAll(" ", "-")}`}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {section}
                </a>
              </li>
            ))}
          </ul>
          <div className="privacy-note">
            <strong>Local by default</strong>
            <span>No account. No tracking. You choose what an active agent can read.</span>
          </div>
        </nav>

        <main id="main-content" tabIndex={-1}>
          {demo ? <DemoHome /> : <WelcomeHome />}
        </main>
      </div>

      <footer>
        <span>Open alpha · Synthetic demo data · Not clinically validated</span>
        <span>
          v{process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"} · build {process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local"}
        </span>
        <a href="https://github.com/tang-vu/how-i-choose">View public source</a>
      </footer>
    </div>
  );
}

function WelcomeHome() {
  return (
    <>
      <section className="hero" aria-labelledby="welcome-title">
        <div>
          <p className="eyebrow">Communication practice, on your terms</p>
          <h1 id="welcome-title">Make your signals easier to follow.</h1>
          <p className="lede">
            Define what helps when speech or processing becomes difficult. Practice with a person or an agent. The audit checks whether the communication partner adapted—not how you performed.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/demo/">Try Maya’s synthetic demo</Link>
            <a className="button secondary" href="#my-signals">Create a blank profile</a>
          </div>
        </div>
        <div className="signal-orbit" aria-label="Signal examples: more time, more information, pause, and stop">
          <span className="signal-chip blue">More time</span>
          <span className="signal-chip purple">Information</span>
          <span className="signal-chip amber">Rephrase</span>
          <span className="signal-chip red">Stop</span>
        </div>
      </section>

      <section className="principle-grid" id="my-signals" aria-labelledby="principle-title">
        <div>
          <p className="eyebrow">The product inversion</p>
          <h2 id="principle-title">The partner is accountable for adapting.</h2>
        </div>
        <blockquote>
          “Most conversation tools evaluate how well the person performed. How I Choose evaluates whether the communication partner adapted to the person.”
        </blockquote>
        <article>
          <span className="number">01</span>
          <h3>You define the protocol</h3>
          <p>Channels, pacing, wording, signals, and what should happen next remain under your control.</p>
        </article>
        <article>
          <span className="number">02</span>
          <h3>You choose what is shared</h3>
          <p>Only fields marked for agent access can appear in the current rehearsal brief.</p>
        </article>
        <article>
          <span className="number">03</span>
          <h3>Suggestions stay drafts</h3>
          <p>An agent can propose a change. You review, rewrite, accept, or reject every item visibly.</p>
        </article>
      </section>

      <section className="boundary" aria-labelledby="boundary-title">
        <p className="eyebrow">Clear boundary</p>
        <h2 id="boundary-title">A communication-practice tool—not a consent system.</h2>
        <p>Communication difficulty is not inability to decide. Silence or delayed response is never agreement. No diagnosis is required.</p>
      </section>
    </>
  );
}

function DemoHome() {
  return (
    <section className="demo-hero" aria-labelledby="demo-title">
      <div className="demo-label">Synthetic judge demo</div>
      <p className="eyebrow">Maya · Community workshop</p>
      <h1 id="demo-title">A calm rehearsal, ready to reset.</h1>
      <p className="lede">Maya prefers text-first, one question at a time, no more than 12 words, and no more than two substantive options.</p>
      <div className="demo-card-grid">
        <article>
          <span>Profile</span>
          <strong>Ratified v1</strong>
          <small>Agent can access 11 of 18 fields</small>
        </article>
        <article>
          <span>Scenario</span>
          <strong>Owner approved</strong>
          <small>Workshop time and reminder method</small>
        </article>
        <article>
          <span>Next step</span>
          <strong>Read and audit</strong>
          <small>Start only after visible approval</small>
        </article>
      </div>
      <div className="hero-actions">
        <button className="button primary" type="button">Enter Practice Room</button>
        <Link className="button secondary" href="/">Back to overview</Link>
      </div>
      <p className="demo-note">This route will become the deterministic one-click reset once persistence lands.</p>
    </section>
  );
}
