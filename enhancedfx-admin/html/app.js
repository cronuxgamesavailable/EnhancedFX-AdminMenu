const app = document.getElementById('app');
const content = document.getElementById('content');
const navigation = document.getElementById('navigation');
const pageTitle = document.getElementById('pageTitle');
const serverName = document.getElementById('serverName');
const modalLayer = document.getElementById('modal');
const toasts = document.getElementById('toasts');
const announcement = document.getElementById('announcement');
const dockButton = document.getElementById('dockButton');

const savedPreferences = (()=>{try{return JSON.parse(localStorage.getItem('enhancedfxAdminPreferences')||'{}')}catch{return {}}})();

const state = {
  open:false, page:'dashboard', data:{ players:[], reports:[], resources:[], bans:[], audit:[], stats:{}, permissions:{} },
  playerHistory:[], personal:{ noclip:false, god:false, invisible:false, superjump:false, stamina:false, infiniteAmmo:false, blips:false, ids:false }, filter:'',
  docked:Boolean(savedPreferences.docked), selectedItem:'', selectedWeapon:'', densityDraft:null,
  preferences:{ accent:savedPreferences.accent||'', clicks:savedPreferences.clicks!==false, opacity:Number(savedPreferences.opacity||100) }
};

const pages = [
  { id:'dashboard', label:'Dashboard', icon:'⌂', permission:'menu', group:'OVERVIEW' },
  { id:'players', label:'Players', icon:'♙', permission:'players', badge:()=>state.data.players.length },
  { id:'reports', label:'Reports', icon:'⚑', permission:'reports', badge:()=>state.data.reports.length },
  { id:'map', label:'Map', icon:'⌖', permission:'map' },
  { id:'personal', label:'Personal', icon:'◇', permission:'personal', group:'TOOLS' },
  { id:'items', label:'Items', icon:'◈', permission:'items' },
  { id:'weapons', label:'Weapons', icon:'⌁', permission:'weapons' },
  { id:'vehicle', label:'Vehicles', icon:'◆', permission:'vehicle' },
  { id:'density', label:'Density', icon:'◔', permission:'density' },
  { id:'world', label:'World', icon:'◉', permission:'world' },
  { id:'stats', label:'Server Stats', icon:'▥', permission:'stats', group:'SERVER' },
  { id:'resources', label:'Resources', icon:'▣', permission:'resources', group:'SERVER' },
  { id:'bans', label:'Bans', icon:'⊘', permission:'ban', badge:()=>state.data.bans.length },
  { id:'logs', label:'Audit Logs', icon:'≡', permission:'logs' },
  { id:'permissions', label:'Permissions', icon:'▱', permission:'permissions', group:'SYSTEM' },
  { id:'settings', label:'Settings', icon:'⚙', permission:'menu' }
];

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
const timeAgo = timestamp => {
  const seconds = Math.max(0, Math.floor(Date.now()/1000 - Number(timestamp || 0)));
  if (seconds < 60) return `${seconds}s ago`; if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds/3600)}h ago`; return `${Math.floor(seconds/86400)}d ago`;
};
const duration = seconds => { seconds=Number(seconds||0); const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60); return d?`${d}d ${h}h`:h?`${h}h ${m}m`:`${m}m`; };
const permitted = key => Boolean(state.data.permissions?.[key] || state.data.permissions?.menu && key==='menu');

async function post(endpoint, data={}) {
  try {
    const response = await fetch(`https://${GetParentResourceName()}/${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json; charset=UTF-8'}, body:JSON.stringify(data) });
    return await response.json();
  } catch { return {ok:false}; }
}
const action = (name, data={}) => post('action', { action:name, data });
const savePreferences=()=>localStorage.setItem('enhancedfxAdminPreferences',JSON.stringify({...state.preferences,docked:state.docked}));
const setAccent=value=>{if(!/^#[0-9a-f]{6}$/i.test(value))return;const rgb=[1,3,5].map(index=>parseInt(value.slice(index,index+2),16));document.documentElement.style.setProperty('--accent',value);document.documentElement.style.setProperty('--accent-rgb',rgb.join(','));state.preferences.accent=value;savePreferences()};
const setOpacity=value=>{const opacity=Math.max(55,Math.min(100,Number(value)||100));state.preferences.opacity=opacity;document.documentElement.style.setProperty('--panel-opacity',String(opacity/100));savePreferences()};
const applyPreferences=()=>{if(state.preferences.accent)setAccent(state.preferences.accent);setOpacity(state.preferences.opacity);app.classList.toggle('docked',state.docked);dockButton.textContent=state.docked?'‹':'›';dockButton.title=state.docked?'Expand menu':'Dock menu'};
const clickSound=()=>{if(!state.preferences.clicks)return;try{const context=new AudioContext(),osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=420;gain.gain.value=.018;osc.connect(gain);gain.connect(context.destination);osc.start();gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.045);osc.stop(context.currentTime+.05)}catch{}};

function toast(message, kind='info') {
  const node=document.createElement('div'); node.className=`toast ${kind}`; node.textContent=message; toasts.appendChild(node);
  setTimeout(()=>node.remove(), 4200);
}

function renderNavigation() {
  let html='', lastGroup='';
  for (const page of pages) {
    if (!permitted(page.permission)) continue;
    if (page.group && page.group!==lastGroup) { lastGroup=page.group; html+=`<div class="nav-group">${page.group}</div>`; }
    const badge=page.badge?.();
    html+=`<button class="nav-button ${state.page===page.id?'active':''}" data-page="${page.id}"><span class="nav-icon">${page.icon}</span>${page.label}${badge!==undefined?`<span class="nav-badge">${badge}</span>`:''}</button>`;
  }
  navigation.innerHTML=html;
}

function render() {
  const selected=pages.find(page=>page.id===state.page) || pages[0];
  if (!permitted(selected.permission)) state.page='dashboard';
  renderNavigation();
  pageTitle.textContent=(pages.find(page=>page.id===state.page)||pages[0]).label;
  serverName.textContent=state.data.serverName || 'FiveM Server';
  const renderers={dashboard:renderDashboard,players:renderPlayers,reports:renderReports,map:renderMap,personal:renderPersonal,items:renderItems,weapons:renderWeapons,vehicle:renderVehicle,density:renderDensity,world:renderWorld,stats:renderStats,resources:renderResources,bans:renderBans,logs:renderLogs,permissions:renderPermissions,settings:renderSettings};
  content.innerHTML=(renderers[state.page]||renderDashboard)();
  if(state.page==='map')updateLiveCoords();
  applyPreferences();
}

function statCard(label,value,detail,tone='accent') { return `<div class="stat-card ${tone}"><small>${label}</small><strong>${value}</strong><span>${detail}</span></div>`; }
function empty(icon,title,detail) { return `<div class="empty"><div><span>${icon}</span><strong>${title}</strong><small>${detail}</small></div></div>`; }

function renderDashboard() {
  const stats=state.data.stats||{};
  const online=Number(stats.online||0);
  if(state.playerHistory.length===0){for(let index=0;index<19;index++)state.playerHistory.push(Math.max(0,Math.round(online*.58+online*.42*(index/18)+Math.sin(index*1.7)*1.6)))}
  state.playerHistory.push(online); if(state.playerHistory.length>20)state.playerHistory.shift();
  const max=Math.max(4,...state.playerHistory); const points=state.playerHistory.map((value,index)=>`${index/(state.playerHistory.length-1)*100},${95-value/max*75}`).join(' ');
  const area=`0,100 ${points} 100,100`;
  const activity=(state.data.audit||[]).slice(0,6).map(item=>`<div class="activity"><div class="activity-icon">${escapeHtml((item.action||'?').slice(0,1))}</div><div><strong>${escapeHtml(item.action)}</strong><small>${escapeHtml(item.actor)} · ${escapeHtml(item.target||'Server')}</small></div><time>${timeAgo(item.time)}</time></div>`).join('');
  return `<div class="grid stats">
    ${statCard('PLAYERS ONLINE',stats.online||0,'live connections','cyan')}
    ${statCard('OPEN REPORTS',stats.reports||0,'awaiting staff','yellow')}
    ${statCard('ACTIVE BANS',stats.bans||0,'persistent records','accent')}
    ${statCard('SERVER UPTIME',duration(stats.uptime),'current session','green')}
  </div><div class="grid split">
    <section class="card"><div class="card-head"><div class="card-title"><i></i><strong>LIVE PLAYER ACTIVITY</strong><small>THIS SESSION</small></div><span class="status started">LIVE</span></div><div class="chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon class="area" points="${area}"></polygon><polyline class="line" points="${points}"></polyline></svg><span class="chart-label bottom">NOW · ${stats.online||0} ONLINE</span></div></section>
    <section class="card"><div class="card-head"><div class="card-title"><i></i><strong>RECENT ACTIVITY</strong></div><button class="mini" data-page="logs">VIEW ALL</button></div><div class="activity-list">${activity||empty('≡','No audit entries','Actions will appear here.')}</div></section>
  </div>`;
}

function renderPlayers() {
  const query=state.filter.toLowerCase();
  const players=(state.data.players||[]).filter(player=>!query||player.name.toLowerCase().includes(query)||String(player.id).includes(query));
  const rows=players.map(player=>{const pingClass=player.ping>150?'bad':player.ping>80?'medium':'';return `<tr><td><div class="player-name"><div class="avatar">${escapeHtml(player.name.slice(0,2).toUpperCase())}</div><div><strong>${escapeHtml(player.name)}</strong><br><small style="color:var(--dim)">Server ID ${player.id}</small></div></div></td><td><span class="ping ${pingClass}">${player.ping} ms</span></td><td>${player.health}</td><td>${player.armor}</td><td>${player.bucket}</td><td><div class="row-actions"><button class="mini" data-player="${player.id}">MANAGE</button></div></td></tr>`}).join('');
  return `<div class="toolbar"><div class="search"><input id="filterInput" value="${escapeHtml(state.filter)}" placeholder="Search players by name or server ID"></div><button class="button" data-refresh>REFRESH PLAYERS</button></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>PLAYER</th><th>PING</th><th>HEALTH</th><th>ARMOR</th><th>BUCKET</th><th style="text-align:right">ACTIONS</th></tr></thead><tbody>${rows}</tbody></table>${rows?'':empty('♙','No players found','Try a different search.')}</div>`;
}

function playerModal(id) {
  const player=(state.data.players||[]).find(item=>item.id===Number(id)); if(!player)return;
  const button=(label,cmd,cls='')=>`<button class="button ${cls}" data-player-action="${cmd}" data-target="${player.id}">${label}</button>`;
  showModal(`${escapeHtml(player.name)} · ID ${player.id}`, `<div class="section-note">Ping <b>${player.ping} ms</b> · Health <b>${player.health}</b> · Armor <b>${player.armor}</b> · Routing bucket <b>${player.bucket}</b><br>CFX.re ID <b>${escapeHtml(player.cfxId||'not available')}</b> ${player.cfxId?`<button class="copy-chip" data-copy="${escapeHtml(player.cfxId)}">COPY</button>`:''}</div><div class="action-grid compact-actions">
    ${permitted('teleport')?button('GOTO','goto')+button('BRING','bring'):''}
    ${permitted('spectate')?button('SPECTATE','spectate'):''}
    ${permitted('players')?button(player.frozen?'UNFREEZE':'FREEZE','freeze')+button(player.cuffed?'UNCUFF':'CUFF','cuff')+button('HEAL','heal','good')+button('ARMOR','armor','good')+button('REVIVE','revive','good')+button('CLEAR TASKS','clearTasks')+button('DROP FROM SKY','drop')+button('KILL','kill','danger')+button('SET BUCKET','bucket')+(state.data.features?.clothing?button('CLOTHING','clothing'):''):''}
    ${permitted('players')?button('MESSAGE','message'):''}${permitted('warn')?button('WARN','warn'):''}${permitted('kick')?button('KICK','kick','danger'):''}${permitted('ban')?button('BAN','ban','danger'):''}
  </div>`, false);
}

function playerOptions(selected='') {
  const players=state.data.players||[];
  return players.map(player=>`<option value="${player.id}" ${String(player.id)===String(selected)?'selected':''}>${escapeHtml(player.name)} · ID ${player.id}</option>`).join('');
}

function renderMap() {
  return `<div class="grid split"><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>QUICK TELEPORT</strong></div></div><div class="action-card map-action" data-map="waypoint"><div class="glyph">⌖</div><strong>TELEPORT TO WAYPOINT</strong><small>Place a waypoint on the map, then move there safely.</small></div></section><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>COORDINATES</strong></div></div><div class="form-row"><div class="field"><label>X</label><input id="coordX" type="number" step="0.01" placeholder="215.76"></div><div class="field"><label>Y</label><input id="coordY" type="number" step="0.01" placeholder="-810.12"></div></div><div class="field"><label>Z</label><input id="coordZ" type="number" step="0.01" placeholder="30.73"></div><button class="button primary" data-map="coords">TELEPORT TO COORDINATES</button><div class="live-coords"><div class="toolbar-label">YOUR CURRENT POSITION</div><div class="live-grid"><div><span>X</span><strong id="liveX">-</strong></div><div><span>Y</span><strong id="liveY">-</strong></div><div><span>Z</span><strong id="liveZ">-</strong></div><div><span>H</span><strong id="liveH">-</strong></div></div><div class="button-row"><button class="button" id="liveCopy3" data-copy="">COPY VECTOR3</button><button class="button" id="liveCopy4" data-copy="">COPY VECTOR4</button></div><button class="button wide spaced" data-map="fillcoords">USE MY POSITION IN FIELDS</button></div></section></div>`;
}

function renderItems() {
  const catalog=state.data.catalogs?.items||[];
  if(!state.selectedItem&&catalog[0])state.selectedItem=catalog[0].name;
  const selected=catalog.find(item=>item.name===state.selectedItem)||catalog[0];
  const available=state.data.features?.framework!=='standalone';
  const list=catalog.map(item=>`<button class="catalog-item ${selected?.name===item.name?'selected':''}" data-item-select="${escapeHtml(item.name)}"><span class="catalog-icon">${escapeHtml(item.label.slice(0,1).toUpperCase())}</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.name)}</small></span></button>`).join('');
  return `<div class="section-note">Inventory adapter: <b>${escapeHtml(state.data.features?.framework||'standalone')}</b>. ${available?'Item actions use your running inventory framework.':'Configure ox_inventory, QBCore, or ESX before item actions can change inventories.'}</div><div class="catalog-layout"><section class="card catalog-panel"><div class="card-head"><div class="card-title"><i></i><strong>ITEM CATALOG</strong><small>${catalog.length} ITEMS</small></div></div><div class="catalog-list">${list||empty('◈','No items configured','Add allowed items in config.lua.')}</div></section><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>GIVE ITEM</strong></div></div>${selected?`<div class="selected-item"><span class="catalog-icon">${escapeHtml(selected.label.slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(selected.label)}</strong><small>${escapeHtml(selected.name)}</small></div></div><div class="field"><label>PLAYER</label><select id="itemPlayer">${playerOptions()}</select></div><div class="field"><label>AMOUNT</label><input id="itemAmount" type="number" min="1" max="1000" value="1"></div><button class="button primary wide" data-item-give ${available?'':'disabled'}>GIVE ITEM</button><button class="button danger wide spaced" data-item-wipe ${available?'':'disabled'}>WIPE SELECTED INVENTORY</button>`:empty('◈','No item selected','Configure the item catalog first.')}</section></div>`;
}

function renderWeapons() {
  const catalog=state.data.catalogs?.weapons||[];
  if(!state.selectedWeapon&&catalog[0])state.selectedWeapon=catalog[0].name;
  const selected=catalog.find(item=>item.name===state.selectedWeapon)||catalog[0];
  const list=catalog.map(item=>`<button class="catalog-item ${selected?.name===item.name?'selected':''}" data-weapon-select="${escapeHtml(item.name)}"><span class="catalog-icon weapon">⌁</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.name)}</small></span></button>`).join('');
  return `<div class="catalog-layout"><section class="card catalog-panel"><div class="card-head"><div class="card-title"><i></i><strong>WEAPON CATALOG</strong><small>${catalog.length} ALLOWED</small></div></div><div class="catalog-list">${list||empty('⌁','No weapons configured','Add allowed weapons in config.lua.')}</div></section><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>WEAPON CONTROL</strong></div></div>${selected?`<div class="selected-item"><span class="catalog-icon weapon">⌁</span><div><strong>${escapeHtml(selected.label)}</strong><small>${escapeHtml(selected.name)}</small></div></div><div class="field"><label>PLAYER</label><select id="weaponPlayer">${playerOptions()}</select></div><div class="field"><label>AMMO</label><input id="weaponAmmo" type="number" min="0" max="9999" value="120"></div><div class="button-row"><button class="button primary" data-weapon-action="give">GIVE</button><button class="button" data-weapon-action="remove">REMOVE</button></div><button class="button danger wide spaced" data-weapon-action="removeAll">REMOVE ALL WEAPONS</button>`:empty('⌁','No weapon selected','Configure the weapon catalog first.')}</section></div>`;
}

function renderDensity() {
  if(!state.densityDraft)state.densityDraft={...(state.data.density||{})};
  const definitions=[['traffic','TRAFFIC','Moving vehicles on roads'],['parked','PARKED VEHICLES','Cars parked around the map'],['random','RANDOM VEHICLES','Ambient vehicle spawns'],['pedestrians','PEDESTRIANS','People walking the streets'],['scenarios','SCENARIO PEDS','Scripted ambient activities']];
  const controls=definitions.map(([key,label,detail])=>{const value=Math.round(Number(state.densityDraft[key]??1)*100);return `<div class="density-control"><div><strong>${label}</strong><small>${detail}</small></div><output id="density-${key}">${value}%</output><input data-density="${key}" type="range" min="0" max="100" value="${value}"></div>`}).join('');
  return `<div class="toolbar density-presets"><span class="toolbar-label">PRESETS</span><button class="mini" data-density-preset="vanilla">VANILLA</button><button class="mini" data-density-preset="balanced">BALANCED</button><button class="mini" data-density-preset="low">LOW</button><button class="mini" data-density-preset="empty">EMPTY</button><button class="button primary push-right" data-density-apply>APPLY SERVER-WIDE</button></div><div class="section-note">Density changes are saved and applied to every connected player. New players receive the current values automatically.</div><div class="density-grid">${controls}</div>`;
}

function renderStats() {
  const stats=state.data.stats||{};
  return `<div class="grid stats">${statCard('PLAYERS',stats.online||0,`average ping ${stats.averagePing||0} ms`,'cyan')}${statCard('STARTED RESOURCES',stats.startedResources||0,`${stats.resources||0} installed`,'green')}${statCard('ONESYNC',String(stats.oneSync||'off').toUpperCase(),'network mode','accent')}${statCard('UPTIME',duration(stats.uptime),'current server session','yellow')}</div><div class="grid split"><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>SERVER HEALTH</strong></div><span class="status started">ONLINE</span></div><div class="metric-list"><div><span>Open reports</span><strong>${stats.reports||0}</strong></div><div><span>Active bans</span><strong>${stats.bans||0}</strong></div><div><span>Average ping</span><strong>${stats.averagePing||0} ms</strong></div><div><span>OneSync</span><strong>${escapeHtml(stats.oneSync||'off')}</strong></div></div></section><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>ACTIVE ADAPTERS</strong></div></div><div class="selected-item"><span class="catalog-icon">F</span><div><strong>${escapeHtml((state.data.features?.framework||'standalone').toUpperCase())}</strong><small>inventory framework</small></div></div><div class="selected-item"><span class="catalog-icon">C</span><div><strong>${state.data.features?.clothing?'CONNECTED':'NOT CONFIGURED'}</strong><small>clothing integration</small></div></div></section></div>`;
}

function renderPermissions() {
  const objects=state.data.permissionObjects||{};
  const rows=Object.entries(objects).sort(([a],[b])=>a.localeCompare(b)).map(([key,object])=>`<tr><td><strong>${escapeHtml(key.toUpperCase())}</strong></td><td>${escapeHtml(object)}</td><td><span class="status ${state.data.permissions?.[key]?'started':'stopped'}">${state.data.permissions?.[key]?'GRANTED':'DENIED'}</span></td></tr>`).join('');
  return `<div class="section-note">This is a read-only view of your current ACE access. Edit permissions in server.cfg, then reconnect or refresh the resource.</div><div class="table-wrap"><table class="table"><thead><tr><th>CAPABILITY</th><th>ACE OBJECT</th><th>YOUR ACCESS</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderSettings() {
  const accent=state.preferences.accent||state.data.accent||'#ff5a36';
  const colors=['#ff5a36','#00d8b2','#2f9bff','#8f6bff','#ff5ca8','#f6bd4f','#62d98f','#e7edf5'];
  return `<div class="grid split"><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>APPEARANCE</strong><small>PERSONAL</small></div><button class="mini" data-settings-reset>RESET</button></div><div class="field"><label>ACCENT COLOR</label><div class="color-editor"><input id="accentPicker" type="color" value="${escapeHtml(accent)}"><input id="accentHex" value="${escapeHtml(accent)}" maxlength="7"></div></div><div class="swatches">${colors.map(color=>`<button data-accent="${color}" style="--swatch:${color}" class="${accent.toLowerCase()===color?'selected':''}" title="${color}"></button>`).join('')}</div><div class="field range-field"><label>MENU OPACITY <output id="opacityValue">${state.preferences.opacity}%</output></label><input id="opacityRange" type="range" min="55" max="100" value="${state.preferences.opacity}"></div><div class="preview-strip"><span>ACTIVE</span><button>PRIMARY</button><button>HOVER PREVIEW</button></div></section><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>INTERFACE</strong></div></div><button class="setting-row" data-setting="clicks"><span class="catalog-icon">♪</span><span><strong>INTERFACE CLICKS</strong><small>Play a quiet cue when using menu controls.</small></span><b>${state.preferences.clicks?'ON':'OFF'}</b></button><button class="setting-row" data-setting="dock"><span class="catalog-icon">›</span><span><strong>DOCKED MODE</strong><small>Collapse the menu to the right so the game stays visible.</small></span><b>${state.docked?'ON':'OFF'}</b></button><div class="section-note settings-note">Preferences are saved only for you in this FiveM client.</div></section></div>`;
}

function renderReports() {
  const items=(state.data.reports||[]).map(report=>`<div class="report"><div class="report-number">#${report.id}</div><div><strong>${escapeHtml(report.player)} · ID ${report.playerId}</strong><p>${escapeHtml(report.message)}</p><small>${timeAgo(report.created)}${report.claimedBy?` · Claimed by ${escapeHtml(report.claimedBy)}`:''}</small></div><div class="report-actions"><button class="mini" data-report-claim="${report.id}">CLAIM</button><button class="mini" data-report-player="${report.playerId}">PLAYER</button><button class="mini" data-report-resolve="${report.id}">RESOLVE</button></div></div>`).join('');
  return `<div class="card-head"><div class="card-title"><i></i><strong>PLAYER REPORTS</strong><small>${state.data.reports?.length||0} OPEN</small></div><button class="button" data-refresh>REFRESH</button></div>${items||empty('⚑','No open reports','New player reports will appear here live.')}`;
}

function renderPersonal() {
  const actions=[['noclip','✦','NOCLIP','Free-flight movement with speed controls.'],['god','♥','GOD MODE','Prevent damage while enabled.'],['invisible','◌','INVISIBILITY','Hide your player entity.'],['superjump','↑','SUPER JUMP','Increase jump height every frame.'],['stamina','∞','INFINITE STAMINA','Run continuously without stamina drain.'],['infiniteAmmo','⌁','INFINITE AMMO','Keep the current weapon magazine full.'],['blips','⌖','PLAYER BLIPS','Show online players on the pause map.'],['ids','#','PLAYER IDS','Show nearby names and server IDs.']];
  return `<div class="section-note">Personal modes apply only to you. Noclip controls: W/A/S/D to move, Space/Q vertically, Shift for fast and Ctrl for precision.</div><div class="action-grid">${actions.map(([mode,glyph,label,detail])=>`<div class="action-card ${state.personal[mode]?'enabled':''}" data-personal="${mode}"><div class="glyph">${glyph}</div><strong>${label}</strong><small>${detail}</small></div>`).join('')}</div>`;
}

function renderVehicle() {
  return `<div class="grid split"><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>SPAWN VEHICLE</strong></div></div><div class="field"><label>VEHICLE MODEL</label><input id="vehicleModel" placeholder="adder, police3, sultanrs..."></div><button class="button primary wide" data-vehicle="spawn">SPAWN & ENTER</button><div class="section-note" style="margin-top:15px;margin-bottom:0">Models are validated by the game before spawning. Invalid model names are rejected locally.</div><div class="field vehicle-color"><label>PRIMARY + SECONDARY COLOR</label><div class="color-editor"><input id="vehicleColor" type="color" value="#ff5a36"><button class="button" data-vehicle="color">APPLY COLOR</button></div></div></section><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>CURRENT VEHICLE</strong></div></div><div class="action-grid" style="grid-template-columns:1fr 1fr"><div class="action-card" data-vehicle="repair"><div class="glyph">✚</div><strong>REPAIR</strong><small>Fix body and engine.</small></div><div class="action-card" data-vehicle="clean"><div class="glyph">✧</div><strong>CLEAN</strong><small>Remove dirt and decals.</small></div><div class="action-card" data-vehicle="flip"><div class="glyph">↻</div><strong>FLIP</strong><small>Place it upright.</small></div><div class="action-card" data-vehicle="engine"><div class="glyph">◉</div><strong>ENGINE</strong><small>Toggle the engine state.</small></div><div class="action-card" data-vehicle="maxTune"><div class="glyph">↑</div><strong>MAX TUNE</strong><small>Install performance upgrades.</small></div><div class="action-card danger-card" data-vehicle="delete"><div class="glyph">×</div><strong>DELETE</strong><small>Remove the current vehicle.</small></div></div></section></div>`;
}

function renderWorld() {
  const weather=['EXTRASUNNY','CLEAR','CLOUDS','OVERCAST','RAIN','THUNDER','FOGGY','SMOG','SNOW','XMAS','HALLOWEEN'];
  return `<div class="grid split"><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>WORLD CONTROL</strong></div></div><div class="field"><label>WEATHER</label><select id="weatherSelect">${weather.map(value=>`<option>${value}</option>`).join('')}</select></div><button class="button primary" data-world="weather">APPLY WEATHER</button><div class="form-row" style="margin-top:18px"><div class="field"><label>HOUR</label><input id="timeHour" type="number" min="0" max="23" value="12"></div><div class="field"><label>MINUTE</label><input id="timeMinute" type="number" min="0" max="59" value="0"></div></div><button class="button" data-world="time">SET SERVER TIME</button></section><section class="card"><div class="card-head"><div class="card-title"><i></i><strong>ANNOUNCEMENT</strong></div></div><div class="field"><label>MESSAGE TO ALL PLAYERS</label><textarea id="announceMessage" maxlength="180" placeholder="Write a concise server announcement..."></textarea></div><button class="button primary" data-world="announce">SEND ANNOUNCEMENT</button></section></div>`;
}

function renderResources() {
  const query=state.filter.toLowerCase();
  const rows=(state.data.resources||[]).filter(item=>!query||item.name.toLowerCase().includes(query)).map(item=>`<tr><td><strong>${escapeHtml(item.name)}</strong>${item.protected?' <small style="color:var(--yellow)">PROTECTED</small>':''}</td><td><span class="status ${escapeHtml(item.state)}">${escapeHtml(item.state).toUpperCase()}</span></td><td><div class="row-actions"><button class="mini" data-resource="${escapeHtml(item.name)}" data-resource-action="start" ${item.protected?'disabled':''}>START</button><button class="mini" data-resource="${escapeHtml(item.name)}" data-resource-action="restart" ${item.protected?'disabled':''}>RESTART</button><button class="mini" data-resource="${escapeHtml(item.name)}" data-resource-action="stop" ${item.protected?'disabled':''}>STOP</button></div></td></tr>`).join('');
  return `<div class="toolbar"><div class="search"><input id="filterInput" value="${escapeHtml(state.filter)}" placeholder="Search resources"></div><button class="button" data-refresh>REFRESH</button></div><div class="section-note">Core resources and EnhancedFX Admin are protected from stop/restart actions.</div><div class="table-wrap"><table class="table"><thead><tr><th>RESOURCE</th><th>STATE</th><th style="text-align:right">CONTROL</th></tr></thead><tbody>${rows}</tbody></table>${rows?'':empty('▣','No resources found','Try a different search.')}</div>`;
}

function renderBans() {
  const rows=(state.data.bans||[]).map(ban=>`<tr><td><strong>${escapeHtml(ban.player||'Unknown')}</strong><br><small style="color:var(--dim)">${escapeHtml(ban.id)}</small></td><td>${escapeHtml(ban.reason)}</td><td>${ban.expires===0?'PERMANENT':new Date(ban.expires*1000).toLocaleString()}</td><td>${escapeHtml(ban.admin)}</td><td><div class="row-actions"><button class="mini" data-unban="${escapeHtml(ban.id)}">UNBAN</button></div></td></tr>`).join('');
  return `<div class="card-head"><div class="card-title"><i></i><strong>ACTIVE BANS</strong><small>${state.data.bans?.length||0} RECORDS</small></div><button class="button" data-refresh>REFRESH</button></div><div class="table-wrap"><table class="table"><thead><tr><th>PLAYER / BAN ID</th><th>REASON</th><th>EXPIRES</th><th>ADMIN</th><th></th></tr></thead><tbody>${rows}</tbody></table>${rows?'':empty('⊘','No active bans','Persistent bans will appear here.')}</div>`;
}

function renderLogs() {
  const query=state.filter.toLowerCase();
  const rows=(state.data.audit||[]).filter(item=>!query||`${item.action} ${item.actor} ${item.target} ${item.detail}`.toLowerCase().includes(query)).map(item=>`<tr><td>${new Date(item.time*1000).toLocaleString()}</td><td><strong>${escapeHtml(item.action)}</strong></td><td>${escapeHtml(item.actor)}</td><td>${escapeHtml(item.target||'')}</td><td>${escapeHtml(item.detail||'')}</td></tr>`).join('');
  return `<div class="toolbar"><div class="search"><input id="filterInput" value="${escapeHtml(state.filter)}" placeholder="Search actions, staff, targets or details"></div><button class="button" data-refresh>REFRESH</button></div><div class="table-wrap"><table class="table"><thead><tr><th>TIME</th><th>ACTION</th><th>STAFF</th><th>TARGET</th><th>DETAIL</th></tr></thead><tbody>${rows}</tbody></table>${rows?'':empty('≡','No audit entries','Privileged actions are recorded automatically.')}</div>`;
}

function showModal(title, body, footer=true) {
  modalLayer.innerHTML=`<div class="modal"><div class="modal-head"><strong>${title}</strong><button data-modal-close>×</button></div><div class="modal-body">${body}</div>${footer?'<div class="modal-foot"><button class="button" data-modal-close>CANCEL</button><button class="button primary" id="modalConfirm">CONFIRM</button></div>':''}</div>`;
  modalLayer.classList.add('open'); modalLayer.setAttribute('aria-hidden','false');
}
function closeModal(){modalLayer.classList.remove('open');modalLayer.setAttribute('aria-hidden','true');modalLayer.innerHTML='';}
function reasonModal(title, confirmLabel, callback, includeHours=false) {
  const isMessage=title.startsWith('MESSAGE');
  showModal(title, `${includeHours?'<div class="field"><label>DURATION IN HOURS · USE 0 FOR PERMANENT</label><input id="modalHours" type="number" min="0" max="87600" value="24"></div>':''}<div class="field"><label>${isMessage?'MESSAGE':'REASON'}</label><textarea id="modalReason" maxlength="180" placeholder="${isMessage?'Write a private message to this player...':'Enter a clear staff reason...'}"></textarea></div>`);
  const confirm=document.getElementById('modalConfirm'); confirm.textContent=confirmLabel;
  confirm.onclick=()=>{const reason=document.getElementById('modalReason').value.trim();const hours=includeHours?Number(document.getElementById('modalHours').value):undefined;callback(reason,hours);closeModal();};
}

function valueModal(title, label, value, callback, type='number') {
  showModal(title, `<div class="field"><label>${label}</label><input id="modalValue" type="${type}" value="${escapeHtml(value)}"></div>`);
  document.getElementById('modalConfirm').onclick=()=>{callback(document.getElementById('modalValue').value);closeModal()};
}

async function copyText(value) {
  try { await navigator.clipboard.writeText(value); toast('Copied to clipboard.','success'); }
  catch { const area=document.createElement('textarea');area.value=value;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();toast('Copied to clipboard.','success'); }
}

document.addEventListener('click', event => {
  const button=event.target.closest('[data-page],[data-refresh],[data-player],[data-player-action],[data-personal],[data-vehicle],[data-world],[data-map],[data-item-select],[data-item-give],[data-item-wipe],[data-weapon-select],[data-weapon-action],[data-density-preset],[data-density-apply],[data-report-claim],[data-report-resolve],[data-report-player],[data-resource-action],[data-unban],[data-accent],[data-setting],[data-settings-reset],[data-copy],[data-modal-close]'); if(!button)return;
  clickSound();
  if(button.dataset.page){state.page=button.dataset.page;state.filter='';render();return}
  if(button.hasAttribute('data-refresh')){post('refresh');return}
  if(button.dataset.copy){copyText(button.dataset.copy);return}
  if(button.dataset.player){playerModal(button.dataset.player);return}
  if(button.dataset.reportPlayer){playerModal(button.dataset.reportPlayer);return}
  if(button.dataset.playerAction){
    const target=Number(button.dataset.target),mode=button.dataset.playerAction;
    if(['message','warn','kick','ban'].includes(mode)){reasonModal(`${mode.toUpperCase()} PLAYER`,mode.toUpperCase(),(reason,hours)=>action(`player.${mode}`,{target,reason,hours}),mode==='ban');return}
    if(mode==='bucket'){valueModal('SET ROUTING BUCKET','BUCKET · 0 RETURNS TO THE MAIN WORLD',0,bucket=>action('player.bucket',{target,bucket:Number(bucket)}));return}
    action(`player.${mode}`,{target}); if(!['spectate'].includes(mode))closeModal(); return;
  }
  if(button.dataset.personal){action('personal.toggle',{mode:button.dataset.personal});return}
  if(button.dataset.vehicle){action('vehicle.action',{mode:button.dataset.vehicle,model:document.getElementById('vehicleModel')?.value.trim()||'',color:document.getElementById('vehicleColor')?.value||''});return}
  if(button.dataset.map==='waypoint'){action('map.waypoint');return}
  if(button.dataset.map==='fillcoords'){const c=state.coords;if(c){document.getElementById('coordX').value=c.x.toFixed(2);document.getElementById('coordY').value=c.y.toFixed(2);document.getElementById('coordZ').value=c.z.toFixed(2)}return}
  if(button.dataset.map==='coords'){action('map.coords',{x:Number(document.getElementById('coordX').value),y:Number(document.getElementById('coordY').value),z:Number(document.getElementById('coordZ').value)});return}
  if(button.dataset.itemSelect){state.selectedItem=button.dataset.itemSelect;render();return}
  if(button.hasAttribute('data-item-give')){action('item.give',{target:Number(document.getElementById('itemPlayer')?.value),item:state.selectedItem,amount:Number(document.getElementById('itemAmount')?.value||1)});return}
  if(button.hasAttribute('data-item-wipe')){const target=Number(document.getElementById('itemPlayer')?.value);reasonModal('WIPE INVENTORY','WIPE',()=>action('item.wipe',{target}));return}
  if(button.dataset.weaponSelect){state.selectedWeapon=button.dataset.weaponSelect;render();return}
  if(button.dataset.weaponAction){action('weapon.action',{target:Number(document.getElementById('weaponPlayer')?.value),weapon:state.selectedWeapon,ammo:Number(document.getElementById('weaponAmmo')?.value||120),mode:button.dataset.weaponAction});return}
  if(button.dataset.densityPreset){const presets={vanilla:[1,1,1,1,1],balanced:[.65,.55,.6,.7,.65],low:[.3,.25,.25,.35,.3],empty:[0,0,0,0,0]},values=presets[button.dataset.densityPreset],keys=['traffic','parked','random','pedestrians','scenarios'];state.densityDraft=Object.fromEntries(keys.map((key,index)=>[key,values[index]]));render();return}
  if(button.hasAttribute('data-density-apply')){action('density.apply',{values:state.densityDraft||state.data.density||{}});return}
  if(button.dataset.world==='weather'){action('world.weather',{weather:document.getElementById('weatherSelect').value});return}
  if(button.dataset.world==='time'){action('world.time',{hour:Number(document.getElementById('timeHour').value),minute:Number(document.getElementById('timeMinute').value)});return}
  if(button.dataset.world==='announce'){const message=document.getElementById('announceMessage').value.trim();if(message)action('world.announce',{message});return}
  if(button.dataset.reportClaim){action('report.claim',{id:Number(button.dataset.reportClaim)});return}
  if(button.dataset.reportResolve){reasonModal('RESOLVE REPORT','RESOLVE',note=>action('report.resolve',{id:Number(button.dataset.reportResolve),note}));return}
  if(button.dataset.resourceAction){action('resource.action',{name:button.dataset.resource,mode:button.dataset.resourceAction});return}
  if(button.dataset.unban){reasonModal('REMOVE BAN','UNBAN',()=>action('ban.remove',{id:button.dataset.unban}));return}
  if(button.dataset.accent){setAccent(button.dataset.accent);render();return}
  if(button.dataset.setting==='clicks'){state.preferences.clicks=!state.preferences.clicks;savePreferences();render();return}
  if(button.dataset.setting==='dock'){state.docked=!state.docked;savePreferences();post('dock',{enabled:state.docked});render();return}
  if(button.hasAttribute('data-settings-reset')){state.preferences={accent:state.data.accent||'#ff5a36',clicks:true,opacity:100};state.docked=false;savePreferences();post('dock',{enabled:false});render();return}
  if(button.hasAttribute('data-modal-close'))closeModal();
});

document.addEventListener('input', event=>{
  if(event.target.id==='filterInput'){state.filter=event.target.value;const caret=event.target.selectionStart;render();const input=document.getElementById('filterInput');input?.focus();input?.setSelectionRange(caret,caret);return}
  if(event.target.dataset.density){const key=event.target.dataset.density;state.densityDraft=state.densityDraft||{...(state.data.density||{})};state.densityDraft[key]=Number(event.target.value)/100;const output=document.getElementById(`density-${key}`);if(output)output.textContent=`${event.target.value}%`;return}
  if(event.target.id==='accentPicker'){setAccent(event.target.value);const hex=document.getElementById('accentHex');if(hex)hex.value=event.target.value;return}
  if(event.target.id==='accentHex'&&/^#[0-9a-f]{6}$/i.test(event.target.value)){setAccent(event.target.value);const picker=document.getElementById('accentPicker');if(picker)picker.value=event.target.value;return}
  if(event.target.id==='opacityRange'){setOpacity(event.target.value);const output=document.getElementById('opacityValue');if(output)output.textContent=`${state.preferences.opacity}%`}
});
document.getElementById('refreshButton').onclick=()=>post('refresh');
document.getElementById('closeButton').onclick=()=>post('close');
document.getElementById('dockButton').onclick=()=>{state.docked=!state.docked;savePreferences();post('dock',{enabled:state.docked});render()};
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(modalLayer.classList.contains('open'))closeModal();else post('close')}});

