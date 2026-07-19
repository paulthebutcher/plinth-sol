"use client";

import { useMemo, useState } from "react";

type Posture = {
  id: string;
  eyebrow: string;
  title: string;
  thesis: string;
  optimizes: string;
  givesUp: string;
  evidence: string[];
  questions: string[];
  nextTest: string;
  tone: string;
};

const postures: Posture[] = [
  {
    id: "depth",
    eyebrow: "POSTURE 01 · COMMIT",
    title: "Own the harder business",
    thesis: "Build the PEO around a narrow multi-state segment where compliance is the product, not an operating cost.",
    optimizes: "Revenue depth and defensibility",
    givesUp: "Speed, capital flexibility, and broad API reach",
    evidence: ["PEO customer ARPU is 6.7× the current average", "Regulatory fragmentation increases the value of liability sharing", "Unified competitors are moving upmarket"],
    questions: ["What does licensing cost in the first five states?", "Which customer segment pays most for compliance certainty?"],
    nextTest: "Price and pre-sell a five-state PEO offer to 12 existing customers.",
    tone: "terracotta",
  },
  {
    id: "breadth",
    eyebrow: "POSTURE 02 · FOCUS",
    title: "Become the payroll layer",
    thesis: "Choose three vertical SaaS partners and make embedded payroll unusually easy for their customers and operators.",
    optimizes: "Distribution, learning speed, and capital efficiency",
    givesUp: "PEO economics and ownership of the customer relationship",
    evidence: ["Forty potential vertical partners are already identifiable", "Vertical platforms need domain-specific integrations", "The model avoids fifty-state insurance licensing"],
    questions: ["Will partners share distribution or merely request integrations?", "Do support costs preserve attractive unit economics?"],
    nextTest: "Secure one paid design partnership before building the shared API layer.",
    tone: "blue",
  },
  {
    id: "sequence",
    eyebrow: "POSTURE 03 · SEQUENCE",
    title: "Buy the right to wait",
    thesis: "Pilot one shared capability that produces evidence for both paths, then commit when the asymmetry becomes visible.",
    optimizes: "Option value and evidence quality",
    givesUp: "First-mover speed and a clean organizational story",
    evidence: ["Both paths require stronger compliance infrastructure", "The critical unknowns are commercial, not technical", "A staged test can expose willingness to pay"],
    questions: ["Which investment is genuinely reusable across both paths?", "What deadline prevents the pilot from becoming indecision?"],
    nextTest: "Set a 90-day decision gate with explicit PEO and API commercial thresholds.",
    tone: "green",
  },
];

const sources = [
  { name: "Customer evidence", detail: "12 interviews · 4 renewal calls", selected: true },
  { name: "Competitive moves", detail: "Rippling · Justworks · OnPay", selected: true },
  { name: "Operating context", detail: "Your constraints and economics", selected: true },
  { name: "Market commentary", detail: "Analyst reports and press", selected: false },
];

