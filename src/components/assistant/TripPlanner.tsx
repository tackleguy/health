"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_REQUEST, followUpQuestions, inferHistory, optionalNumber, packReport, packingZone, parseTripRequest, preparationChecks, rankRoutes, REFERENCES, ZONE_GUIDANCE, type PackingZone } from "@/lib/assistant/planning";
import type { PlannerContext, PlannerGear, PlannerProfile, RouteCandidate, SavedPlan, TripFeedback, TripRequest, WebSource } from "@/lib/assistant/types";
import { planInsights } from "@/lib/assistant/insights";
import { emptyMemory } from "@/lib/assistant/memory";
import { GearEditor } from "./GearEditor";
import { usePlannerMemory } from "./usePlannerMemory";
import { useLocalModel } from "./useLocalModel";
import { CatalogSuggestions } from "./CatalogSuggestions";
import "./planner.css";

function NumberField({ label, value, onChange, min = 0, max = 10000, step = "any", hint }: { label: string; value: number | null; onChange: (n: number | null) => void; min?: number; max?: number; step?: string; hint?: string }) {
  return <label>{label}<input type="number" min={min} max={max} step={step} value={value ?? ""} onChange={e => onChange(optionalNumber(e.target.value, min, max))} placeholder="Not set" />{hint && <small>{hint}</small>}</label>;
}
function FeedbackForm({ plan, onSave }: { plan: SavedPlan; onSave: (feedback: TripFeedback) => void }) {
  const [feedback, setFeedback] = useState<TripFeedback>(plan.feedback ?? { effort: "right", packComfort: "comfortable", carriedLb: null, notes: "" });
  return <form className="planner-feedback" onSubmit={e => { e.preventDefault(); onSave(feedback); }}>
    <p>After you complete the trip, tell the planner what actually worked.</p>
    <div className="planner-fields">
      <label>Daily distance felt<select value={feedback.effort} onChange={e => setFeedback({ ...feedback, effort: e.target.value as TripFeedback["effort"] })}><option value="easy">Easy</option><option value="right">About right</option><option value="hard">Too hard</option></select></label>
      <label>Pack felt<select value={feedback.packComfort} onChange={e => setFeedback({ ...feedback, packComfort: e.target.value as TripFeedback["packComfort"] })}><option value="comfortable">Comfortable</option><option value="too-heavy">Too heavy</option></select></label>
      <NumberField label="Actual starting pack (lb)" value={feedback.carriedLb} min={1} max={150} onChange={carriedLb => setFeedback({ ...feedback, carriedLb })} />
      <label>What would you change?<input value={feedback.notes} onChange={e => setFeedback({ ...feedback, notes: e.target.value })} maxLength={500} /></label>
    </div><button className="planner-button secondary">{plan.feedback ? "Update completed-trip feedback" : "Mark completed & remember feedback"}</button>
  </form>;
}
export function TripPlanner({ context, initialRegion = "" }: { context: PlannerContext; initialRegion?: string }) {
  const { memory, update, error: memoryError } = usePlannerMemory(context.userId);
  const model = useLocalModel();
  const router = useRouter();
  const stopModel = model.stop;
  const [accountChanged, setAccountChanged] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if ((session?.user.id ?? null) !== context.userId) {
        setAccountChanged(true);
        stopModel();
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [context.userId, router, stopModel]);
  const [prompt, setPrompt] = useState(initialRegion ? `A trip in ${initialRegion}` : "");
  const [request, setRequest] = useState<TripRequest>({ ...EMPTY_REQUEST, region: initialRegion });
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (started) stageHeading.current?.focus();
  }, [started, step]);
  const [route, setRoute] = useState<RouteCandidate | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [packed, setPacked] = useState<string[]>([]);
  const [editing, setEditing] = useState<PlannerGear | null>(null);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [explainedSignature, setExplainedSignature] = useState("");
  const [aiError, setAiError] = useState("");
  const [notice, setNotice] = useState("");
  const [forgetPending, setForgetPending] = useState(false);
  const [sources, setSources] = useState<WebSource[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchSequence = useRef(0);
  const inventory = useMemo(() => [...new Map([...context.gear, ...memory.gear].map(g => [g.id, g])).values()], [context.gear, memory.gear]);
  const selected = inventory.filter(g => !excluded.includes(g.id));
  const history = inferHistory(memory.profile, memory.plans, context.activities);
  const report = packReport(selected, request, history.comfortablePackLb);
  const matches = rankRoutes(request, context.routes);
  const milesPerDay = request.days ? (route?.distanceMiles ?? request.distanceMiles ?? 0) / request.days : null;
  const followUps = followUpQuestions(request, { ...memory.profile, comfortablePackLb: history.comfortablePackLb, usualMilesPerDay: history.usualMilesPerDay }, selected);
  function setTrip(patch: Partial<TripRequest>) { setRequest(current => ({ ...current, ...patch })); setExplanation([]); setNotice(""); }
  function setProfile(patch: Partial<PlannerProfile>) { update(m => ({ ...m, profile: { ...m.profile, ...patch } })); setExplanation([]); }
  function saveGear(gear: PlannerGear) { const saved = update(m => ({ ...m, gear: [...m.gear.filter(g => g.id !== gear.id), gear] })); if (saved) { setEditing(null); setExplanation([]); } return saved; }
  async function findSources(trip: TripRequest) {
    const sequence = ++searchSequence.current; setSearching(true); setSearchError(""); setSources([]);
    try {
      const q = `${trip.region} ${trip.distanceMiles ?? ""} mile ${trip.days ?? ""} day`.trim().slice(0, 180);
      const response = await fetch(`/api/assistant/research?kind=trail&q=${encodeURIComponent(q)}`);
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (sequence === searchSequence.current) { setSources(data.sources); if (!data.sources.length) setSearchError("No online matches returned. Try a more specific region or use the web search link."); }
    } catch (error) { if (sequence === searchSequence.current) setSearchError(error instanceof Error ? error.message : "Search failed. Try again."); }
    finally { if (sequence === searchSequence.current) setSearching(false); }
  }
  function buildTrip() {
    const parsed = parseTripRequest(prompt); setRequest(parsed); setStarted(true); setStep(0); setRoute(null); setPacked([]); setExplanation([]); setNotice("");
    if (parsed.region) void findSources(parsed);
  }
  const insights = planInsights(request, route, selected, memory.profile, memory.plans, context.activities);
  const aiContext = { priorities: memory.profile.priorities, experience: memory.profile.experience, recentFeedback: memory.plans.filter(p => p.feedback).slice(0, 3).map(p => p.feedback) };
  const aiSignature = JSON.stringify({ insights, aiContext });
  async function explain() {
    setAiError("");
    try { const result = await model.explain(aiContext, insights); setExplanation(result); setExplainedSignature(aiSignature); }
    catch (error) { setAiError(error instanceof Error ? error.message : "Could not generate an explanation. The calculated plan is still available."); }
  }
  function savePlan() {
    const plan: SavedPlan = { id: crypto.randomUUID(), prompt, request, route, gear: selected, packedIds: packed.filter(id => selected.some(g => g.id === id)), savedAt: new Date().toISOString(), feedback: null };
    if (update(m => ({ ...m, plans: [plan, ...m.plans].slice(0, 30) }))) setNotice("Trip saved on this device. Add feedback after your outing to improve the next plan.");
  }
  function restore(plan: SavedPlan) {
    update(m => ({ ...m, gear: [...new Map([...m.gear, ...plan.gear].map(g => [g.id, g])).values()] }));
    setPrompt(plan.prompt); setRequest(plan.request); setRoute(plan.route); setPacked(plan.packedIds); setExcluded(inventory.filter(g => !plan.gear.some(p => p.id === g.id)).map(g => g.id)); setStarted(true); setStep(0); setExplanation([]); setNotice("Saved trip restored."); void findSources(plan.request);
  }
  if (accountChanged) return <div className="planner-shell" role="status">Updating your planning account… <button className="planner-link" onClick={() => window.location.reload()}>Reload planner</button></div>;
  return <div className="planner-shell">
    <div className="planner-topline"><Link href="/explore">TrailPack</Link><div><Link href="/gear">Gear locker</Link><Link href="/map">Map</Link></div></div>
    <div className="planner-heading"><h1>A good trip starts here.</h1><p>Find the trail. Bring what you need. Know where it goes.</p></div>
    <div className="planner-layout">
      <div className="planner-workspace">
        <form className="planner-prompt" onSubmit={e => { e.preventDefault(); buildTrip(); }}>
          <label htmlFor="trip-prompt">What do you have in mind?</label>
          <textarea id="trip-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="30 miles, 3 days in Colorado…" maxLength={1500} required rows={2} />
          <div className="planner-prompt-footer"><button type="button" className="planner-link" onClick={() => setPrompt("30 miles, 3 days in Colorado")}>Try a 3-day Colorado trip</button><button className="planner-button">Build my trip <span aria-hidden="true">→</span></button></div>
        </form>
        {!started && <div className="planner-intro"><h2>Your next trip, informed by your last.</h2><p>Start with a distance, number of days, and region. We’ll find route options, calculate the gear you’re carrying, and arrange it into a packing checklist.</p><p className="planner-help">Your account’s gear and hikes are used when you’re signed in. Add preferences and trip feedback here to make recommendations more personal.</p></div>}
        {started && <>
          <details className="planner-details" open={!request.region || !request.distanceMiles || !request.days}>
            <summary>Trip details <span>{request.distanceMiles ?? "—"} mi · {request.days ?? "—"} days · {request.region || "Choose a region"}</span></summary>
            <div className="planner-fields">
              <label>Region<input value={request.region} onChange={e => { setTrip({ region: e.target.value }); setRoute(null); }} maxLength={100} /></label>
              <NumberField label="Target distance (mi)" value={request.distanceMiles} min={0.1} onChange={distanceMiles => { setTrip({ distanceMiles }); setRoute(null); }} />
              <NumberField label="Days" value={request.days} min={1} max={365} step="1" onChange={days => setTrip({ days: days === null ? null : Math.round(days) })} />
              <label>Start date<input type="date" value={request.startDate} onChange={e => setTrip({ startDate: e.target.value })} /></label>
              <NumberField label="Expected overnight low (°F)" value={request.lowTempF} min={-80} max={130} onChange={lowTempF => setTrip({ lowTempF })} hint="Check a forecast for the route’s elevation." />
            </div><button className="planner-button secondary" type="button" disabled={searching || !request.region} onClick={() => void findSources(request)}>Refresh online route search</button>
          </details>
          <nav className="planner-steps" aria-label="Trip planning steps">{["Find a trail", "Prepare your pack", "Pack & go"].map((label, i) => <button key={label} aria-current={step === i ? "step" : undefined} onClick={() => setStep(i)}><span>{i+1}</span>{label}</button>)}</nav>
          {step === 0 && <section className="planner-stage" aria-labelledby="trail-title">
            <div className="planner-section-heading"><div><h2 id="trail-title" ref={stageHeading} tabIndex={-1}>Find your route</h2><p>{matches.length ? "Options close to your distance and region. Check the terrain and current access before choosing." : "Enter a region and distance to match the route guide. Use online sources to explore more options."}</p></div></div>
            {milesPerDay != null && milesPerDay > 0 && <p className="planner-fit">{milesPerDay.toFixed(1)} miles per day{history.usualMilesPerDay ? ` · ${milesPerDay > history.usualMilesPerDay * 1.15 ? "Above" : "Close to or below"} your usual ${history.usualMilesPerDay.toFixed(1)} mi/day.` : " · Add your usual daily mileage in My trip preferences to compare."} Terrain, altitude, and conditions also affect effort.</p>}
            <div className="planner-route-list">{matches.map(({ route: candidate, difference }) => <article key={candidate.id} className={`planner-route ${route?.id === candidate.id ? "selected" : ""}`}>
              <div className="planner-route-meta"><span>{candidate.difficulty}</span><span>{difference < 0.1 ? "Your target distance" : `${difference.toFixed(0)} mi from your target`}</span></div>
              <h3>{candidate.name}</h3><p>{candidate.region}</p>
              <div className="planner-route-stats"><strong>{candidate.distanceMiles} <small>miles</small></strong>{request.days && <strong>{(candidate.distanceMiles/request.days).toFixed(1)} <small>mi/day</small></strong>}{candidate.elevationFt != null && <strong>{candidate.elevationFt.toLocaleString()} <small>ft gain</small></strong>}</div>
              <p className="planner-help">{candidate.note}</p>
              <div className="planner-actions">{candidate.sourceUrl ? <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer">{candidate.sourceLabel}</a> : <span className="planner-help">{candidate.sourceLabel}</span>}<button className="planner-button secondary" onClick={() => { setRoute(candidate); setExplanation([]); }}>{route?.id === candidate.id ? "Selected" : "Choose this route"}</button></div>
            </article>)}</div>
            {matches.length === 0 && <p className="planner-empty">No close match in the saved route guide. The online search below may have more options.</p>}
            <details className="planner-details" open={matches.length === 0}><summary>Search the web for more routes</summary><p className="planner-help">These discovery links may include encyclopedia results. Verify them with the land manager; they do not confirm a matching distance, conditions, or permits.</p>
              <p role="status">{searching ? "Finding public trail sources…" : searchError}</p>
              <ul className="planner-sources">{sources.map((s, i) => <li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a><p>{s.snippet}</p></li>)}</ul>
              <div className="planner-actions"><button className="planner-link" disabled={searching || !request.region} onClick={() => void findSources(request)}>Search again</button><a href={`https://www.google.com/search?q=${encodeURIComponent(`${request.region} ${request.distanceMiles ?? ""} mile backpacking official trails`)}`} target="_blank" rel="noopener noreferrer">Open web search</a></div>
            </details>
            <details className="planner-details"><summary>Add a route you found</summary><form className="planner-fields" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); setRoute({ id: `manual:${crypto.randomUUID()}`, name: String(data.get("name")), region: request.region, distanceMiles: Number(data.get("distance")), elevationFt: null, difficulty: "Check source", sourceUrl: String(data.get("source")), sourceLabel: "Your route source", note: "Route entered from your source. Verify its distance, conditions, and overnight rules before travel." }); setExplanation([]); }}>
              <label>Route name<input name="name" required maxLength={180} /></label><label>Route distance (mi)<input name="distance" type="number" min="0.1" max="10000" step="any" required /></label><label className="planner-span">Official route URL<input name="source" type="url" pattern="https://.*" required maxLength={2000} /></label><button className="planner-button secondary">Use this route</button>
            </form></details>
            {route && <p className="planner-fit">Selected: {route.name} · {route.distanceMiles} miles</p>}
            <CatalogSuggestions region={request.region} />
            <button className="planner-button" onClick={() => setStep(1)}>Prepare my pack <span aria-hidden="true">→</span></button>
          </section>}
          {step === 1 && <section className="planner-stage" aria-labelledby="pack-title">
            <div className="planner-section-heading"><div><h2 id="pack-title" ref={stageHeading} tabIndex={-1}>Bring the right things.</h2><p>Start with your gear. Add supplies, fill missing weights, and compare with your own carrying target.</p></div></div>
            <div className="planner-weight"><div><span>{report.complete ? "Calculated starting pack" : "Known weight so far"}</span><strong>{report.loadedLb.toFixed(1)} <small>lb</small></strong></div><dl><div><dt>Base gear</dt><dd>{report.baseLb.toFixed(1)} lb</dd></div><div><dt>Food, water & fuel</dt><dd>{report.suppliesLb.toFixed(1)} lb</dd></div><div><dt>Worn separately</dt><dd>{report.wornLb.toFixed(1)} lb</dd></div></dl></div>
            <p className="planner-fit">{history.comfortablePackLb ? `Your carrying target: ${history.comfortablePackLb} lb. ${report.overTarget ? `Currently ${(report.loadedLb-history.comfortablePackLb).toFixed(1)} lb over your target.` : report.complete ? "Within your chosen target." : "Add the missing weights before comparing."}` : "What pack weight has felt comfortable on similar trips? Add it in My trip preferences to set a personal target."}</p>
            {report.baseBudgetLb != null && <p className="planner-help">With these supplies, your base-gear budget is {Math.max(0, report.baseBudgetLb).toFixed(1)} lb.{report.baseBudgetLb < 0 ? " Supplies alone exceed your target; revise your plan and resupply strategy." : " This is a planning target, not a personal safety limit."} <a href={REFERENCES.weight} target="_blank" rel="noopener noreferrer">Pack-weight guidance</a></p>}
            {report.unknown.length > 0 && <p className="planner-alert">Weight missing: {report.unknown.join(", ")}. The total is incomplete.</p>}
            <div className="planner-inventory"><div className="planner-section-heading"><h3>Your equipment</h3><span>{selected.length} of {inventory.length} items selected</span></div>
              {inventory.length === 0 ? <p className="planner-empty">Your gear list is empty. Add equipment below or sign in to use your gear locker.</p> : inventory.map(g => <div className="planner-gear-row" key={g.id}>
                <label><input type="checkbox" checked={!excluded.includes(g.id)} onChange={e => { setExcluded(ids => e.target.checked ? ids.filter(id => id !== g.id) : [...ids, g.id]); setExplanation([]); }} /><span><strong>{g.name}{g.qty > 1 ? ` ×${g.qty}` : ""}</strong><small>{g.category} · {g.type}{g.packedSize ? ` · ${g.packedSize}` : ""}</small></span></label><span className="planner-numeric">{g.weightOz === null ? "Unknown" : `${(g.weightOz*g.qty).toFixed(1)} oz`}</span><button className="planner-link" onClick={() => setEditing(g)} aria-label={`Edit ${g.name}`}>Edit</button>
              </div>)}
            </div>
            {editing && <GearEditor key={editing.id} initial={editing} onSave={saveGear} onCancel={() => setEditing(null)} />}
            <details className="planner-details" open={inventory.length === 0}><summary>Add equipment</summary><GearEditor onSave={saveGear} /></details>
            <details className="planner-details" open={!report.complete}><summary>Food, water & fuel</summary><label className="planner-check"><input type="checkbox" checked={request.suppliesInGear} onChange={e => setTrip({ suppliesInGear: e.target.checked })} />All starting supplies are already included in my selected gear weights</label>
              {!request.suppliesInGear && <div className="planner-fields"><NumberField label="Food per day (oz)" value={request.foodOzPerDay} max={300} onChange={foodOzPerDay => setTrip({ foodOzPerDay })} /><NumberField label="Starting water carry (liters)" value={request.waterLiters} max={100} onChange={waterLiters => setTrip({ waterLiters })} /><NumberField label="Additional fuel (oz)" value={request.fuelOz} max={1000} onChange={fuelOz => setTrip({ fuelOz })} hint="Enter 0 if none. Include the container in your gear." /></div>}
              <p className="planner-help">Enter your actual planned amounts. Water weight is for your starting carry; refill points need confirmation. Food uses {request.days ?? "your number of"} days.</p>
              {report.missingSupplies.length > 0 && <p className="planner-help">Still needed: {report.missingSupplies.join(", ")}.</p>}
              {report.duplicateSupplies && <p className="planner-alert">You have consumables in your gear and additional supplies here. Check that food, water, and fuel aren’t counted twice.</p>}
            </details>
            {report.overTarget && selected.length > 0 && <div className="planner-trim"><h3>Start your weight review here</h3><p>These are your heaviest carried base items. Review duplicates and lighter options without dropping essential protection.</p><ul>{selected.filter(g => g.type === "Base" && g.weightOz !== null).sort((a,b) => b.weightOz!*b.qty-a.weightOz!*a.qty).slice(0, 3).map(g => <li key={g.id}>{g.name} <span>{(g.weightOz!*g.qty/16).toFixed(1)} lb</span></li>)}</ul></div>}
            <button className="planner-button" onClick={() => setStep(2)}>Show me how to pack <span aria-hidden="true">→</span></button>
          </section>}
          {step === 2 && <section className="planner-stage" aria-labelledby="go-title"><h2 id="go-title" ref={stageHeading} tabIndex={-1}>A place for everything.</h2><p>Pack your selected equipment from the bottom up. Keep emergency and on-trail items accessible.</p>
            <div className="planner-packing-progress"><span>{selected.filter(g => packed.includes(g.id)).length} of {selected.length} items checked</span><progress aria-label="Equipment packing progress" max={Math.max(selected.length, 1)} value={selected.filter(g => packed.includes(g.id)).length} /></div>
            {(["Bottom", "Core", "Top / quick access", "Worn"] as PackingZone[]).map(zone => <div className="planner-zone" key={zone}><div><h3>{zone}</h3><p>{ZONE_GUIDANCE[zone]}</p></div><ul>{selected.filter(g => packingZone(g) === zone).map(g => <li key={g.id}><label className="planner-check"><input type="checkbox" checked={packed.includes(g.id)} onChange={e => setPacked(ids => e.target.checked ? [...ids, g.id] : ids.filter(id => id !== g.id))} /><span>{g.name}{g.qty > 1 ? ` ×${g.qty}` : ""}{g.packedSize && <small>{g.packedSize}</small>}</span></label></li>)}</ul></div>)}
            {!selected.length && <p className="planner-empty">Add your equipment in Prepare your pack to create a personal checklist.</p>}
            {!request.suppliesInGear && <p className="planner-help">Also pack the food, water, and fuel allowances you entered. These totals are separate from the item checklist.</p>}
            <p className="planner-help">Pack volume {memory.profile.packCapacityL ? `is ${memory.profile.packCapacityL} L` : "hasn’t been entered"}. An actual test pack is needed to confirm fit. <a href={REFERENCES.packing} target="_blank" rel="noopener noreferrer">How to load a backpack</a></p>
            <h3>Before you head out</h3><ul className="planner-prep">{preparationChecks(request).map(check => <li key={check}>{check}</li>)}</ul><a href={REFERENCES.essentials} target="_blank" rel="noopener noreferrer">National Park Service: the Ten Essentials</a>
            <div className="planner-actions planner-go-actions"><button className="planner-button" onClick={savePlan} disabled={!request.region || !request.distanceMiles || !request.days}>Save this trip on my device</button><Link className="planner-button secondary" href={route?.trailId ? `/record/live?type=hike&trail_id=${encodeURIComponent(route.trailId)}` : "/record"}>Open activity recorder</Link></div>
          </section>}
          <details className="planner-details planner-questions"><summary>{followUps.length ? `${followUps.length} details to make this plan yours` : "Your trip details are filled in"}</summary><ul>{followUps.map(q => <li key={q}>{q}</li>)}</ul><p className="planner-help">Update trip details above and My trip preferences alongside the plan.</p></details>
          <div className="planner-ai-answer"><div className="planner-section-heading"><h3>Think it through with local AI</h3>{model.status === "ready" && <button className="planner-link" onClick={() => void explain()}>Explain my plan</button>}</div>
            <p className="planner-help">{model.status === "off" || model.status === "error" ? "Enable the browser model in Local AI to get an explanation using this trip, your gear, and past-trip feedback." : model.status === "loading" ? "The browser model is loading. Keep building your plan while it finishes." : model.status === "thinking" ? "Thinking on this device…" : "The local model prioritizes facts and questions from your current plan. Displayed weights and specifications come from the planner’s verified data."}</p>
            {explanation.length > 0 && explainedSignature === aiSignature && <ul className="planner-explanation">{explanation.map(text => <li key={text}>{text}</li>)}</ul>}<p role="status" className="planner-help">{aiError}</p>
          </div>
        </>}
        <p role="status" className="planner-notice">{memoryError || notice}</p>
      </div>
      <aside className="planner-sidebar" aria-label="Your planning context">
        <section className="planner-memory"><h2>Made for your kind of trip.</h2><p>{context.userId ? "Using your signed-in account’s equipment and completed hikes." : "Planning as a guest. Your preferences, gear additions, and saved trips stay in this browser."}</p><dl><div><dt>Gear available</dt><dd>{inventory.length} items</dd></div><div><dt>Recorded hikes</dt><dd>{context.activities.length}</dd></div><div><dt>Trip feedback</dt><dd>{history.completedCount} trips</dd></div></dl>{history.typicalRecordedHike != null && <p className="planner-help">Your typical recorded hike is {history.typicalRecordedHike.toFixed(1)} mi. Add daily-mileage preferences for overnight trips.</p>}{!context.userId && <Link href="/login">Sign in to use account gear & hikes</Link>}</section>
        <details className="planner-details"><summary>My trip preferences</summary><div className="planner-fields one-column">
          <NumberField label="Usual comfortable miles / day" value={memory.profile.usualMilesPerDay} min={0.1} max={100} onChange={usualMilesPerDay => setProfile({ usualMilesPerDay })} />
          <NumberField label="Comfortable loaded pack (lb)" value={memory.profile.comfortablePackLb} min={1} max={150} onChange={comfortablePackLb => setProfile({ comfortablePackLb })} hint={history.basis} />
          <NumberField label="Backpack capacity (liters)" value={memory.profile.packCapacityL} min={1} max={200} onChange={packCapacityL => setProfile({ packCapacityL })} />
          <label>Backpacking experience<select value={memory.profile.experience} onChange={e => setProfile({ experience: e.target.value as PlannerProfile["experience"] })}><option value="new">Getting started</option><option value="some">Some overnight trips</option><option value="experienced">Experienced</option></select></label>
          <label>What matters to you?<textarea rows={3} value={memory.profile.priorities} onChange={e => setProfile({ priorities: e.target.value })} maxLength={500} placeholder="Quieter trails, a warm sleep system…" /></label>
        </div><p className="planner-help">Saved on this device. Your explicit preferences take priority over learned trip feedback.</p></details>
        <section className="planner-local"><div className="planner-section-heading"><h3>Local AI</h3><span className={`planner-model-status ${model.status === "ready" ? "ready" : ""}`}>{model.status === "ready" ? "On device" : model.status === "thinking" ? "Thinking" : model.status === "loading" ? "Loading" : "Off"}</span></div>
          <p>No separate app to install. The first load downloads Qwen 2.5 1.5B model files into browser storage. A WebGPU-capable browser and available device memory are required.</p>
          <p className="planner-help">Your trip and gear context are processed locally. Online lookup sends only the search terms or product URL. The standard planner works without loading AI.</p>
          {model.status === "loading" && <progress aria-label="Local model loading" value={model.progress} max={1} />}
          <p className="planner-model-message" role="status">{model.message}</p>
          {model.status === "off" || model.status === "error" ? <button className="planner-button secondary" onClick={() => void model.load()}>{model.status === "error" ? "Retry local AI" : "Enable local AI"}</button> : <button className="planner-link" onClick={model.stop}>{model.status === "loading" ? "Cancel model loading" : model.status === "thinking" ? "Stop AI" : "Turn off local AI"}</button>}
        </section>
        <details className="planner-details"><summary>Saved trips <span>{memory.plans.length}</span></summary>{memory.plans.length === 0 ? <p className="planner-help">Save a trip from Pack & go. When you return, add feedback here.</p> : memory.plans.map(plan => <div className="planner-saved" key={plan.id}><h4>{plan.route?.name ?? plan.request.region}</h4><p>{plan.route?.distanceMiles ?? plan.request.distanceMiles} mi · {plan.request.days} days{plan.feedback ? " · Completed" : " · Planned"}</p><button className="planner-link" onClick={() => restore(plan)}>Restore trip</button><details><summary>{plan.feedback ? "Review trip feedback" : "How did the trip go?"}</summary><FeedbackForm key={`${plan.id}-${JSON.stringify(plan.feedback)}`} plan={plan} onSave={feedback => { update(m => ({ ...m, plans: m.plans.map(p => p.id === plan.id ? { ...p, feedback } : p) })); setNotice("Trip feedback remembered. Future plans will use it."); }} /></details></div>)}</details>
        <details className="planner-details"><summary>Privacy & memory</summary><p>Only this account’s data is used. Other users’ accounts and external apps are not connected. Guest and signed-in planning memories are separate.</p><p>Local planning data stays in this browser profile until you remove it or clear site data. It is not encrypted or synced to your account. Use a separate browser profile on shared devices.</p>{forgetPending ? <div role="group" aria-label="Confirm forgetting local planning data"><p>This removes this profile’s local preferences, gear additions, and saved trips. Account gear and activities stay in your account.</p><div className="planner-actions"><button className="planner-button secondary" onClick={() => { if (update(() => emptyMemory())) { setStarted(false); setExcluded([]); setPacked([]); setRoute(null); setExplanation([]); model.stop(); setForgetPending(false); setNotice("Local planning memory cleared."); } }}>Confirm forget</button><button className="planner-link" onClick={() => setForgetPending(false)}>Keep my data</button></div></div> : <button className="planner-link" onClick={() => setForgetPending(true)}>Forget local planning data</button>}</details>
        {context.messages.map(message => <p className="planner-alert" key={message}>{message}</p>)}
      </aside>
    </div>
  </div>;
}