function updateLiveCoords(){
  const c=state.coords;if(!c)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  set('liveX',c.x.toFixed(2));set('liveY',c.y.toFixed(2));set('liveZ',c.z.toFixed(2));set('liveH',c.h.toFixed(2));
  const v3=document.getElementById('liveCopy3'),v4=document.getElementById('liveCopy4');
  if(v3)v3.dataset.copy=`vec3(${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`;
  if(v4)v4.dataset.copy=`vec4(${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)}, ${c.h.toFixed(2)})`;
}

window.addEventListener('message', event => {
  const message=event.data||{};
  if(message.type==='open'){
    state.open=true;state.data=message.payload||state.data;state.page='dashboard';state.filter='';state.playerHistory=[];
    state.densityDraft=null;if(!state.preferences.accent&&state.data.accent)setAccent(state.data.accent);applyPreferences();post('dock',{enabled:state.docked});
    app.classList.add('open');app.setAttribute('aria-hidden','false');render();
  } else if(message.type==='close'){
    state.open=false;app.classList.remove('open');app.setAttribute('aria-hidden','true');closeModal();
  } else if(message.type==='coords'){
    state.coords=message.coords;if(state.open&&state.page==='map')updateLiveCoords();
  } else if(message.type==='snapshot'){
    state.data=message.payload||state.data;if(state.page==='density')state.densityDraft={...(state.data.density||{})};if(state.open)render();
  } else if(message.type==='toast') toast(message.message,message.kind);
  else if(message.type==='personalState'){state.personal={...state.personal,...message.state};if(state.open&&state.page==='personal')render()}
  else if(message.type==='announcement'){
    announcement.innerHTML=`<strong>SERVER ANNOUNCEMENT · ${escapeHtml(message.author||'STAFF')}</strong><p>${escapeHtml(message.message)}</p>`;
    announcement.classList.add('show');setTimeout(()=>announcement.classList.remove('show'),8000);
  }
});

