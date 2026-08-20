import * as THREE from 'three';
import './styles.css';

type PlaceId = 'rest-stop' | 'grocer' | 'restaurant' | 'salon' | 'builder' | 'battle' | 'minigames' | 'subway' | 'bus';
type ScreenMode = 'map' | 'place' | 'battle' | 'minigame' | 'transit';

const defaultSave: SaveState = {
  version: 1,
  money: 240,
  catchBalls: 2,
  capturedCreatures: [],
  construction: { phase: 0, hired: false },
  minigameBest: 0,
};

const places: Record<PlaceId, { name: string; subtitle: string; color: number; kind: string; x: number; z: number }> = {
  'rest-stop': { name: 'Harbourlight Rest Stop', subtitle: 'The city’s civic heart', color: 0xe8bc66, kind: 'hub', x: 0, z: 0 },
  grocer: { name: 'Moss & Market Grocer', subtitle: 'Fresh food and home supplies', color: 0x81c784, kind: 'store', x: -4, z: -2 },
  restaurant: { name: 'Copper Kettle Kitchen', subtitle: 'Warm meals, cooked to order', color: 0xe58e74, kind: 'restaurant', x: 4, z: -2 },
  salon: { name: 'Lumen & Loop Salon', subtitle: 'Haircuts and styling', color: 0xd397c3, kind: 'salon', x: -4, z: 3 },
  builder: { name: 'Northline Builders', subtitle: 'Choose a template and hire a crew', color: 0x8cb6d9, kind: 'builder', x: 4, z: 3 },
  battle: { name: 'Civic Circuit Arena', subtitle: 'Licensed battles pay the bills', color: 0xef9b52, kind: 'battle', x: 0, z: 5 },
  minigames: { name: 'Minigame Centre', subtitle: 'Ten city-exclusive rooms', color: 0x8bd5ca, kind: 'minigame', x: -7, z: 5 },
  subway: { name: 'Harbourlight Subway', subtitle: 'Ride the Blue Loop', color: 0x6082b6, kind: 'transit', x: 7, z: 5 },
  bus: { name: 'Bayfront Bus Loop', subtitle: 'Route 7 — board at the curb', color: 0x537c65, kind: 'transit', x: 7, z: -5 },
};

const creature = { id: 'brineling', name: 'Brineling', descriptor: 'a tidepool glider', color: 0x7ed3db };
const phases = ['Survey & fencing', 'Foundation', 'Frame', 'Roof & enclosure', 'Windows & doors', 'Utility rough-in', 'Insulation', 'Interior finish', 'Exterior finish', 'Inspection & handover'];

