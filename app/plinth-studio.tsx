"use client";

import { useEffect, useState } from "react";

type Competitor = { name: string; relationship: string; relevance: string; signals: string[]; sources: string[] };
type DecisionContract = {
  version: string;
  decisionStatement: string;
  acceptanceCriteria: { id: string; criterion: string; verification: string }[];
  constraints: string[];
  nonGoals: string[];
  assumptions: { id: string; claim: string; falsifier: string }[];
  decisionAuthority: string;
  reviewTrigger: string;
};
type Posture = {
  name: string;
  mode: string;
  thesis: string;
  optimizes: string;
  givesUp: string;
  support: { id: string; claim: string; source: string; epistemicState: "Evidence-supported" | "Contested" | "Unknown" }[];
  assumptions: string[];
  counterevidence: string[];
  criteriaCoverage: { criterionId: string; fit: "Supports" | "Tensions" | "Unknown"; explanation: string }[];
  nextTest: string;
};
type Brief = { reframe: string; disagreement: string; postures: Posture[]; unresolved: string[] };
type LedgerEntry = { id: number; actor: "Distiller" | "Researcher" | "Analyst" | "Decision maker"; action: string; why: string; references: string[]; at: string };

const examples = [
  { label: "Payroll platform", text: "A payroll software company needs to choose within six months between expanding embedded distribution through vertical SaaS partners and building a broader PEO offering. PEO customers produce materially higher revenue, but licensing, insurance, compliance, and support create significant exposure. Roughly 40 vertical platforms could become partners, while unified workforce products are winning larger customers." },
  { label: "Creator marketplace", text: "An outdoor creator marketplace is deciding whether to invest next in creator acquisition, paid customer conversion, or better attribution infrastructure. The team is small, current data is incomplete, and the next investment needs to produce measurable commercial learning within one quarter." },
  { label: "Accessibility product", text: "A small accessibility software company has one paying municipal client and must decide whether to sell directly to more cities, partner with digital agencies, or focus on a self-serve WCAG auditing product. Sales capacity is limited and enterprise procurement cycles are long." },
  { label: "SaaS pricing", text: "A B2B workflow SaaS company serving mid-market operations teams must decide whether to replace seat-based pricing with usage-based pricing. Expansion revenue has stalled, heavy users create disproportionate infrastructure costs, and several competitors now offer hybrid pricing." },
  { label: "New market", text: "A profitable US field-service software company is considering entering the UK, acquiring a smaller regional competitor, or delaying expansion to deepen its US payments product. Leadership has $20M available, a 24-month return expectation, and limited international operating experience." },
  { label: "AI support", text: "A regional bank must decide whether to build an AI customer-support assistant internally, buy a banking-specific platform, or partner with its existing contact-center vendor. The decision is constrained by regulatory review, sensitive customer data, and a nine-month target." },
];

