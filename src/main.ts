import * as THREE from 'three';
import './styles.css';
import { cities, cityPlaces, placeById, routeById, routesForBuilding } from './game/world';
import { createDefaultSave, migrateSave } from './game/save';
import { consumeRouteTicket, purchaseTicket } from './game/tickets';
import type { CityDefinition, PlaceDefinition, SaveStateV2, TransitRoute } from './game/types';

type ScreenMode = 'map' | 'place' | 'battle' | 'minigame' | 'transit';

const phases = ['Survey & fencing', 'Foundation', 'Frame', 'Roof & enclosure', 'Windows & doors', 'Utility rough-in', 'Insulation', 'Interior finish', 'Exterior finish', 'Inspection & handover'];
let saveState: SaveStateV2 = createDefaultSave();
let mode: ScreenMode = 'map';
let activePlaceId: string | null = null;
let activeFloor = 'ground';
let interactionToken = '';
let interactionExpiresAt = 0;
let rideTimer: number | undefined;
let dirty = false;
let autosaveTimer: number | undefined;
let message = 'Welcome to Harbourlight City. The harbour now opens into an entire nation.';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">W</span><div><strong>Wildline Nation</strong><small id="brand-city">National city-life journey</small></div></div>
      <div class="top-actions"><span class="ticket-count" id="ticket-count">0 tickets</span><span class="money" id="money">$240</span><button class="quiet" id="save">Save</button><button class="quiet danger" id="close">Close game</button></div>
    </header>
    <section class="game-frame">
      <div class="scene-wrap"><canvas id="scene" tabindex="0" aria-label="City map"></canvas><div class="scene-label"><span class="eyebrow">OPEN NATION / DAY 01</span><h1 id="scene-title"></h1><p id="scene-subtitle"></p></div><div class="toast" id="toast" role="status"></div></div>
      <aside class="side-panel" id="panel" aria-live="polite"></aside>
    </section>
    <footer class="statusbar"><span class="status-dot"></span><span id="status">${message}</span><span class="autosave" id="autosave">Autosave ready</span></footer>
  </main>`;

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx = canvas.getContext('2d')!;
const panel = document.querySelector<HTMLDivElement>('#panel')!;
const status = document.querySelector<HTMLSpanElement>('#status')!;
const money = document.querySelector<HTMLSpanElement>('#money')!;
const ticketCount = document.querySelector<HTMLSpanElement>('#ticket-count')!;
const autosave = document.querySelector<HTMLSpanElement>('#autosave')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;
const sceneTitle = document.querySelector<HTMLHeadingElement>('#scene-title')!;
const sceneSubtitle = document.querySelector<HTMLParagraphElement>('#scene-subtitle')!;
const brandCity = document.querySelector<HTMLElement>('#brand-city')!;

function currentCity(): CityDefinition { return cities[saveState.currentCity]; }
function activePlace(): PlaceDefinition | undefined { return activePlaceId ? placeById.get(activePlaceId) : undefined; }
function fmtMoney(value: number) { return `$${value.toLocaleString('en-CA')}`; }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!)); }
function actionButton(label: string, action: string, extra = '') { return `<button class="action ${extra}" data-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`; }
function panelHeader(title: string, sub: string) { return `<div class="panel-head"><button class="back" data-action="back">← City map</button><span class="eyebrow">PHYSICAL PLACE</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(sub)}</p></div>`; }
function setMessage(value: string) { message = value; status.textContent = value; toast.textContent = value; toast.classList.add('show'); window.setTimeout(() => toast.classList.remove('show'), 3200); }
function markDirty() { dirty = true; autosave.textContent = 'Changes will autosave in 10 seconds'; }
function updateChrome() {
  const city = currentCity();
  money.textContent = fmtMoney(saveState.money);
  ticketCount.textContent = `${saveState.tickets.length} ticket${saveState.tickets.length === 1 ? '' : 's'}`;
  sceneTitle.textContent = city.name;
  sceneSubtitle.textContent = city.tagline;
  brandCity.textContent = `${city.name} · National city-life journey`;
  canvas.setAttribute('aria-label', `${city.name} map. Use the building list beside the map or click a building.`);
}

async function persistSilently() {
  saveState.lastSavedAt = new Date().toISOString();
  await window.wildline.save(saveState);
  dirty = false;
}
async function saveGame() {
  try { await persistSilently(); autosave.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; setMessage('Your national journey is safely saved.'); }
  catch { autosave.textContent = 'Save retry pending'; setMessage('The save could not finish; your current session remains in memory.'); }
}

function cityGuide() {
  const city = currentCity();
  const placeButtons = city.places.map((place) => `<button class="place-link" data-place="${place.id}"><span class="place-dot" style="--place-color:#${place.color.toString(16).padStart(6, '0')}"></span><span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.subtitle)}</small></span></button>`).join('');
  return `<div class="panel-head"><span class="eyebrow">CITY GUIDE · ${escapeHtml(city.name.toUpperCase())}</span><h2>Choose a physical place</h2><p>Every city has complete daily-life services, three local transit loops and its own people, creature, arena and minigame.</p></div><div class="notice"><strong>National travel</strong><span>Ferries connect Harbourlight and Gullhaven for $18. Flights connect Harbourlight and Asterfield for $60. Buy a physical one-way ticket inside the correct terminal, then board there.</span></div><nav class="place-list" aria-label="Buildings in ${escapeHtml(city.name)}">${placeButtons}</nav>`;
}

function routePanel(place: PlaceDefinition) {
  const routes = routesForBuilding(place.id);
  const cards = routes.map((route) => {
    const ticket = saveState.tickets.find((item) => item.routeId === route.id);
    const destination = cities[route.destinationCityId].name;
    const detail = route.ticketRequired
      ? `${route.mode === 'ferry' ? 'Sailing' : 'Flight'} to ${destination} · ${fmtMoney(route.fare)} one-way · ${ticket ? 'ticket held' : 'ticket required'}`
      : `${route.stops.length}-stop ${route.loop ? 'loop' : 'route'} · national basic transit pass covered`;
    const controls = route.ticketRequired
      ? `${actionButton(ticket ? 'Buy another route ticket' : `Buy physical ticket · ${fmtMoney(route.fare)}`, `buy-ticket:${route.id}`, ticket ? 'secondary' : '')}${actionButton(ticket ? `Board ${route.mode}` : `Board ${route.mode} · ticket required`, `board-route:${route.id}`, ticket ? '' : 'secondary')}`
      : actionButton('Board and ride the full route', `board-route:${route.id}`);
    return `<section class="route-block"><div class="route-card ${route.mode}"><span class="route-number">${escapeHtml(route.code)}</span><div><strong>${escapeHtml(route.publicName)}</strong><span>${escapeHtml(detail)}</span></div></div>${controls}</section>`;
  }).join('');
  return `${panelHeader(place.name, place.subtitle)}${cards}<div class="microcopy">Purchases and boarding are accepted only in this physical building. Local bus, subway and streetcar routes are covered by the national pass.</div>`;
}

function restStopFloor(city: CityDefinition) {
  if (activeFloor === 'basement') return `<div class="service-grid"><div><b>Local tools</b><span>History, settings and offline help live here.</span></div><div><b>Personal vocabulary</b><span>Local-only import control.</span></div><div><b>Universal washroom</b><span>Barrier-free route, baby change table and quiet stall.</span></div></div>`;
  if (activeFloor === 'second') return `<div class="service-grid"><div><b>Catch Ball shop</b><span>Buy capture equipment at the physical counter.</span></div><div><b>Creature care</b><span>Food, grooming and travel supplies.</span></div><div><b>${escapeHtml(city.name)} shop</b><span>Local clothing and everyday goods.</span></div></div>${actionButton('Buy two Catch Balls · $16', 'catch-shop')}`;
  return `<div class="service-grid"><div><b>Creature clinic</b><span>Restore a tired team at the desk.</span></div><div><b>Battle licensing</b><span>Register paid arena work in person.</span></div><div><b>Transit information</b><span>Routes, transfers and accessibility help.</span></div><div><b>Public washroom</b><span>Universal washroom with a barrier-free route.</span></div></div>${actionButton('Heal and prepare team', 'heal-team')}${actionButton(`Walk to ${city.creature.habitat}`, 'encounter')}`;
}

function renderPanel() {
  updateChrome();
  if (mode === 'map') { panel.innerHTML = cityGuide(); drawScene(); return; }
  const place = activePlace();
  if (!place) { mode = 'map'; panel.innerHTML = cityGuide(); drawScene(); return; }
  const city = cities[place.cityId];
  if (mode === 'transit') { panel.innerHTML = routePanel(place); return; }
  if (mode === 'battle') {
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="battle-card"><div class="battle-icon">✦</div><div><strong>Paid exhibition contract</strong><span>Opponent: ${escapeHtml(city.battle.opponent)} · payout ${fmtMoney(city.battle.payout)}</span></div></div>${actionButton('Start licensed battle', 'start-battle')}<div class="microcopy">Battles are work: they earn money, but never gate a city.</div>`;
    return;
  }
  if (mode === 'minigame') {
    const best = saveState.cityProgress[city.id].minigameBest;
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="floor-tabs"><button class="floor active">Lobby</button><button class="floor">Room 01</button><button class="floor">Restaurant</button></div><div class="minigame-card"><span class="eyebrow">CITY EXCLUSIVE 01 / 10</span><h3>${escapeHtml(city.minigame.name)}</h3><p>${escapeHtml(city.minigame.description)} Three rounds, clear feedback and a local record.</p><strong>Best: ${best || '—'}</strong></div>${actionButton(`Play ${city.minigame.name}`, 'start-minigame')}${actionButton('Prize counter', 'prize-counter', 'secondary')}<div class="microcopy">Tokens and prizes are redeemed in person at this counter.</div>`;
    return;
  }
  if (place.kind === 'hub') {
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="floor-tabs"><button class="floor ${activeFloor === 'basement' ? 'active' : ''}" data-floor="basement">Basement</button><button class="floor ${activeFloor === 'ground' ? 'active' : ''}" data-floor="ground">Ground floor</button><button class="floor ${activeFloor === 'second' ? 'active' : ''}" data-floor="second">Second floor</button></div>${restStopFloor(city)}`;
    return;
  }
  if (place.kind === 'builder') {
    const progressState = saveState.cityProgress[city.id].construction;
    const progress = progressState.hired ? Math.min(progressState.phase, 10) : 0;
    panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="template"><span class="house-mini">⌂</span><div><strong>${escapeHtml(city.build.template)}</strong><span>2 floors · 3 rooms · accessible ground route</span><span>Template quote: ${fmtMoney(city.build.cost)} · crew: ${escapeHtml(city.build.crew)}</span></div></div>${progressState.hired ? `<div class="construction"><div class="progress-row"><strong>Construction in progress</strong><span>${progress}/10</span></div><div class="progress"><i style="width:${progress * 10}%"></i></div><p>Phase ${Math.min(progress + 1, 10)}: ${phases[Math.min(progress, 9)]}</p><span class="crew">Crew: ${escapeHtml(city.build.crew)} · arriving tomorrow at 08:00</span></div>${actionButton(progress >= 10 ? 'Accept handover' : 'Advance one workday', 'advance-build')}` : actionButton(`Hire crew and sign contract · ${fmtMoney(city.build.cost)}`, 'hire-crew')}<div class="microcopy">Construction workers and templates are hired only at this office.</div>`;
    return;
  }
  const placeCopy: Record<'store' | 'restaurant' | 'salon', { body: string; actions: string }> = {
    store: { body: `${place.name} is stocked and checkout is open. Pay at the physical counter.`, actions: `${actionButton('Buy locally grown lunch · $12', 'buy-lunch')}${actionButton('Buy household basket · $24', 'buy-basket')}` },
    restaurant: { body: `${place.name} is serving a local lunch, rice bowl and tea.`, actions: actionButton('Order lunch at counter · $18', 'buy-meal') },
    salon: { body: `${place.name} has a chair available for a timed service.`, actions: actionButton('Book a haircut · $30', 'buy-haircut') },
  };
  const detail = placeCopy[place.kind as keyof typeof placeCopy];
  panel.innerHTML = `${panelHeader(place.name, place.subtitle)}<div class="place-copy">${escapeHtml(detail.body)}</div>${detail.actions}<div class="microcopy">There is no remote checkout. Leave the place and the transaction ends.</div>`;
}

function openPlace(id: string) {
  const place = placeById.get(id);
  if (!place || place.cityId !== saveState.currentCity || saveState.pendingJourney) return;
  activePlaceId = id;
  activeFloor = 'ground';
  interactionToken = `${id}-${Date.now()}-${Math.random()}`;
  interactionExpiresAt = Date.now() + 15 * 60 * 1000;
  mode = place.kind === 'transit' ? 'transit' : place.kind === 'battle' ? 'battle' : place.kind === 'minigame' ? 'minigame' : 'place';
  saveState.activeBuilding = id;
  markDirty();
  renderPanel();
  drawScene();
  setMessage(`Entered ${place.name}.`);
}
function physicalContext(expected: string) { const valid = mode !== 'map' && activePlaceId === expected && interactionToken.length > 0 && Date.now() < interactionExpiresAt; if (!valid) setMessage('This transaction requires physical presence at the correct place.'); return valid; }
function spend(cost: number, onSuccess: () => void, expected = activePlaceId ?? '') { if (!physicalContext(expected)) return false; if (saveState.money < cost) { setMessage(`You need ${fmtMoney(cost - saveState.money)} more. Visit the Arena for licensed work.`); return false; } saveState.money -= cost; onSuccess(); updateChrome(); markDirty(); return true; }

function buyTicket(route: TransitRoute) {
  if (!physicalContext(route.originBuildingId)) return;
  const result = purchaseTicket(saveState, route, activePlaceId ?? '', crypto.randomUUID());
  if (!result.ok) {
    if (result.reason === 'insufficient-funds') setMessage(`You need ${fmtMoney(route.fare - saveState.money)} more for this ticket.`);
    else setMessage('This ticket must be purchased inside the correct departure building.');
    return;
  }
  updateChrome(); markDirty(); renderPanel();
  setMessage(`${route.mode === 'ferry' ? 'Ferry' : 'Flight'} ticket purchased for ${route.publicName}. Board from this building when ready.`);
}

function renderEncounter() {
  const city = currentCity();
  panel.innerHTML = `${panelHeader(city.creature.habitat, `A calm creature encounter in ${city.name}`)}<div class="encounter-card"><div class="creature-avatar" style="--creature:#${city.creature.color.toString(16).padStart(6, '0')}"></div><div><span class="eyebrow">WILDLINE SIGHTING</span><h3>${escapeHtml(city.creature.name)}</h3><p>${escapeHtml(city.creature.descriptor)}. It will leave if rushed.</p></div></div><div class="stability"><div><span>Stability window</span><strong>74%</strong></div><div class="progress"><i style="width:74%"></i></div></div><p class="microcopy">Catch Balls held: ${saveState.catchBalls}. Observe first, then throw from this habitat.</p>${actionButton('Observe temperament', 'observe-creature', 'secondary')}${actionButton('Throw a Catch Ball', 'throw-catch-ball')}`;
}

function finishJourney(route: TransitRoute, announce = true) {
  if (rideTimer) window.clearInterval(rideTimer);
  rideTimer = undefined;
  if (route.destinationCityId !== route.originCityId) saveState.currentCity = route.destinationCityId;
  saveState.pendingJourney = undefined;
  saveState.activeBuilding = undefined;
  activePlaceId = null;
  interactionToken = '';
  mode = 'map';
  markDirty();
  renderPanel();
  if (announce) setMessage(`Arrived in ${cities[route.destinationCityId].name} via ${route.publicName}.`);
  void persistSilently().catch(() => { dirty = true; autosave.textContent = 'Arrival save retry pending'; });
}

function animateRoute(route: TransitRoute, startedAt = Date.now()) {
  const rideStops = route.loop ? [...route.stops, route.stops[0]] : [...route.stops];
  panel.innerHTML = `<div class="panel-head"><span class="eyebrow">${escapeHtml(route.mode.toUpperCase())} IN MOTION</span><h2>${escapeHtml(route.publicName)}</h2><p>Journey in progress · the departure is already saved</p></div><div class="ride-card ${route.mode}"><div class="ride-track"><i id="ride-progress"></i></div><div class="ride-stops" id="ride-stops">${rideStops.map((stop, index) => `<span class="${index === 0 ? 'current' : ''}"><i></i>${escapeHtml(stop)}</span>`).join('')}</div><strong id="ride-status">Departing from ${escapeHtml(rideStops[0])}</strong></div><div class="microcopy">Closing the game during an intercity trip resumes or completes this journey safely on the next launch.</div>`;
  const tick = () => {
    const elapsed = Date.now() - startedAt;
    const ratio = Math.min(1, elapsed / route.durationMs);
    const index = Math.min(rideStops.length - 1, Math.floor(ratio * (rideStops.length - 1)));
    const progress = document.querySelector<HTMLElement>('#ride-progress');
    const stopEls = document.querySelectorAll<HTMLElement>('#ride-stops span');
    const line = document.querySelector<HTMLElement>('#ride-status');
    if (progress) progress.style.width = `${ratio * 100}%`;
    stopEls.forEach((element, stopIndex) => element.classList.toggle('current', stopIndex === index));
    if (line) line.textContent = ratio >= 1 ? `Arrived at ${rideStops.at(-1)}` : index === 0 ? `Departing from ${rideStops[0]}` : `Passing ${rideStops[index]}`;
    if (ratio >= 1) finishJourney(route);
  };
  tick();
  if (rideTimer) window.clearInterval(rideTimer);
  if (Date.now() - startedAt < route.durationMs) rideTimer = window.setInterval(tick, 120);
}

async function boardRoute(route: TransitRoute) {
  if (!physicalContext(route.originBuildingId) || route.originCityId !== saveState.currentCity) return;
  if (saveState.pendingJourney) { setMessage('Another intercity journey is already active.'); return; }
  if (route.ticketRequired) {
    const usedTicket = consumeRouteTicket(saveState, route.id);
    if (!usedTicket) { setMessage(`Buy a ${route.mode} ticket at this physical counter before boarding.`); return; }
    updateChrome();
    saveState.pendingJourney = { routeId: route.id, originCityId: route.originCityId, destinationCityId: route.destinationCityId, startedAt: new Date().toISOString(), durationMs: route.durationMs };
    try { await persistSilently(); }
    catch { saveState.pendingJourney = undefined; saveState.tickets.push(usedTicket); updateChrome(); setMessage('Boarding paused because the journey could not be saved. Your ticket remains available.'); return; }
  }
  animateRoute(route, saveState.pendingJourney ? Date.parse(saveState.pendingJourney.startedAt) : Date.now());
  setMessage(`${route.publicName} departed.`);
}

async function handleAction(action: string) {
  if (action === 'back') { if (saveState.pendingJourney) { setMessage('This intercity journey is already underway.'); return; } if (rideTimer) window.clearInterval(rideTimer); rideTimer = undefined; mode = 'map'; activePlaceId = null; interactionToken = ''; saveState.activeBuilding = undefined; renderPanel(); setMessage(`Back outside in ${currentCity().name}.`); return; }
  if (action.startsWith('buy-ticket:')) { const route = routeById.get(action.slice('buy-ticket:'.length)); if (route) buyTicket(route); return; }
  if (action.startsWith('board-route:')) { const route = routeById.get(action.slice('board-route:'.length)); if (route) await boardRoute(route); return; }
  const place = activePlace();
  const city = currentCity();
  if (!place) return;
  if (action === 'start-battle') { mode = 'battle'; panel.innerHTML = `${panelHeader('Exhibition underway', 'Read the field, then choose a stance')}<div class="battle-field"><div class="fighter you">YOU<small>${escapeHtml(city.creature.name)}</small></div><div class="vs">VS</div><div class="fighter rival">${escapeHtml(city.battle.opponent.toUpperCase())}<small>${escapeHtml(city.battle.creature)}</small></div></div>${actionButton('Swift stance', 'battle-swift')}${actionButton('Guard stance', 'battle-guard')}${actionButton('City combo', 'battle-combo')}`; setMessage('Battle started. Momentum belongs to the clearest read.'); return; }
  if (action.startsWith('battle-')) { spend(0, () => { saveState.money += city.battle.payout; mode = 'map'; activePlaceId = null; renderPanel(); setMessage(`Exhibition won — ${fmtMoney(city.battle.payout)} paid at the arena desk.`); }); return; }
  if (action === 'start-minigame') { if (!physicalContext(place.id)) return; mode = 'minigame'; panel.innerHTML = `${panelHeader(city.minigame.name, 'Round 1 of 3')}<div class="lantern-grid">${Array.from({ length: 9 }, (_, index) => `<button class="lantern" data-lantern="${index}" aria-label="Signal tile ${index + 1}">${index === 4 ? '✦' : ''}</button>`).join('')}</div><p class="microcopy">Light five signal tiles to complete this city’s local pattern.</p>`; setMessage(`${city.minigame.name}: trace the local signal.`); return; }
  if (action === 'encounter') { if (!physicalContext(place.id)) return; renderEncounter(); setMessage(`${city.creature.name} is moving through ${city.creature.habitat}.`); return; }
  if (action === 'observe-creature') { setMessage(`${city.creature.name} is curious but cautious. Its stability window is open.`); return; }
  if (action === 'throw-catch-ball') { if (!physicalContext(place.id)) return; if (saveState.catchBalls < 1) { setMessage('No Catch Balls remain. Visit this city’s Rest Stop second-floor counter.'); return; } saveState.catchBalls -= 1; if (!saveState.capturedCreatures.includes(city.creature.id)) saveState.capturedCreatures.push(city.creature.id); mode = 'map'; activePlaceId = null; renderPanel(); setMessage(`Capture complete — ${city.creature.name} joined your team.`); markDirty(); return; }
  if (action === 'prize-counter') { setMessage('The prize counter is open here. Tokens are redeemed only while physically inside.'); return; }
  if (action === 'advance-build') { if (!physicalContext(place.id)) return; const construction = saveState.cityProgress[city.id].construction; construction.phase = Math.min(10, construction.phase + 1); markDirty(); renderPanel(); setMessage(construction.phase >= 10 ? `${city.build.template} passed final inspection.` : `Crew completed ${phases[construction.phase - 1]}.`); return; }
  if (action === 'hire-crew') { spend(city.build.cost, () => { const construction = saveState.cityProgress[city.id].construction; construction.hired = true; construction.startedAt = new Date().toISOString(); construction.phase = 1; renderPanel(); setMessage(`Contract signed at ${city.build.office}. ${city.build.crew} start tomorrow.`); }, place.id); return; }
  if (action === 'buy-lunch') spend(12, () => setMessage('Lunch paid for and handed over at the grocer counter.'), place.id);
  if (action === 'buy-basket') spend(24, () => setMessage('Household basket paid for and handed over at checkout.'), place.id);
  if (action === 'buy-meal') spend(18, () => setMessage(`The ${city.name} meal is ready at your table.`), place.id);
  if (action === 'buy-haircut') spend(30, () => setMessage('Haircut complete. The stylist’s chair is free again.'), place.id);
  if (action === 'catch-shop') spend(16, () => { saveState.catchBalls += 2; setMessage('Two Catch Balls purchased at the second-floor counter.'); }, place.id);
  if (action === 'heal-team') { setMessage('Your team is rested at the ground-floor clinic.'); markDirty(); }
}

panel.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const placeId = target.closest<HTMLElement>('[data-place]')?.dataset.place;
  if (placeId) { openPlace(placeId); return; }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action) void handleAction(action);
  const floor = target.closest<HTMLButtonElement>('[data-floor]')?.dataset.floor;
  if (floor) { activeFloor = floor; renderPanel(); setMessage(`You are now on the ${floor} floor.`); }
  const signal = target.closest<HTMLButtonElement>('[data-lantern]');
  if (signal && !signal.classList.contains('lit')) {
    signal.classList.add('lit');
    if (document.querySelectorAll('.lantern.lit').length >= 5) {
      const progress = saveState.cityProgress[saveState.currentCity];
      progress.minigameBest = Math.max(progress.minigameBest, 5);
      saveState.money += 20;
      mode = 'map'; activePlaceId = null; markDirty(); renderPanel(); setMessage(`${currentCity().minigame.name} cleared — $20 paid at the centre counter.`);
    }
  }
});
document.querySelector('#save')?.addEventListener('click', () => void saveGame());
document.querySelector('#close')?.addEventListener('click', async () => { await saveGame(); await window.wildline.close(); });

function resizeCanvas() { const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
function project(x: number, z: number, width: number, height: number) { const rect = canvas.getBoundingClientRect(); const scale = Math.max(25, Math.min(40, rect.width / 24)); return { x: rect.width / 2 + (x - z) * scale, y: rect.height / 2 + (x + z) * scale * 0.5 - height * 0.5, w: width, h: height }; }
function drawScene() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const palettes = { harbourlight: ['#193846', '#0d2028', '#9e8c70'], gullhaven: ['#23473f', '#10261f', '#788b68'], asterfield: ['#303b61', '#131a32', '#a49a88'] } as const;
  const palette = palettes[saveState.currentCity];
  const gradient = ctx.createLinearGradient(0, 0, 0, rect.height); gradient.addColorStop(0, palette[0]); gradient.addColorStop(1, palette[1]); ctx.fillStyle = gradient; ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.save(); ctx.translate(rect.width / 2, rect.height / 2 + 100); ctx.rotate(0.08); ctx.fillStyle = palette[2]; ctx.fillRect(-390, -250, 780, 500); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
  for (let index = -11; index <= 11; index += 1) { const a = project(index, -10, 1, 1); const b = project(index, 10, 1, 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); const c = project(-10, index, 1, 1); const d = project(10, index, 1, 1); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
  cityPlaces(saveState.currentCity).forEach((place) => { const hub = place.kind === 'hub'; const p = project(place.x, place.z, hub ? 126 : 86, hub ? 124 : 72); const selected = activePlaceId === place.id; ctx.fillStyle = '#0008'; ctx.fillRect(p.x - p.w / 2 + 8, p.y - p.h + 12, p.w, p.h); ctx.fillStyle = `#${place.color.toString(16).padStart(6, '0')}`; ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h); ctx.fillStyle = selected ? '#fff' : '#12222a'; ctx.font = '700 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(place.name.split(' ')[0], p.x, p.y - p.h / 2); ctx.fillStyle = '#f6d791'; ctx.beginPath(); ctx.arc(p.x, p.y - p.h - 8, selected ? 6 : 4, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#d8e2dc'; ctx.font = '600 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Click a building or use the accessible city guide', 22, rect.height - 24);
}
canvas.addEventListener('click', (event) => { const rect = canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const found = cityPlaces(saveState.currentCity).find((place) => { const p = project(place.x, place.z, 100, 86); return Math.abs(x - p.x) < p.w / 2 && y > p.y - p.h - 20 && y < p.y + 10; }); if (found) openPlace(found.id); });
window.addEventListener('resize', () => { resizeCanvas(); drawScene(); });

async function boot() {
  saveState = migrateSave(await window.wildline.loadSave());
  if (saveState.pendingJourney) {
    const route = routeById.get(saveState.pendingJourney.routeId);
    if (route) {
      const startedAt = Date.parse(saveState.pendingJourney.startedAt);
      if (!Number.isFinite(startedAt) || Date.now() - startedAt >= saveState.pendingJourney.durationMs) finishJourney(route, false);
      else { activePlaceId = route.originBuildingId; mode = 'transit'; animateRoute(route, startedAt); setMessage(`Resumed ${route.publicName}.`); }
    } else saveState.pendingJourney = undefined;
  }
  updateChrome(); resizeCanvas(); drawScene(); if (!saveState.pendingJourney) renderPanel();
  autosaveTimer = window.setInterval(() => { if (dirty) void saveGame(); }, 10_000);
}
window.addEventListener('beforeunload', () => { if (dirty) void window.wildline.save(saveState); if (autosaveTimer) window.clearInterval(autosaveTimer); if (rideTimer) window.clearInterval(rideTimer); });
void boot();

const sceneContract = new THREE.Scene();
sceneContract.name = 'WildlineNationThreeCity2_5D';