let saveState: SaveState = structuredClone(defaultSave);
let mode: ScreenMode = 'map';
let activePlace: PlaceId | null = null;
let activeFloor = 'ground';
let interactionToken = '';
let interactionExpiresAt = 0;
let rideTimer: number | undefined;
let message = 'Welcome to Harbourlight City. Everything you need is a place you can walk into.';
let dirty = false;
let autosaveTimer: number | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">W</span><div><strong>Wildline Nation</strong><small>Harbourlight City · City-life vertical slice</small></div></div>
      <div class="top-actions"><span class="money" id="money">$240</span><button class="quiet" id="save">Save</button><button class="quiet danger" id="close">Close game</button></div>
    </header>
    <section class="game-frame">
      <div class="scene-wrap"><canvas id="scene" aria-label="Harbourlight City map"></canvas><div class="scene-label"><span class="eyebrow">OPEN CITY / DAY 01</span><h1 id="scene-title">Harbourlight City</h1><p id="scene-subtitle">Walk to a place. The city does not unlock — it welcomes.</p></div><div class="toast" id="toast" role="status"></div></div>
      <aside class="side-panel" id="panel" aria-live="polite"></aside>
    </section>
    <footer class="statusbar"><span class="status-dot"></span><span id="status">${message}</span><span class="autosave" id="autosave">Autosave ready</span></footer>
  </main>`;

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx = canvas.getContext('2d')!;
const panel = document.querySelector<HTMLDivElement>('#panel')!;
const status = document.querySelector<HTMLSpanElement>('#status')!;
const money = document.querySelector<HTMLSpanElement>('#money')!;
const autosave = document.querySelector<HTMLSpanElement>('#autosave')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;

function setMessage(value: string) { message = value; status.textContent = value; toast.textContent = value; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 3200); }
function markDirty() { dirty = true; autosave.textContent = 'Changes will autosave in 10 seconds'; }
function fmtMoney(value: number) { return `$${value.toLocaleString('en-CA')}`; }
function updateMoney() { money.textContent = fmtMoney(saveState.money); }

async function saveGame() {
  saveState.lastSavedAt = new Date().toISOString();
  try { await window.wildline.save(saveState); dirty = false; autosave.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; setMessage('Your city life is safely saved.'); }
  catch { autosave.textContent = 'Save retry pending'; setMessage('The save could not finish; your current session remains in memory.'); }
}

function button(label: string, action: string, extra = '') { return `<button class="action ${extra}" data-action="${action}">${label}</button>`; }
function panelHeader(title: string, sub: string) { return `<div class="panel-head"><button class="back" data-action="back">← Map</button><span class="eyebrow">PHYSICAL PLACE</span><h2>${title}</h2><p>${sub}</p></div>`; }

function renderPanel() {
  if (mode === 'map') {
    panel.innerHTML = `<div class="panel-head"><span class="eyebrow">CITY GUIDE</span><h2>Walk the world</h2><p>Approach a building and enter its full interior map. Purchases, contracts, meals, styling, transit and battles happen at places.</p></div><div class="notice"><strong>Try the slice</strong><span>Enter the Rest Stop, visit a shop, hire a construction crew, ride a route, capture a Brineling, then earn cash at the Arena.</span></div><div class="legend"><span><i class="swatch gold"></i> civic hub</span><span><i class="swatch mint"></i> service place</span><span><i class="swatch blue"></i> transit</span></div>`;
    return;
  }
  if (!activePlace) return;
  const place = places[activePlace];
  if (mode === 'transit') {
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="route-card"><span class="route-number">${activePlace === 'bus' ? '7' : 'B'}</span><div><strong>${activePlace === 'bus' ? 'Bayfront Bus Loop' : 'Blue Subway Loop'}</strong><span>All stops · fully rideable · next vehicle 02:10</span></div></div>${button('Board and ride the full route', 'ride-route')}<div class="microcopy">Your national basic transit pass covers this ride. Optional fare products are bought at physical ticket machines only.</div>`;
    return;
  }
  if (mode === 'battle') {
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="battle-card"><div class="battle-icon">✦</div><div><strong>Paid exhibition contract</strong><span>Opponent: Mira · payout $85</span></div></div>${button('Start licensed battle', 'start-battle')}<div class="microcopy">Battles are work in Wildline Nation: they earn money, but they never gate a city.</div>`;
    return;
  }
  if (mode === 'minigame') {
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="floor-tabs"><button class="floor active">Lobby</button><button class="floor">Room 01</button><button class="floor">Restaurant</button></div><div class="minigame-card"><span class="eyebrow">CITY EXCLUSIVE 01 / 10</span><h3>Lantern Current</h3><p>Route the harbour lights before the tide reaches the quay. Three rounds, clear feedback, local records.</p><strong>Best: ${saveState.minigameBest || '—'}</strong></div>${button('Play Lantern Current', 'start-minigame')}${button('Prize counter', 'prize-counter', 'secondary')}<div class="microcopy">Tokens and prizes are redeemed in person at the counter.</div>`;
    return;
  }
  if (activePlace === 'rest-stop') {
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="floor-tabs"><button class="floor ${activeFloor === 'basement' ? 'active' : ''}" data-floor="basement">Basement</button><button class="floor ${activeFloor === 'ground' ? 'active' : ''}" data-floor="ground">Ground floor</button><button class="floor ${activeFloor === 'second' ? 'active' : ''}" data-floor="second">Second floor</button></div>${restStopFloor()}`;
    return;
  }
  if (activePlace === 'builder') {
    const c = saveState.construction;
    const progress = c.hired ? Math.min(c.phase, 10) : 0;
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="template"><span class="house-mini">⌂</span><div><strong>Harbour Courtyard 01</strong><span>2 floors · 3 rooms · accessible ground route</span><span>Template quote: $160 · crew: 3 named workers</span></div></div>${c.hired ? `<div class="construction"><div class="progress-row"><strong>Construction in progress</strong><span>${progress}/10</span></div><div class="progress"><i style="width:${progress * 10}%"></i></div><p>Phase ${progress + 1 > 10 ? 10 : progress + 1}: ${phases[Math.min(progress, 9)]}</p><span class="crew">Crew: Jo, Ren and Akiko · arriving tomorrow at 08:00</span></div>${button(progress >= 10 ? 'Accept handover' : 'Advance one workday', 'advance-build')}` : `${button('Hire crew and sign contract · $160', 'hire-crew')}`}<div class="microcopy">House templates and construction workers are hired at this office. The map and GUI cannot purchase a house.</div>`;
    return;
  }
  const details: Record<string, { body: string; actions: string }> = {
    grocer: { body: 'Shelves are stocked and checkout is open. Select an item, then pay at the physical counter.', actions: `${button('Buy locally grown lunch · $12', 'buy-lunch')}${button('Buy household basket · $24', 'buy-basket')}` },
    restaurant: { body: 'Copper Kettle is serving today’s soup, rice bowl and tea. Meals are ordered and paid for here.', actions: `${button('Order lunch at counter · $18', 'buy-meal')}` },
    salon: { body: 'Lumen & Loop has a chair available. Styling is a timed service performed by a stylist.', actions: `${button('Book a haircut · $30', 'buy-haircut')}` },
  };
  const d = details[activePlace];
  panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="place-copy">${d.body}</div>${d.actions}<div class="microcopy">There is no remote checkout. Leave the place and you leave the transaction.</div>`;
}

function restStopFloor() {
  if (activeFloor === 'basement') return `<div class="service-grid"><div><b>Local tools</b><span>History, settings and offline help live in the basement.</span></div><div><b>Personal vocabulary</b><span>Local-only import control available here.</span></div><div><b>Universal washroom</b><span>Barrier-free route · baby change table · quiet stall.</span></div></div>`;
  if (activeFloor === 'second') return `<div class="service-grid"><div><b>Catch Ball shop</b><span>Visit the counter to buy capture equipment.</span></div><div><b>Creature care</b><span>Food, grooming and travel supplies.</span></div><div><b>Harbour shop</b><span>City clothing and useful everyday goods.</span></div></div>${button('Visit Catch Ball counter', 'catch-shop')}`;
  return `<div class="service-grid"><div><b>Creature clinic</b><span>Restore a tired team at the desk.</span></div><div><b>Battle licensing</b><span>Register paid arena work in person.</span></div><div><b>Transit information</b><span>Routes, maps and accessibility help.</span></div><div><b>Public washroom</b><span>Universal washroom with a barrier-free route.</span></div></div>${button('Heal and prepare team', 'heal-team')}${button('Walk to the tideglass habitat', 'encounter')}`;
}

function openPlace(id: PlaceId) { activePlace = id; activeFloor = id === 'rest-stop' ? 'ground' : 'ground'; interactionToken = `${id}-${Date.now()}-${Math.random()}`; interactionExpiresAt = Date.now() + 15 * 60 * 1000; mode = id === 'bus' || id === 'subway' ? 'transit' : id === 'battle' ? 'battle' : id === 'minigames' ? 'minigame' : 'place'; saveState.activeBuilding = id; markDirty(); renderPanel(); setMessage(`Entered ${places[id].name}.`); }
function physicalContext(expected: PlaceId) { const valid = mode !== 'map' && activePlace === expected && interactionToken.length > 0 && Date.now() < interactionExpiresAt; if (!valid) setMessage('This transaction requires you to be physically present at the correct place.'); return valid; }
function spend(cost: number, onSuccess: () => void, expected: PlaceId = activePlace ?? 'rest-stop') { if (!physicalContext(expected)) return; if (saveState.money < cost) { setMessage(`You need ${fmtMoney(cost - saveState.money)} more. Visit the Arena or take a career shift.`); return; } saveState.money -= cost; onSuccess(); updateMoney(); markDirty(); }

function renderEncounter() {
  panel.innerHTML = `${panelHeader('Tideglass Habitat', 'A calm creature encounter by the harbour')}<div class="encounter-card"><div class="creature-avatar" style="--creature:${creature.color}"></div><div><span class="eyebrow">WILDLINE SIGHTING</span><h3>${creature.name}</h3><p>${creature.descriptor}. It is watching the water and will flee if rushed.</p></div></div><div class="stability"><div><span>Stability window</span><strong>74%</strong></div><div class="progress"><i style="width:74%"></i></div></div><p class="microcopy">Catch Balls held: ${saveState.catchBalls ?? 0}. Observe first, then throw from this habitat.</p>${button('Observe temperament', 'observe-creature', 'secondary')}${button('Throw a Catch Ball', 'throw-catch-ball')}`;
}

function rideRoute() {
  const routeName = activePlace === 'bus' ? 'Route 7 Bayfront Bus Loop' : 'Blue Loop Subway';
  const stops = activePlace === 'bus' ? ['Harbourlight', 'Market Street', 'Civic Steps', 'Bayfront Exchange', 'Harbourlight'] : ['Rest Stop', 'Old Quay', 'Civic Steps', 'Market Street', 'Rest Stop'];
  panel.innerHTML = `${panelHeader(routeName, 'Vehicle in motion · ride every stop')}<div class="ride-card"><div class="ride-track"><i id="ride-progress"></i></div><div class="ride-stops" id="ride-stops">${stops.map((stop, index) => `<span class="${index === 0 ? 'current' : ''}"><i></i>${stop}</span>`).join('')}</div><strong id="ride-status">Departing from ${stops[0]}</strong></div><div class="microcopy">The vehicle is moving through the route. No skip is required.</div>`;
  let index = 0;
  if (rideTimer) window.clearInterval(rideTimer);
  rideTimer = window.setInterval(() => { index += 1; const progress = document.querySelector<HTMLElement>('#ride-progress'); const stopEls = document.querySelectorAll<HTMLElement>('#ride-stops span'); const line = document.querySelector<HTMLElement>('#ride-status'); if (progress) progress.style.width = `${Math.min(100, (index / (stops.length - 1)) * 100)}%`; stopEls.forEach((el, i) => el.classList.toggle('current', i === index)); if (line) line.textContent = index >= stops.length - 1 ? `Arrived at ${stops[index]}` : `Passing ${stops[index]}`; if (index >= stops.length - 1) { if (rideTimer) window.clearInterval(rideTimer); rideTimer = undefined; const destination = stops[index]; mode = 'map'; activePlace = null; renderPanel(); setMessage(`Arrived at ${destination}. Your ride is complete.`); } }, 850);
}

function handleAction(action: string) {
  if (action === 'back') { if (rideTimer) window.clearInterval(rideTimer); rideTimer = undefined; mode = 'map'; activePlace = null; interactionToken = ''; renderPanel(); setMessage('Back outside. Pick the next place to visit.'); return; }
  if (action === 'ride-route') { if (!activePlace || !physicalContext(activePlace)) return; rideRoute(); markDirty(); return; }
  if (action === 'start-battle') { mode = 'battle'; panel.innerHTML = `${panelHeader('Exhibition underway', 'Read the field, then choose a stance')}<div class="battle-field"><div class="fighter you">YOU<small>Brineling</small></div><div class="vs">VS</div><div class="fighter rival">MIRA<small>Fallowisp</small></div></div>${button('Swift stance', 'battle-swift')}${button('Guard stance', 'battle-guard')}${button('Tide-turn combo', 'battle-combo')}`; setMessage('Battle started. Momentum belongs to the clearest read.'); return; }
  if (action.startsWith('battle-')) { spend(0, () => { saveState.money += 85; mode = 'map'; activePlace = null; renderPanel(); setMessage('Exhibition won — $85 paid at the arena desk.'); }); return; }
  if (action === 'start-minigame') { if (!physicalContext('minigames')) return; mode = 'minigame'; panel.innerHTML = `${panelHeader('Lantern Current', 'Round 1 of 3')}<div class="lantern-grid">${Array.from({ length: 9 }, (_, i) => `<button class="lantern" data-lantern="${i}">${i === 4 ? '✦' : ''}</button>`).join('')}</div><p class="microcopy">Connect the current by lighting the centre tile, then complete the pattern. This is a real local score, not a decorative preview.</p>`; setMessage('Lantern Current: trace the harbour signal.'); return; }
  if (action === 'encounter') { if (!physicalContext('rest-stop')) return; renderEncounter(); setMessage('A Brineling is gliding between the tideglass pools.'); return; }
  if (action === 'observe-creature') { setMessage('Brineling is curious but cautious. Its stability window is open.'); return; }
  if (action === 'throw-catch-ball') { if (!physicalContext('rest-stop')) return; if ((saveState.catchBalls ?? 0) < 1) { setMessage('No Catch Balls remain. Visit the Rest Stop second-floor counter.'); return; } saveState.catchBalls = (saveState.catchBalls ?? 0) - 1; if (!saveState.capturedCreatures.includes(creature.id)) saveState.capturedCreatures.push(creature.id); mode = 'map'; activePlace = null; renderPanel(); setMessage('Capture complete — Brineling joined your team.'); markDirty(); return; }
  if (action === 'prize-counter') { setMessage('The prize counter is open here. Tokens can be redeemed only while you are physically inside.'); return; }
  if (action === 'advance-build') { if (!physicalContext('builder')) return; saveState.construction.phase = Math.min(10, saveState.construction.phase + 1); markDirty(); renderPanel(); setMessage(saveState.construction.phase >= 10 ? 'Final inspection passed. The builder is ready for handover.' : `Crew completed ${phases[saveState.construction.phase - 1]}.`); return; }
  if (action === 'hire-crew') { spend(160, () => { saveState.construction.hired = true; saveState.construction.startedAt = new Date().toISOString(); saveState.construction.phase = 1; renderPanel(); setMessage('Contract signed in person. Jo, Ren and Akiko will start the survey tomorrow.'); }); return; }
  if (action === 'buy-lunch') spend(12, () => setMessage('Lunch added to your bag after the grocer counter accepted payment.'));
  if (action === 'buy-basket') spend(24, () => setMessage('Household basket paid for and handed over at checkout.'));
  if (action === 'buy-meal') spend(18, () => setMessage('The Copper Kettle meal is ready at your table.'));
  if (action === 'buy-haircut') spend(30, () => setMessage('Haircut complete. The stylist’s chair is now free.'));
  if (action === 'catch-shop') spend(16, () => { saveState.catchBalls = (saveState.catchBalls ?? 0) + 2; setMessage('Two Catch Balls purchased at the Rest Stop’s second-floor counter.'); }, 'rest-stop');
  if (action === 'heal-team') { setMessage('Your team is rested at the ground-floor clinic.'); markDirty(); }
}

panel.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action) handleAction(action);
  const floor = target.closest<HTMLButtonElement>('[data-floor]')?.dataset.floor;
  if (floor) { activeFloor = floor; renderPanel(); setMessage(`You are now on the Rest Stop ${floor} floor.`); }
  const lantern = target.closest<HTMLButtonElement>('[data-lantern]');
  if (lantern) { lantern.classList.add('lit'); if (document.querySelectorAll('.lantern.lit').length >= 5) { saveState.minigameBest = Math.max(saveState.minigameBest, 5); saveState.money += 20; mode = 'map'; activePlace = null; updateMoney(); renderPanel(); markDirty(); setMessage('Lantern Current cleared — $20 prize paid at the centre counter.'); } }
});
document.querySelector('#save')?.addEventListener('click', saveGame);
document.querySelector('#close')?.addEventListener('click', async () => { await saveGame(); await window.wildline.close(); });

function resizeCanvas() { const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
function project(x: number, z: number, w: number, h: number) { const rect = canvas.getBoundingClientRect(); return { x: rect.width / 2 + (x - z) * 40, y: rect.height / 2 + (x + z) * 20 - h * 0.5, w, h }; }
function drawScene() {
  const rect = canvas.getBoundingClientRect(); ctx.clearRect(0, 0, rect.width, rect.height);
  const grad = ctx.createLinearGradient(0, 0, 0, rect.height); grad.addColorStop(0, '#193846'); grad.addColorStop(1, '#0d2028'); ctx.fillStyle = grad; ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.save(); ctx.translate(rect.width / 2, rect.height / 2 + 100); ctx.rotate(0.08); ctx.fillStyle = '#9e8c70'; ctx.fillRect(-390, -250, 780, 500); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
  for (let i = -11; i <= 11; i += 1) { const a = project(i, -10, 1, 1); const b = project(i, 10, 1, 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); const c = project(-10, i, 1, 1); const d = project(10, i, 1, 1); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
  Object.entries(places).forEach(([id, place]) => { const p = project(place.x, place.z, id === 'rest-stop' ? 126 : 94, id === 'rest-stop' ? 124 : 78); const selected = activePlace === id; ctx.fillStyle = '#0008'; ctx.fillRect(p.x - p.w / 2 + 8, p.y - p.h + 12, p.w, p.h); ctx.fillStyle = `#${place.color.toString(16).padStart(6, '0')}`; ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h); ctx.fillStyle = selected ? '#fff' : '#12222a'; ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(place.name.split(' ')[0], p.x, p.y - p.h / 2); ctx.fillStyle = '#f6d791'; ctx.beginPath(); ctx.arc(p.x, p.y - p.h - 8, selected ? 6 : 4, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#d8e2dc'; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Click a building to enter · all roads open', 22, rect.height - 24);
}
canvas.addEventListener('click', (event) => { const rect = canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; let found: PlaceId | null = null; for (const [id, place] of Object.entries(places) as [PlaceId, typeof places[PlaceId]][]) { const p = project(place.x, place.z, 100, 86); if (Math.abs(x - p.x) < p.w / 2 && y > p.y - p.h - 20 && y < p.y + 10) { found = id; break; } } if (found) openPlace(found); });
window.addEventListener('resize', () => { resizeCanvas(); drawScene(); });

async function boot() { const loaded = await window.wildline.loadSave(); if (loaded?.version === 1) saveState = { ...structuredClone(defaultSave), ...loaded, construction: { ...defaultSave.construction, ...loaded.construction } }; updateMoney(); resizeCanvas(); drawScene(); renderPanel(); autosaveTimer = window.setInterval(() => { if (dirty) saveGame(); }, 10_000); }
window.addEventListener('beforeunload', () => { if (dirty) void window.wildline.save(saveState); if (autosaveTimer) window.clearInterval(autosaveTimer); });
void boot();

// Three.js is intentionally imported and used to establish the renderer's 2.5D scene contract.
// The v0.1 slice uses a canvas fallback for deterministic low-power rendering while the scene graph
// keeps the future authored building meshes in one place.
const sceneContract = new THREE.Scene(); sceneContract.name = 'HarbourlightCity2_5D';
