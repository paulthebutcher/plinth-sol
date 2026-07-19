"use client";

import { useEffect, useState } from "react";

type Competitor = { name: string; relationship: string; relevance: string; signals: string[]; sources: string[] };
type Posture = { name: string; mode: string; thesis: string; optimizes: string; givesUp: string; support: { claim: string; source: string }[]; assumptions: string[]; counterevidence: string[]; nextTest: string };
type Brief = { reframe: string; disagreement: string; postures: Posture[]; unresolved: string[] };

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
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");

  async function request(action: "discover" | "analyze", extra: object = {}) {
    const response = await fetch("/api/plinth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, decision, company, description, context, ...extra }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function discover() {
    setError(""); setStage("discovering");
    try { const data = await request("discover"); setFrame(data.frame); setCompetitors(data.competitors); setSelected(data.competitors.map((_: Competitor, i: number) => i).slice(0, 4)); setStage("select"); }
    catch (e) { setError(e instanceof Error ? e.message : "Discovery failed"); setStage("intake"); }
  }

  async function analyze() {
    setError(""); setStage("analyzing");
    try { const data = await request("analyze", { competitors: selected.map((i) => competitors[i]) }); setBrief(data); setStage("brief"); }
    catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); setStage("select"); }
  }

  const step = stage === "intake" || stage === "discovering" ? 1 : stage === "select" || stage === "analyzing" ? 2 : 3;
  const posture = brief?.postures[active];

  function useExample(text: string) {
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
      <div className="sample-row"><span>TRY A SAMPLE</span><div>{examples.map(example=><button key={example.label} onClick={()=>useExample(example.text)}>{example.label}<i>→</i></button>)}</div></div>
    </section><Marketing /></>}

    {stage === "discovering" && <Loading title="Mapping the competitive landscape" detail="Finding the companies and alternatives that can change how this decision looks." lines={["Frame the decision", "Search current public evidence", "Separate competitors, alternatives, and analogs", "Check source relevance"]}/>} 

    {stage === "select" && <section className="frame compact-page page-enter"><div className="selection-heading"><div><div className="section-index">02 / CHOOSE THE EVIDENCE SET</div><h1>Which perspectives<br/>belong in the brief?</h1><p>Select the competitors and alternatives that should shape the analysis.</p></div><details className="research-frame"><summary>What the research found</summary><p>{frame}</p></details></div><div className="selection-bar"><strong>{selected.length} selected</strong><span>Choose at least one. You can challenge this set later.</span><button className="primary" disabled={!selected.length} onClick={analyze}>Build the brief <span>→</span></button></div><div className="competitor-grid">{competitors.map((c,i)=>{const on=selected.includes(i);return <button className={on?"intel-card selected":"intel-card"} key={c.name} onClick={()=>setSelected(s=>on?s.filter(x=>x!==i):[...s,i])}><div className="intel-top"><span>{c.relationship}</span><i>{on?"✓":"+"}</i></div><h2>{c.name}</h2><p>{c.relevance}</p><ul>{c.signals.map(x=><li key={x}>{x}</li>)}</ul><div className="source-count">{c.sources.length} source{c.sources.length===1?"":"s"}</div></button>})}</div>{error&&<p className="error">{error}</p>}<div className="frame-footer"><button className="text-button" onClick={()=>setStage("intake")}>← Edit the decision</button><span>{selected.length} selected</span><button className="primary" disabled={!selected.length} onClick={analyze}>Build the brief <span>→</span></button></div></section>}

    {stage === "analyzing" && <Loading title="Building the decision brief" detail="Reading the evidence against multiple viable ways forward, without selecting a winner." lines={["Deepen the selected research", "Find patterns and contradictions", "Build genuinely distinct postures", "Test assumptions and counterevidence", "Frame the cheapest next tests"]}/>} 

    {stage === "brief"&&brief&&posture&&<section className="brief compact-page page-enter"><div className="brief-choice-head"><div><div className="section-index">03 / CHOOSE A POSTURE TO CHALLENGE</div><h1>Where should the<br/>team push first?</h1><p>{brief.disagreement}</p></div><div className="brief-tools"><button className="secondary" onClick={()=>navigator.clipboard.writeText(JSON.stringify(brief,null,2))}>Copy brief</button><details className="research-frame"><summary>The decision beneath the decision</summary><p>{brief.reframe}</p></details></div></div>
      <div className="posture-choices">{brief.postures.map((p,i)=><button className={active===i?"posture-choice active":"posture-choice"} key={p.name} onClick={()=>setActive(i)}><span>0{i+1} · {p.mode}</span><strong>{p.name}</strong><small>Optimizes for {p.optimizes}</small><em>{active===i?"Inspecting":"Inspect posture"} →</em></button>)}</div>
      <article className="posture-detail standalone"><span className="detail-label">POSTURE 0{active+1} · {posture.mode}</span><h2>{posture.name}</h2><p className="thesis">{posture.thesis}</p><div className="tradeoff-grid"><div><span>OPTIMIZES FOR</span><p>{posture.optimizes}</p></div><div><span>WILLINGLY GIVES UP</span><p>{posture.givesUp}</p></div></div><div className="evidence-columns"><div><h3>External evidence</h3>{posture.support.map((x,i)=><div className="evidence-item" key={i}><p>{x.claim}</p><a href={x.source} target="_blank" rel="noreferrer">Open source ↗</a></div>)}</div><div><h3>What must be true</h3><ul>{posture.assumptions.map(x=><li key={x}>{x}</li>)}</ul><h3>What pushes against it</h3><ul>{posture.counterevidence.map(x=><li key={x}>{x}</li>)}</ul></div></div><div className="next-test"><span>CHEAPEST NEXT TEST</span><p>{posture.nextTest}</p></div></article>
      <section className="unresolved"><div><span>WHAT'S UNRESOLVED</span><h2>Questions worth answering before commitment.</h2></div><ol>{brief.unresolved.map((x,i)=><li key={x}><span>0{i+1}</span>{x}</li>)}</ol></section><footer className="brief-footer"><button onClick={()=>setStage("select")}>← Challenge the evidence set</button><button onClick={()=>setStage("intake")}>Start a new decision</button></footer>
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
    <div className="plain-process" id="how"><article><span>First</span><h3>See what is happening outside the room.</h3><p>The first pass finds direct competitors, substitutes, potential partners, and companies solving a similar problem another way. Every result includes the reason it may matter.</p></article><article><span>Then</span><h3>Edit the research set.</h3><p>Keep the comparisons that illuminate the choice. Remove the famous but irrelevant company. Add something the search missed. Nothing enters the final analysis without your selection.</p></article><article><span>Finally</span><h3>Read the case for each move.</h3><p>Each posture states what it pursues, what it sacrifices, the evidence behind it, what would have to be true, and the smallest useful test.</p></article></div>
    <div className="brief-specimen" id="example"><div className="specimen-note"><div className="section-index">A SMALL EXAMPLE</div><h2>A software company is deciding how to enter a regulated market.</h2><p>The brief might include this posture alongside two materially different alternatives.</p></div><article><header><span>POSTURE 02</span><em>PARTNER FIRST</em></header><h3>Rent the regulated layer while demand is still uncertain.</h3><dl><div><dt>Why do it</dt><dd>Reach the market sooner and learn which customer segments will pay before building fixed regulatory capacity.</dd></div><div><dt>What it costs</dt><dd>Lower margins, dependence on a partner, and less control over the customer experience.</dd></div><div><dt>What must be true</dt><dd>The partnership must preserve enough product differentiation to learn something transferable.</dd></div><div><dt>Find out next</dt><dd>Ask three qualified prospects to evaluate a partner-backed offer and commit to a paid pilot.</dd></div></dl></article></div>
    <div className="use-notes"><div><h3>Good uses</h3><p>Market entry, build-or-buy choices, product investments, partnerships, acquisitions, pricing changes, and operating-model decisions.</p></div><div><h3>What to include</h3><p>Deadlines, budget, internal capabilities, customer evidence, existing beliefs, political constraints, and anything the public record will miss.</p></div><div><h3>What you will not get</h3><p>A ranked answer, an ROI prediction, or an authoritative recommendation. The people responsible for the outcome still make the call.</p></div></div>
    <div className="why-brief"><div className="section-index">WHY A BRIEF</div><p>The hard part is rarely a missing score. It is getting the actual disagreement onto the page without flattening it. A brief is small enough to read before a meeting and concrete enough to argue with during one.</p></div>
    <div className="audience"><div><div className="section-index">WHO IT IS FOR</div><h2>People preparing the room, not replacing it.</h2></div><div className="audience-list"><article><h3>Product and strategy leaders</h3><p>When several paths look plausible and the roadmap needs a defensible investment thesis.</p></article><article><h3>Founders and operators</h3><p>When time and capital are limited, but the available choices carry different kinds of risk.</p></article><article><h3>Analysts and advisors</h3><p>When the client needs a sourced starting point that can survive scrutiny and be revised in the room.</p></article><article><h3>Leadership teams</h3><p>When disagreement is present but buried inside different assumptions, vocabularies, or incentives.</p></article></div></div>
    <div className="principles" id="principles"><div className="principles-head"><div className="section-index">DESIGN PRINCIPLES</div><h2>The user keeps the wheel.</h2></div><ol><li><span>01</span><div><h3>Evidence before synthesis</h3><p>The research set remains visible and editable before it shapes the brief.</p></div></li><li><span>02</span><div><h3>Context is not proof</h3><p>What you supply is carried forward as context, not silently converted into external validation.</p></div></li><li><span>03</span><div><h3>Disagreement stays intact</h3><p>The system builds distinct positions instead of blending them into a vague consensus.</p></div></li><li><span>04</span><div><h3>Unknown means unknown</h3><p>Missing evidence becomes a research question or next test, not a confident sentence.</p></div></li></ol></div>
    <div className="faq" id="faq"><div><div className="section-index">PRACTICAL QUESTIONS</div><h2>Before you begin.</h2></div><div><details open><summary>How much context should I provide?</summary><p>A paragraph is usually enough. Name the alternatives, why the choice matters, timing, constraints, and any internal facts that would materially change the analysis.</p></details><details><summary>How long does the research take?</summary><p>Usually between thirty and ninety seconds for competitor discovery, followed by another research pass when you build the brief. Source availability and decision complexity affect timing.</p></details><details><summary>Does Plinth recommend an option?</summary><p>No. It presents several defensible postures, their evidence, sacrifices, assumptions, counterevidence, and next tests. It does not rank them.</p></details><details><summary>Can I change the competitors it finds?</summary><p>Yes. Competitor selection is an explicit step. The final analysis uses the set you choose, not every result returned by the first search.</p></details></div></div>
    <div className="closing-cta"><div><span>HAVE A DECISION IN MIND?</span><h2>Put it on the table.</h2></div><a href="#decision-input">Start a decision brief <b>↑</b></a></div>
    <div className="agency-strip"><strong>Plinth shows its work.</strong><p>Sources stay attached. Assumptions remain visible. Unanswered questions do not quietly become facts.</p></div>
    <footer className="site-footer"><span>PLINTH</span><p>Competitive research for consequential decisions.</p><a href="#decision-input">Back to the decision input ↑</a></footer>
  </section>
}