export function PlinthStudio() {
  const [stage, setStage] = useState<"intake" | "frame" | "brief">("intake");
  const [decision, setDecision] = useState("Should we expand into embedded payroll APIs for vertical SaaS platforms, or build our own PEO offering?");
  const [context, setContext] = useState("Rippling is winning mid-market. PEO customers produce materially higher ARPU, but licensing and support create significant operational exposure. We have 40 potential vertical SaaS partners.");
  const [selectedSources, setSelectedSources] = useState([0, 1, 2]);
  const [activePosture, setActivePosture] = useState("depth");
  const [view, setView] = useState<"cards" | "compare">("cards");
  const [notice, setNotice] = useState("");

  const active = useMemo(() => postures.find((p) => p.id === activePosture) ?? postures[0], [activePosture]);
  const progress = stage === "intake" ? 1 : stage === "frame" ? 2 : 3;

  function toggleSource(index: number) {
    setSelectedSources((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  function copyBrief() {
    const text = `PLINTH DECISION BRIEF\n\n${decision}\n\n${postures.map((p) => `${p.title}\n${p.thesis}\nOptimizes: ${p.optimizes}\nGives up: ${p.givesUp}\nNext test: ${p.nextTest}`).join("\n\n")}\n\nQuestions to resolve\n${postures.flatMap((p) => p.questions).map((q) => `• ${q}`).join("\n")}`;
    navigator.clipboard?.writeText(text);
    setNotice("Brief copied");
    window.setTimeout(() => setNotice(""), 1800);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => setStage("intake")} aria-label="Return to start">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PLINTH</span>
        </button>
        <nav className="progress" aria-label="Analysis progress">
          {["Frame", "Evidence", "Postures"].map((label, index) => (
            <button key={label} className={progress >= index + 1 ? "progress-step active" : "progress-step"} onClick={() => index + 1 <= progress && setStage(index === 0 ? "intake" : index === 1 ? "frame" : "brief")}>
              <span>{String(index + 1).padStart(2, "0")}</span>{label}
            </button>
          ))}
        </nav>
        <span className="status"><i /> Working draft</span>
      </header>

      {stage === "intake" && (
        <section className="intake page-enter">
          <div className="section-index">01 / FRAME THE DECISION</div>
          <h1>See the decision<br />before you make it.</h1>
          <p className="lede">Plinth turns the evidence around a consequential choice into distinct postures, explicit trade-offs, and the questions worth answering next.</p>
          <div className="intake-grid">
            <label className="field decision-field">
              <span>The decision on the table</span>
              <textarea value={decision} onChange={(e) => setDecision(e.target.value)} rows={4} />
            </label>
            <label className="field context-field">
              <span>What should we know?</span>
              <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={6} />
              <small>Include constraints, stakes, timing, and what your team already believes.</small>
            </label>
          </div>
          <div className="agency-note"><span>YOU DECIDE</span><p>Plinth will not rank the options or choose a winner. It will make the differences harder to miss.</p></div>
          <button className="primary" onClick={() => setStage("frame")}>Choose the evidence <span>→</span></button>
        </section>
      )}

      {stage === "frame" && (
        <section className="frame page-enter">
          <div className="section-index">02 / CHOOSE THE EVIDENCE</div>
          <div className="frame-heading">
            <div><h1>What should inform<br />this decision?</h1><p className="lede">You control the frame. Add, remove, or challenge any source before it shapes the brief.</p></div>
            <aside className="decision-aside"><span>DECISION</span><p>{decision}</p><button onClick={() => setStage("intake")}>Edit framing</button></aside>
          </div>
          <div className="source-list">
            {sources.map((source, index) => {
              const chosen = selectedSources.includes(index);
              return <button key={source.name} className={chosen ? "source-row chosen" : "source-row"} onClick={() => toggleSource(index)} aria-pressed={chosen}>
                <span className="source-check">{chosen ? "✓" : "+"}</span><strong>{source.name}</strong><span>{source.detail}</span><em>{chosen ? "Included" : "Available"}</em>
              </button>;
            })}
          </div>
          <div className="frame-footer"><p><strong>{selectedSources.length} evidence groups selected.</strong> Gaps will remain visible in the brief.</p><button className="primary" disabled={selectedSources.length === 0} onClick={() => setStage("brief")}>Build the brief <span>→</span></button></div>
        </section>
      )}

      {stage === "brief" && (
        <section className="brief page-enter">
          <div className="brief-head">
            <div><div className="section-index">03 / DECISION BRIEF</div><h1>Three defensible<br />ways forward.</h1></div>
            <div className="brief-actions"><div className="view-toggle"><button className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>Cards</button><button className={view === "compare" ? "active" : ""} onClick={() => setView("compare")}>Compare</button></div><button className="secondary" onClick={copyBrief}>Copy brief</button></div>
          </div>
          <div className="reframe"><span>THE DECISION BENEATH THE DECISION</span><p>This is a choice between owning a deeper, regulated customer relationship and becoming infrastructure for a broader market.</p><small>Reasonable leaders can disagree. These postures expose what each position asks you to believe.</small></div>

          {view === "cards" ? (
            <div className="posture-layout">
              <div className="posture-tabs" role="tablist" aria-label="Strategic postures">
                {postures.map((posture) => <button key={posture.id} role="tab" aria-selected={activePosture === posture.id} className={activePosture === posture.id ? `posture-tab active ${posture.tone}` : `posture-tab ${posture.tone}`} onClick={() => setActivePosture(posture.id)}><span>{posture.eyebrow}</span><strong>{posture.title}</strong><small>{posture.optimizes}</small></button>)}
              </div>
              <article className={`posture-detail ${active.tone}`}>
                <div className="detail-number">{postures.findIndex((p) => p.id === active.id) + 1}</div>
                <span className="detail-label">{active.eyebrow}</span><h2>{active.title}</h2><p className="thesis">{active.thesis}</p>
                <div className="tradeoff-grid"><div><span>OPTIMIZES FOR</span><p>{active.optimizes}</p></div><div><span>WILLINGLY GIVES UP</span><p>{active.givesUp}</p></div></div>
                <div className="detail-grid"><div><h3>What supports it</h3><ul>{active.evidence.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>What must be true</h3><ul>{active.questions.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
                <div className="next-test"><span>CHEAPEST NEXT TEST</span><p>{active.nextTest}</p></div>
              </article>
            </div>
          ) : (
            <div className="comparison">
              <div className="compare-row compare-head"><span>POSTURE</span>{postures.map((p) => <strong key={p.id}>{p.title}</strong>)}</div>
              <div className="compare-row"><span>OPTIMIZES</span>{postures.map((p) => <p key={p.id}>{p.optimizes}</p>)}</div>
              <div className="compare-row"><span>GIVES UP</span>{postures.map((p) => <p key={p.id}>{p.givesUp}</p>)}</div>
              <div className="compare-row"><span>NEXT TEST</span>{postures.map((p) => <p key={p.id}>{p.nextTest}</p>)}</div>
            </div>
          )}

          <section className="unresolved"><div><span>NOT A VERDICT</span><h2>What would change the conversation?</h2><p>The brief gets more useful when the team attacks it. Start here.</p></div><ol>{["Get real licensing cost and timing for five target states.", "Test whether one vertical partner will share distribution risk.", "Model contribution margin after support and compliance, not just ARPU.", "Name the decision date and the evidence threshold for commitment."].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol></section>
          <footer className="brief-footer"><p>Generated from {selectedSources.length} evidence groups · Context remains visibly separate from external evidence.</p><button onClick={() => setStage("frame")}>Challenge the evidence</button></footer>
          {notice && <div className="toast" role="status">{notice}</div>}
        </section>
      )}
    </main>
  );
}