if (location.search.includes('preview=1')) {
  const names=['Ryder Lee','Mia Chen','Jordan Banks','Nora Diaz','Eli Stone','Avery King'];
  const permissionKeys=['menu','players','kick','ban','warn','teleport','spectate','personal','vehicle','items','weapons','density','map','stats','permissions','world','reports','resources','logs'];
  const permissions=Object.fromEntries(permissionKeys.map(key=>[key,true]));
  const permissionObjects=Object.fromEntries(permissionKeys.map(key=>[key,`enhancedfx.${key}`]));
  window.dispatchEvent(new MessageEvent('message',{data:{type:'open',payload:{brand:'ENHANCEDFX ADMIN',accent:'#ff5a36',serverName:'EnhancedFX Roleplay',permissions,permissionObjects,features:{framework:'ox',clothing:true},density:{traffic:.65,parked:.55,random:.6,pedestrians:.7,scenarios:.65},catalogs:{items:[{name:'water',label:'Water'},{name:'bread',label:'Bread'},{name:'bandage',label:'Bandage'},{name:'phone',label:'Phone'},{name:'radio',label:'Radio'},{name:'lockpick',label:'Lockpick'},{name:'repairkit',label:'Repair Kit'}],weapons:[{name:'WEAPON_PISTOL',label:'Pistol'},{name:'WEAPON_SMG',label:'SMG'},{name:'WEAPON_CARBINERIFLE',label:'Carbine Rifle'},{name:'WEAPON_STUNGUN',label:'Stun Gun'}]},players:names.map((name,index)=>({id:index+1,name,ping:24+index*13,bucket:0,health:200,armor:index%3*25,joined:Math.floor(Date.now()/1000)-8000-index*900,frozen:false,cfxId:`fivem:${10000+index}`})),reports:[{id:12,playerId:4,player:'Nora Diaz',message:'Player is repeatedly ramming vehicles at Legion Square.',created:Math.floor(Date.now()/1000)-220,status:'open'}],resources:[{name:'enhancedfx-admin',state:'started',protected:true},{name:'chat',state:'started',protected:true},{name:'my-custom-cars',state:'started',protected:false}],bans:[],audit:[{time:Math.floor(Date.now()/1000)-60,actor:'Ryder Lee',action:'WARN',target:'Player 18',detail:'Fail RP'},{time:Math.floor(Date.now()/1000)-310,actor:'Mia Chen',action:'VEHICLE',target:'Mia Chen',detail:'spawn sultanrs'},{time:Math.floor(Date.now()/1000)-640,actor:'Ryder Lee',action:'REPORT CLAIM',target:'12',detail:''}],stats:{online:47,reports:3,bans:8,resources:36,startedResources:34,averagePing:48,oneSync:'on',uptime:19820}}}}));
  const previewPage=new URLSearchParams(location.search).get('page');if(previewPage&&pages.some(page=>page.id===previewPage)){state.page=previewPage;render()}
}