export function PlinthStudio() {
  const [stage, setStage] = useState<"intake" | "discovering" | "select" | "analyzing" | "brief">("intake");
  const [decision, setDecision] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [frame, setFrame] = useState("");
  const [contract, setContract] = useState<DecisionContract | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [active, setActive] = useState(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [workingPosture, setWorkingPosture] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function request(action: "contract" | "discover" | "analyze", extra: object = {}) {
    const response = await fetch("/api/plinth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, decision, company, description, context, ...extra }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function discover() {
    setError(""); setStage("discovering");
    try {
      const frozenContract = await request("contract") as DecisionContract;
      setContract(frozenContract);
      setLedger([{ id: 1, actor: "Distiller", action: `Froze decision contract ${frozenContract.version}`, why: "Research needs an explicit reference intent that downstream roles cannot rewrite.", references: frozenContract.acceptanceCriteria.map(item => item.id), at: new Date().toISOString() }]);
      const data = await request("discover", { contract: frozenContract });
      setFrame(data.frame);
      setCompetitors(data.competitors);
      setSelected(data.competitors.map((_: Competitor, i: number) => i).slice(0, 4));
      setLedger(entries => [...entries, { id: entries.length + 1, actor: "Researcher", action: "Proposed a research set", why: "These external perspectives can materially test the frozen criteria and assumptions.", references: data.competitors.flatMap((item: Competitor) => item.sources).slice(0, 8), at: new Date().toISOString() }]);
      setStage("select");
    }
    catch (e) { setError(e instanceof Error ? e.message : "Discovery failed"); setStage("intake"); }
  }

  async function analyze() {
    if (!contract) return;
    setError(""); setStage("analyzing");
    try {
      const chosen = selected.map((i) => competitors[i]);
      setLedger(entries => [...entries, { id: entries.length + 1, actor: "Decision maker", action: "Accepted the evidence set", why: "Only human-selected perspectives are allowed to shape the brief.", references: chosen.map(item => item.name), at: new Date().toISOString() }]);
      const data = await request("analyze", { contract, competitors: chosen });
      setBrief(data);
      setLedger(entries => [...entries, { id: entries.length + 1, actor: "Analyst", action: "Produced distinct postures", why: "Each posture was checked against the frozen acceptance criteria without selecting a winner.", references: data.postures.map((item: Posture) => item.name), at: new Date().toISOString() }]);
      setStage("brief");
    }
    catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); setStage("select"); }
  }

  const step = stage === "intake" || stage === "discovering" ? 1 : stage === "select" || stage === "analyzing" ? 2 : 3;
  const posture = brief?.postures[active];

  function prepareExecutionPacket() {
    if (!posture) return;
    setWorkingPosture(posture.name);
    setLedger(entries => [...entries, { id: entries.length + 1, actor: "Decision maker", action: `Authorized ${posture.name} as the working posture`, why: `The execution arm is limited to the cheapest next test: ${posture.nextTest}`, references: posture.criteriaCoverage.map(item => item.criterionId), at: new Date().toISOString() }]);
  }

  function copyBrief() {
    navigator.clipboard.writeText(JSON.stringify({ contract, brief, reasoningLedger: ledger }, null, 2));
  }

  function applyExample(text: string) {
    setDecision(text);
    setCompany("Not separately provided");
    setDescription("Infer from the decision context");
    setContext("");
  }

  return <main className="shell">
    <header className="topbar"><button className="brand" onClick={() => setStage("intake")}><span className="brand-mark">P</span><span>PLINTH</span></button>{stage==="intake"?<nav className="marketing-nav"><a href="#how">How it works</a><a href="#example">Example brief</a><a href="#principles">Principles</a><a href="#faq">Questions</a></nav>:<nav className="progress">{["Decision", "Intelligence", "Brief"].map((x,i)=><span className={step >= i+1 ? "progress-step active" : "progress-step"} key={x}><b>0{i+1}</b>{x}</span>)}</nav>}<span className="status"><i/>Live research</span></header>

    {stage === "intake" && <><section className="intake intake-app single-input page-enter">
      <div className="masthead-instruction"><div><div className="section-index">START A DECISION BRIEF</div><h1>Describe the decision.</h1></div><p>Include the alternatives, organization, stakes, timing, constraints, and anything important the public internet will not know.</p></div>
      <div className="decision-composer" id="decision-input"><textarea aria-label="Describe your decision" placeholder="We’re a regional bank deciding whether to build an AI support assistant, buy a banking-specific platform, or extend our current contact-center vendor. We have nine months, sensitive customer data, and a cautious compliance team." value={decision} onChange={e=>{setDecision(e.target.value);setCompany("Not separately provided");setDescription("Infer from the decision context")}} rows={6}/><div className="composer-footer no-key"><span>Live research is included</span><span>{decision.length ? `${decision.length} characters` : "Write naturally. No special format required."}</span><button className="primary" disabled={!decision} onClick={discover}>Research the landscape <b>→</b></button></div></div>
      {error&&<p className="error">{error}</p>}
      <div className="sample-row"><span>TRY A SAMPLE</span><div>{examples.map(example=><button key={example.label} onClick={()=>applyExample(example.text)}>{example.label}<i>→</i></button>)}</div></div>
    </section><Marketing /></>}

    {stage === "discovering" && <Loading title="Freezing intent, then researching" detail="The Distiller creates the reference contract before the Researcher is allowed to search." lines={["Distill numbered acceptance criteria", "Freeze constraints and assumptions", "Search current public evidence", "Separate competitors, alternatives, and analogs", "Check source relevance"]}/>}

    {stage === "select" && contract && <section className="frame compact-page page-enter">
      <div className="selection-heading"><div><div className="section-index">02 / CHOOSE THE EVIDENCE SET</div><h1>Which perspectives<br/>belong in the brief?</h1><p>Select the competitors and alternatives that should shape the analysis.</p></div><details className="research-frame"><summary>What the research found</summary><p>{frame}</p></details></div>
      <section className="decision-contract">
        <header><div><span>DECISION CONTRACT · {contract.version}</span><strong>Frozen before research</strong></div><p>{contract.decisionStatement}</p></header>
        <ol>{contract.acceptanceCriteria.map(item=><li key={item.id}><span>{item.id}</span><div><strong>{item.criterion}</strong><small>Verify: {item.verification}</small></div></li>)}</ol>
        <details><summary>{contract.assumptions.length} assumptions · {contract.constraints.length} constraints · inspect contract</summary><div className="contract-details"><div><h3>Assumptions and falsifiers</h3>{contract.assumptions.map(item=><p key={item.id}><b>{item.id}</b> {item.claim}<small>Falsified by: {item.falsifier}</small></p>)}</div><div><h3>Boundaries</h3><p><b>Authority</b> {contract.decisionAuthority}</p><p><b>Review trigger</b> {contract.reviewTrigger}</p><p><b>Non-goals</b> {contract.nonGoals.join("; ")}</p></div></div></details>
      </section>
      <div className="selection-bar"><strong>{selected.length} selected</strong><span>Choose at least one. You can challenge this set later.</span><button className="primary" disabled={!selected.length} onClick={analyze}>Build the brief <span>→</span></button></div>
      <div className="competitor-grid">{competitors.map((c,i)=>{const on=selected.includes(i);return <button className={on?"intel-card selected":"intel-card"} key={c.name} onClick={()=>setSelected(s=>on?s.filter(x=>x!==i):[...s,i])}><div className="intel-top"><span>{c.relationship}</span><i>{on?"✓":"+"}</i></div><h2>{c.name}</h2><p>{c.relevance}</p><ul>{c.signals.map(x=><li key={x}>{x}</li>)}</ul><div className="source-count">{c.sources.length} source{c.sources.length===1?"":"s"}</div></button>})}</div>
      {error&&<p className="error">{error}</p>}
      <div className="frame-footer"><button className="text-button" onClick={()=>setStage("intake")}>← Create a new contract</button><span>{selected.length} selected</span><button className="primary" disabled={!selected.length} onClick={analyze}>Build the brief <span>→</span></button></div>
    </section>}

    {stage === "analyzing" && <Loading title="Testing postures against the contract" detail="The Analyst can map evidence and contradictions, but cannot rewrite intent or select a winner." lines={["Deepen the selected research", "Find patterns and contradictions", "Build genuinely distinct postures", "Check every acceptance criterion", "Frame the cheapest falsification tests"]}/>}

    {stage === "brief"&&brief&&posture&&contract&&<section className="brief compact-page page-enter">
      <div className="brief-choice-head"><div><div className="section-index">03 / CHOOSE A POSTURE TO CHALLENGE</div><h1>Where should the<br/>team push first?</h1><p>{brief.disagreement}</p></div><div className="brief-tools"><button className="secondary" onClick={copyBrief}>Copy audited brief</button><details className="research-frame"><summary>The decision beneath the decision</summary><p>{brief.reframe}</p></details></div></div>
      <div className="posture-choices">{brief.postures.map((p,i)=><button className={active===i?"posture-choice active":"posture-choice"} key={p.name} onClick={()=>{setActive(i);setWorkingPosture(null)}}><span>0{i+1} · {p.mode}</span><strong>{p.name}</strong><small>Optimizes for {p.optimizes}</small><em>{active===i?"Inspecting":"Inspect posture"} →</em></button>)}</div>
      <article className="posture-detail standalone">
        <div className="epistemic-strip"><span><b>{posture.support.filter(item=>item.epistemicState==="Evidence-supported").length}</b> supported</span><span><b>{posture.assumptions.length}</b> assumed</span><span><b>{posture.support.filter(item=>item.epistemicState==="Contested").length + posture.counterevidence.length}</b> contested</span><span><b>{posture.criteriaCoverage.filter(item=>item.fit==="Unknown").length}</b> unknown</span></div>
        <span className="detail-label">POSTURE 0{active+1} · {posture.mode}</span><h2>{posture.name}</h2><p className="thesis">{posture.thesis}</p>
        <div className="tradeoff-grid"><div><span>OPTIMIZES FOR</span><p>{posture.optimizes}</p></div><div><span>WILLINGLY GIVES UP</span><p>{posture.givesUp}</p></div></div>
        <div className="evidence-columns"><div><h3>External evidence</h3>{posture.support.map(x=><div className="evidence-item" key={x.id}><div className="evidence-meta"><span>{x.id}</span><em>{x.epistemicState}</em></div><p>{x.claim}</p><a href={x.source} target="_blank" rel="noreferrer">Open source ↗</a></div>)}</div><div><h3>What must be true</h3><ul>{posture.assumptions.map(x=><li key={x}>{x}</li>)}</ul><h3>What pushes against it</h3><ul>{posture.counterevidence.map(x=><li key={x}>{x}</li>)}</ul></div></div>
        <section className="coherence-check"><div><span>CONTRACT COHERENCE</span><h3>How this posture meets the frozen intent.</h3></div><ol>{posture.criteriaCoverage.map(item=><li key={item.criterionId} data-fit={item.fit.toLowerCase()}><span>{item.criterionId}</span><strong>{item.fit}</strong><p>{item.explanation}</p></li>)}</ol></section>
        <div className="next-test"><span>CHEAPEST NEXT TEST</span><p>{posture.nextTest}</p></div>
        <div className="build-arm"><div><span>BUILD ARM</span><strong>Turn judgment into a bounded handoff.</strong><p>The execution packet carries the frozen criteria, this posture&apos;s assumptions, and one authorized test. It cannot rewrite the contract.</p></div><button className="primary" onClick={prepareExecutionPacket}>{workingPosture===posture.name?"Packet prepared":"Prepare execution packet"} <b>→</b></button></div>
        {workingPosture===posture.name&&<section className="execution-packet"><header><span>EXECUTION PACKET · WORKING POSTURE</span><h3>{posture.name}</h3></header><div><article><span>AUTHORIZED MOVE</span><p>{posture.nextTest}</p></article><article><span>VERIFICATION GATES</span><ol>{contract.acceptanceCriteria.map(item=><li key={item.id}><b>{item.id}</b>{item.verification}</li>)}</ol></article><article><span>RECONSIDER WHEN</span><ul>{contract.assumptions.map(item=><li key={item.id}>{item.falsifier}</li>)}</ul></article></div></section>}
      </article>
      <section className="unresolved"><div><span>WHAT&apos;S UNRESOLVED</span><h2>Questions worth answering before commitment.</h2></div><ol>{brief.unresolved.map((x,i)=><li key={x}><span>0{i+1}</span>{x}</li>)}</ol></section>
      <section className="reasoning-ledger"><header><div><span>AUDIT TRAIL</span><h2>Reasoning is part of the deliverable.</h2></div><p>Append-only for this run. Each stage records its authority and why the artifact changed.</p></header><ol>{ledger.map(entry=><li key={entry.id}><span>0{entry.id}</span><div><strong>{entry.action}</strong><small>{entry.actor} · {new Date(entry.at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small></div><p>{entry.why}</p></li>)}</ol></section>
      <footer className="brief-footer"><button onClick={()=>setStage("select")}>← Challenge the evidence set</button><button onClick={()=>setStage("intake")}>Start a new decision</button></footer>
    </section>}
  </main>;
}

function Loading({title,detail,lines}:{title:string;detail:string;lines:string[]}) {
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{const timer=window.setInterval(()=>setElapsed(x=>x+1),1000);return()=>window.clearInterval(timer)},[]);
  const active=Math.min(Math.floor(elapsed/9),lines.length-1);
  const progress=Math.min(94,8+active*(82/(lines.length-1))+(elapsed%9)*(82/(lines.length-1)/9));
  return <section className="loading-screen progressive"><div className="loading-copy"><div className="section-index">LIVE RESEARCH · {elapsed}s</div><h1>{title}</h1><p>{detail}</p><small>Usually 30–90 seconds. You can leave this tab open.</small></div><div className="progress-panel"><div className="progress-track"><i style={{width:`${progress}%`}}/></div><strong>{Math.round(progress)}%</strong><ol>{lines.map((x,i)=><li className={i<active?"done":i===active?"current":""} key={x}><span>{i<active?"✓":String(i+1).padStart(2,"0")}</span><p>{x}</p><em>{i<active?"Complete":i===active?"In progress":"Waiting"}</em></li>)}</ol><p className="loading-reassurance">Progress reflects stages completed. Final timing depends on the sources available.</p></div></section>
}

function Marketing() {
  return <section className="marketing">
    <div className="marketing-intro quieter"><div className="section-index">ABOUT PLINTH</div><h2>Research for a decision that is still open.</h2><p>Describe the choice in your own words. Plinth searches for relevant companies, products, market moves, and constraints. You decide which comparisons belong in the brief. It then builds several credible ways forward and shows the case for and against each one.</p></div>
    <div className="plain-process" id="how"><article><span>First</span><h3>Freeze what a good decision must accomplish.</h3><p>Plinth distills your intent into numbered acceptance criteria, constraints, assumptions, and falsifiers. That contract becomes the reference point downstream roles cannot quietly rewrite.</p></article><article><span>Then</span><h3>Edit the research set.</h3><p>The Researcher finds outside perspectives, but only the comparisons you choose can shape the brief. Context remains context; cited evidence remains evidence.</p></article><article><span>Finally</span><h3>Challenge each move against the contract.</h3><p>Each posture exposes tradeoffs, evidence, assumption load, criterion-level tensions, and one bounded next test. The reasoning trail ships with the brief.</p></article></div>
    <div className="brief-specimen" id="example"><div className="specimen-note"><div className="section-index">A SMALL EXAMPLE</div><h2>A software company is deciding how to enter a regulated market.</h2><p>The brief might include this posture alongside two materially different alternatives.</p></div><article><header><span>POSTURE 02</span><em>PARTNER FIRST</em></header><h3>Rent the regulated layer while demand is still uncertain.</h3><dl><div><dt>Why do it</dt><dd>Reach the market sooner and learn which customer segments will pay before building fixed regulatory capacity.</dd></div><div><dt>What it costs</dt><dd>Lower margins, dependence on a partner, and less control over the customer experience.</dd></div><div><dt>What must be true</dt><dd>The partnership must preserve enough product differentiation to learn something transferable.</dd></div><div><dt>Find out next</dt><dd>Ask three qualified prospects to evaluate a partner-backed offer and commit to a paid pilot.</dd></div></dl></article></div>
    <div className="use-notes"><div><h3>Good uses</h3><p>Market entry, build-or-buy choices, product investments, partnerships, acquisitions, pricing changes, and operating-model decisions.</p></div><div><h3>What to include</h3><p>Deadlines, budget, internal capabilities, customer evidence, existing beliefs, political constraints, and anything the public record will miss.</p></div><div><h3>What you will not get</h3><p>A ranked answer, an ROI prediction, or an authoritative recommendation. The people responsible for the outcome still make the call.</p></div></div>
    <div className="why-brief"><div className="section-index">WHY A BRIEF</div><p>The hard part is rarely a missing score. It is getting the actual disagreement onto the page without flattening it. A brief is small enough to read before a meeting and concrete enough to argue with during one.</p></div>
    <div className="audience"><div><div className="section-index">WHO IT IS FOR</div><h2>People preparing the room, not replacing it.</h2></div><div className="audience-list"><article><h3>Product and strategy leaders</h3><p>When several paths look plausible and the roadmap needs a defensible investment thesis.</p></article><article><h3>Founders and operators</h3><p>When time and capital are limited, but the available choices carry different kinds of risk.</p></article><article><h3>Analysts and advisors</h3><p>When the client needs a sourced starting point that can survive scrutiny and be revised in the room.</p></article><article><h3>Leadership teams</h3><p>When disagreement is present but buried inside different assumptions, vocabularies, or incentives.</p></article></div></div>
    <div className="principles" id="principles"><div className="principles-head"><div className="section-index">DESIGN PRINCIPLES</div><h2>The user keeps the wheel.</h2></div><ol><li><span>01</span><div><h3>Reference intent before research</h3><p>Numbered criteria are frozen before outside evidence can bend the question.</p></div></li><li><span>02</span><div><h3>Context is not proof</h3><p>What you supply is carried forward as context, not silently converted into external validation.</p></div></li><li><span>03</span><div><h3>Separation of powers</h3><p>Distiller, Researcher, Analyst, and Decision maker have distinct authority and cannot bless their own rewrites.</p></div></li><li><span>04</span><div><h3>Unknown means unknown</h3><p>Missing evidence becomes an assumption, falsifier, or next test—not a confidence score.</p></div></li><li><span>05</span><div><h3>Reasoning ships</h3><p>The audit trail is part of the artifact, not residue hidden in a system log.</p></div></li></ol></div>
    <div className="faq" id="faq"><div><div className="section-index">PRACTICAL QUESTIONS</div><h2>Before you begin.</h2></div><div><details open><summary>How much context should I provide?</summary><p>A paragraph is usually enough. Name the alternatives, why the choice matters, timing, constraints, and any internal facts that would materially change the analysis.</p></details><details><summary>How long does the research take?</summary><p>Usually between thirty and ninety seconds for competitor discovery, followed by another research pass when you build the brief. Source availability and decision complexity affect timing.</p></details><details><summary>Does Plinth recommend an option?</summary><p>No. It presents several defensible postures, their evidence, sacrifices, assumptions, counterevidence, and next tests. It does not rank them.</p></details><details><summary>Can I change the competitors it finds?</summary><p>Yes. Competitor selection is an explicit step. The final analysis uses the set you choose, not every result returned by the first search.</p></details></div></div>
    <div className="closing-cta"><div><span>HAVE A DECISION IN MIND?</span><h2>Put it on the table.</h2></div><a href="#decision-input">Start a decision brief <b>↑</b></a></div>
    <div className="agency-strip"><strong>Plinth shows its work.</strong><p>Sources stay attached. Assumptions remain visible. Unanswered questions do not quietly become facts.</p></div>
    <footer className="site-footer"><span>PLINTH</span><p>Competitive research for consequential decisions.</p><a href="#decision-input">Back to the decision input ↑</a></footer>
  </section>
}
