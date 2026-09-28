(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))l(c);new MutationObserver(c=>{for(const s of c)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&l(o)}).observe(document,{childList:!0,subtree:!0});function t(c){const s={};return c.integrity&&(s.integrity=c.integrity),c.referrerPolicy&&(s.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?s.credentials="include":c.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function l(c){if(c.ep)return;c.ep=!0;const s=t(c);fetch(c.href,s)}})();const O="einv-token";function U(){try{return localStorage.getItem(O)}catch{return null}}function R(e){try{e?localStorage.setItem(O,e):localStorage.removeItem(O)}catch{}}async function S(e,a){const t=await k(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`HTTP ${t.status}`)}return await t.json()}async function k(e,a){const t={...a?.headers??{}},l=U();l&&(t.authorization=`Bearer ${l}`);const c=await fetch(e,{...a,headers:t});if(c.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return c}async function j(e,a){const t=await k(e);if(!t.ok){const o=await t.json().catch(()=>({}));throw new Error(o.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const l=await t.blob(),c=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),s=document.createElement("a");s.href=URL.createObjectURL(l),s.download=c?.[1]??a,document.body.appendChild(s),s.click(),s.remove(),window.setTimeout(()=>URL.revokeObjectURL(s.href),1e4)}async function Z(e){const a=await k(e);if(!a.ok){const c=await a.json().catch(()=>({}));throw new Error(c.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),l=URL.createObjectURL(t);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const g={health:()=>S("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return S(`/api/invoices${a?`?${a}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,a)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>S("/api/customers"),create:(e,a)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function x(e){return`${Number(e).toFixed(2)} EUR`}function P(e){return e.split("/").pop()??e}async function _(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",l=!1;async function c(){const o=await k("/api/backups");if(!o.ok)throw new Error("Backups konnten nicht geladen werden");a=await o.json(),s()}function s(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(o=>`<div class="row" style="margin-top:8px">
				<strong>${n(P(o.filename))}</strong>
				<span class="muted">${n(o.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(o.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(o.filename)}">Download</button>
				<button class="secondary" data-restore="${n(o.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const o=await k("/api/backups",{method:"POST"});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const v=await o.json();t=`Gesichert: ${P(v.filename)}`,l=!1,await c()}catch(o){t=o.message,l=!0,s()}}),e.querySelectorAll("[data-dl]").forEach(o=>o.addEventListener("click",async()=>{const v=o.dataset.dl??"";try{await j(`/api/backups/file/${P(v)}`,P(v))}catch(p){t=p.message,l=!0,s()}})),e.querySelectorAll("[data-restore]").forEach(o=>o.addEventListener("click",async()=>{const v=o.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${P(v)}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await k("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:v})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const m=await p.json();t=`Wiederhergestellt: ${m.invoices} Rechnungen, ${m.templates} Vorlagen${m.fileErrors.length>0?` (${m.fileErrors.length} Dateifehler)`:""}`,l=!1,await c()}catch(p){t=p.message,l=!0,s()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const o=e.querySelector("#b-file")?.files?.[0];if(!o){t="Bitte zuerst eine ZIP-Datei wählen",l=!0,s();return}if(window.confirm(`Wirklich wiederherstellen aus ${o.name}? Die aktuelle Datenbank wird ersetzt.`))try{const v=await new Promise((f,i)=>{const r=new FileReader;r.onload=()=>f(String(r.result).split(",")[1]),r.onerror=()=>i(new Error("Datei nicht lesbar")),r.readAsDataURL(o)}),p=await k("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:v})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const m=await p.json();t=`Wiederhergestellt: ${m.invoices} Rechnungen, ${m.templates} Vorlagen`,l=!1,await c()}catch(v){t=v.message,l=!0,s()}})}try{await c()}catch(o){e.innerHTML=`<div class="card error">${n(o.message)}</div>`}}const H=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function L(e,a,t){const l=e[a],c=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(c)}" /></label>`}async function X(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",l=!1;try{a=await g.company.getDefault(),a||(a=(await g.company.list())[0]??null)}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`;return}function c(){const s=a?.profile??H();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${L(s,"name","Firmenname")}
			${L(s,"street","Straße")}
			<div class="grid2">${L(s,"zip","PLZ")}${L(s,"city","Ort")}</div>
			<div class="grid2">${L(s,"country","Land")}${L(s,"email","E-Mail")}</div>
			<div class="grid2">${L(s,"phone","Telefon")}${L(s,"website","Webseite")}</div>
			<div class="grid2">${L(s,"vatId","USt-IdNr.")}${L(s,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${L(s,"bankName","Bankname")}${L(s,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(s.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile.</p>
			<div class="grid2">
				<label>Box 1 – Adresse<textarea data-fbox="0" rows="3">${n((s.footerBoxes??[])[0]??"")}</textarea></label>
				<label>Box 2 – Kontakt<textarea data-fbox="1" rows="3">${n((s.footerBoxes??[])[1]??"")}</textarea></label>
			</div>
			<div class="grid2">
				<label>Box 3 – Bank<textarea data-fbox="2" rows="3">${n((s.footerBoxes??[])[2]??"")}</textarea></label>
				<label>Box 4 – Steuer<textarea data-fbox="3" rows="3">${n((s.footerBoxes??[])[3]??"")}</textarea></label>
			</div>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const o={...H()};e.querySelectorAll("input[data-f]").forEach(m=>{o[m.dataset.f]=m.value});const v=[0,1,2,3].map(m=>e.querySelector(`textarea[data-fbox="${m}"]`)?.value??"");v.some(m=>m.trim()!=="")?o.footerBoxes=v:delete o.footerBoxes;const p=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await g.company.update(a.id,{name:p,profile:o}):a=await g.company.create(p,o),t="Gespeichert.",l=!1,c()}catch(m){t=m.message,l=!0,c()}})}c()}const z=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function q(e,a,t){const l=e[a],c=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(c)}" /></label>`}async function Y(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,l=!1,c="",s=!1;async function o(){a=await g.customers.list(),p()}function v(f,i){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(i)}" /></label>
		${q(f,"name","Firmenname")}
		${q(f,"street","Straße")}
		<div class="grid2">${q(f,"zip","PLZ")}${q(f,"city","Ort")}</div>
		<div class="grid2">${q(f,"country","Land")}${q(f,"email","E-Mail")}</div>
		<div class="grid2">${q(f,"phone","Telefon")}${q(f,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(f.customerNumber)}" /></label>`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(f=>`<div class="row" style="margin-top:8px">
				<strong>${n(f.name)}</strong>
				<span class="muted">${n(f.profile.city||"")}</span>
				<button class="secondary" data-edit="${f.id}">Bearbeiten</button>
				<button class="danger" data-del="${f.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||l?`<div class="card"><h3>${l?"Neuer Kunde":n(t?.name??"")}</h3>
			${v(t?.profile??z(),t?.name??"")}
			${c?`<p class="${s?"error":""}">${n(c)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,l=!0,c="",p()}),e.querySelectorAll("[data-edit]").forEach(f=>f.addEventListener("click",()=>{t=a.find(i=>i.id===f.dataset.edit)??null,l=!1,c="",p()})),e.querySelectorAll("[data-del]").forEach(f=>f.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await g.customers.remove(f.dataset.del??""),await o()}catch(i){c=i.message,s=!0,p()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,l=!1,c="",p()}),e.querySelector("#k-save")?.addEventListener("click",()=>{m()})}async function m(){const f={...z()};e.querySelectorAll("input[data-f]").forEach(r=>{f[r.dataset.f]=r.value});const i=e.querySelector("#k-name")?.value.trim()||f.name.trim()||"Kunde";try{l?await g.customers.create(i,f):t&&await g.customers.update(t.id,{name:i,profile:f}),t=null,l=!1,c="",await o()}catch(r){c=r.message,s=!0,p()}}try{await o()}catch(f){e.innerHTML=`<div class="card error">${n(f.message)}</div>`}}function Q(e){return`<span class="badge ${e}">${e}</span>`}async function ee(e){e.innerHTML=`
		<div class="card"><div class="row">
			<strong>Rechnungen</strong>
			<select id="f-status">
				<option value="">alle</option>
				<option value="draft">draft</option>
				<option value="issued">issued</option>
				<option value="cancelled">cancelled</option>
			</select>
			<input id="f-q" placeholder="Suche (Nr, Kunde)…" style="max-width:220px" />
			<a class="btn" href="#/new">+ Neu</a>
			<button class="btn secondary" id="f-export">Excel</button>
		</div></div>
		<div id="list"></div>
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),l=e.querySelector("#list"),c=e.querySelector("#list-err");function s(v){c.innerHTML=`<div class="card error">${n(v.message)}</div>`}async function o(){const v={};a.value&&(v.status=a.value),t.value.trim()&&(v.q=t.value.trim());try{const p=await g.list(v);l.innerHTML=p.map(m=>`<div class="card"><div class="row">
					<strong>${n(m.number??"(Entwurf)")}</strong>${Q(m.status)}
					<span>${n(m.buyer.name||"—")}</span>
					<span>${x(m.totals.grossTotal)}</span>
					<a href="#/invoices/${n(m.id)}">Ansehen</a>
					${m.status==="draft"?`<a href="#/edit/${n(m.id)}">Bearbeiten</a>`:""}
					${m.pdfPath?`<button class="secondary" data-dl="pdf:${n(m.id)}:${n(m.number??"rechnung")}">PDF ↓</button>`:""}
					${m.xml?`<button class="secondary" data-dl="xml:${n(m.id)}:${n(m.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(m=>m.addEventListener("click",async()=>{const[f,i,r]=(m.dataset.dl??"").split(":"),h=f==="pdf"?g.pdfUrl(i):g.xmlUrl(i);try{await j(h,`${r}.${f}`)}catch($){s($)}}))}catch(p){l.innerHTML=`<div class="card error">${n(p.message)}</div>`}}a.onchange=()=>{o()},t.oninput=()=>{o()},e.querySelector("#f-export")?.addEventListener("click",async()=>{const v={};a.value&&(v.status=a.value),t.value.trim()&&(v.q=t.value.trim());try{await j(g.exportUrl(v),"export.xlsx")}catch(p){s(p)}}),await o()}async function te(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await g.get(a);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${n(t.number??"(Entwurf)")}</strong>
				<span class="badge ${t.status}">${t.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${n(t.seller.name)}<br />${n(t.seller.street)}<br />${n(t.seller.zip)} ${n(t.seller.city)}</div>
				<div><strong>Käufer</strong><br />${n(t.buyer.name)}<br />${n(t.buyer.street)}<br />${n(t.buyer.zip)} ${n(t.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${n(t.issueDate)} · Leistung: ${n(t.deliveryDate)}${t.dueDate?` · Fällig: ${n(t.dueDate)}`:""}</p>
			<table class="lines"><tr><th>#</th><th>Beschreibung</th><th>Menge</th><th>USt</th><th>Netto</th></tr>
			${t.lines.map((s,o)=>{const v=s.unitPriceNet*(1-(s.discountPercent??0)/100);return`<tr><td>${o+1}</td><td>${n(s.description)}${s.sku?` (${n(s.sku)})`:""}</td><td>${s.quantity} ${n(s.unit)}</td><td>${s.vatRate} %</td><td>${x(Math.round(s.quantity*v*100)/100)}</td></tr>`}).join("")}
			</table>
			<p><strong>Gesamt: ${x(t.totals.grossTotal)}</strong> <span class="muted">(netto ${x(t.totals.netTotal)} + USt ${x(t.totals.taxTotal)})</span></p>
			${t.notes?`<p class="muted">Notiz: ${n(t.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${t.status==="draft"?`<a class="btn" href="#/edit/${n(t.id)}">Bearbeiten</a>`:""}
				${t.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${t.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
				${t.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
				${t.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
				${t.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div></div>`;const l=e.querySelector("#d-out"),c=s=>{l.innerHTML=`<p class="error">${n(s.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(s=>s.addEventListener("click",async()=>{const o=s.dataset.dl,v=o==="pdf"?g.pdfUrl(t.id):o==="xml"?g.xmlUrl(t.id):g.xlsxUrl(t.id);try{await j(v,`${t.number??"rechnung"}.${o}`)}catch(p){c(p)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await Z(g.pdfUrl(t.id))}catch(s){c(s)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{l.innerHTML='<p class="muted">Validiere…</p>';try{const s=await g.validate(t.id);l.innerHTML=s.formatErrors.length+s.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...s.formatErrors,...s.businessErrors].map(o=>`<li class="error">${n(o)}</li>`).join("")}</ul>`}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const s=await g.issue(t.id);location.hash=`#/invoices/${s.id}`,location.reload()}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function ae(e){const a=U();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";R(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{R(null),location.hash="#/login",location.reload()})}function ne(){R(null),location.hash="#/login"}async function ie(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,l=!1,c="",s=!1;async function o(){a=await g.products.list(),p()}function v(i){const r=h=>n(h??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${r(i.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${r(i.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${r(i.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${r(i.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${i.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(h=>`<option ${h===(i.vatRate??19)?"selected":""}>${h}</option>`).join("")}
		</select></label>`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${a.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${n(i.sku?`${i.sku} · `:"")}${n(i.name)}</strong>
				<span class="muted">${n(i.unit)} · ${Number(i.unitPriceNet).toFixed(2)} EUR · ${i.vatRate} %</span>
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="danger" data-del="${i.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||l?`<div class="card"><h3>${l?"Neue Position":n(t?.name??"")}</h3>
			${v(t??{})}
			${c?`<p class="${s?"error":""}">${n(c)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,l=!0,c="",p()}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{t=a.find(r=>r.id===i.dataset.edit)??null,l=!1,c="",p()})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await g.products.remove(i.dataset.del??""),await o()}catch(r){c=r.message,s=!0,p()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,l=!1,c="",p()}),e.querySelector("#p-save")?.addEventListener("click",()=>{f()})}function m(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function f(){const i=m();try{l?await g.products.create(i):t&&await g.products.update(t.id,i),t=null,l=!1,c="",await o()}catch(r){c=r.message,s=!0,p()}}try{await o()}catch(i){e.innerHTML=`<div class="card error">${n(i.message)}</div>`}}async function se(e){try{const a=await g.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const re=["title","meta","parties","positions","totals"],I=["payment","notes"];async function le(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,l="",c=[];try{const i=await k("/api/company-profiles");i.ok&&(c=await i.json())}catch{}async function s(){a=await o(),p()}async function o(){const i=await k("/api/templates");if(!i.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await i.json()}function v(i){const r=i.definition,h=($,u,w)=>`<label><input type="checkbox" data-f="blocks.${$}" ${r.blocks[$]?"checked":""} ${w?"disabled":""} style="width:auto" /> ${u}${w?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(i.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${c.map($=>`<option value="${n($.id)}" ${i.definition.companyId===$.id?"selected":""}>${n($.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${re.map($=>h($,`Block ${$}`,!0)).join("")}
		${I.map($=>h($,`Block ${$}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${r.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${r.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${r.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${r.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${r.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${r.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${r.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${n(r.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${n(r.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${n(r.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${n(r.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${n(r.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map($=>`<option ${r.logo?.position===$?"selected":""}>${$}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${n(r.logo.path)}</p>`:""}`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${a.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${n(i.name)}</strong><span class="muted">v${i.version}</span>
				${i.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${i.id}">Vorschau</button>
				${i.isDefault?"":`<button class="secondary" data-def="${i.id}">Standard</button>`}
				${i.isDefault?"":`<button class="danger" data-del="${i.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${n(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${v(t)}
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const h=(await(await k("/api/templates")).json())[0];if(!h){l="Keine Basisvorlage vorhanden",p();return}t={...structuredClone(h),id:"neu",name:"Neu",version:1,isDefault:!1},l="",p()}catch(i){l=i.message,p()}}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{const r=a.find(h=>h.id===i.dataset.edit);r&&(t=structuredClone(r),l="",p())})),e.querySelectorAll("[data-prev]").forEach(i=>i.addEventListener("click",async()=>{const r=a.find(h=>h.id===i.dataset.prev);if(r)try{const h=await k("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!h.ok){const u=await h.json().catch(()=>({}));throw new Error(u.error??"Vorschau fehlgeschlagen")}const $=await h.blob();window.open(URL.createObjectURL($),"_blank")}catch(h){l=h.message,p()}})),e.querySelectorAll("[data-def]").forEach(i=>i.addEventListener("click",async()=>{try{if(!(await k(`/api/templates/${i.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await s()}catch(r){l=r.message,p()}})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{const r=await k(`/api/templates/${i.dataset.del}`,{method:"DELETE"});if(!r.ok){l=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await s()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,l="",p()}),e.querySelector("#t-save")?.addEventListener("click",()=>{f()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const i=m();if(i)try{const r=await k("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!r.ok){const h=await r.json().catch(()=>({}));throw new Error(h.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){l=r.message,p()}})}function m(){if(!t)return null;const i=structuredClone(t.definition);i.name=(e.querySelector("#t-name")?.value??i.name).trim(),i.colors.primary=e.querySelector("#t-c1")?.value??i.colors.primary,i.colors.text=e.querySelector("#t-c2")?.value??i.colors.text;for(const h of I)i.blocks[h]=e.querySelector(`[data-f="blocks.${h}"]`)?.checked??i.blocks[h];for(const h of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])i[h]=e.querySelector(`[data-f="${h}"]`)?.checked??!1;i.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?i.companyId=r:delete i.companyId,i.introText=e.querySelector("#t-intro")?.value??"",i.closingText=e.querySelector("#t-closing")?.value??"",i.signatureName=e.querySelector("#t-sign")?.value??"",i.headerExtra=e.querySelector("#t-hextra")?.value??"",i.logo&&(i.logo.position=e.querySelector("#t-lpos")?.value??"right",i.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:i.name,definition:i}}async function f(){const i=m();if(!i)return;const r=i.definition;try{let h=t.id;if(h==="neu"){const u=await k("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");h=(await u.json()).id}else{const u=await k(`/api/templates/${h}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const $=e.querySelector("#t-logo")?.files?.[0];if($){const u=await new Promise((d,y)=>{const b=new FileReader;b.onload=()=>d(String(b.result).split(",")[1]),b.onerror=()=>y(new Error("Datei nicht lesbar")),b.readAsDataURL($)}),w=await k(`/api/templates/${h}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:$.name,mime:$.type,dataBase64:u})});if(!w.ok)throw new Error((await w.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,l="",await s()}catch(h){l=h.message,p()}}try{await s()}catch(i){e.innerHTML=`<div class="card error">${n(i.message)}</div>`}}const F=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),D=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),N="einv-wizard-v1",V="einv-employee";function W(){try{return localStorage.getItem(V)??""}catch{return""}}function K(){return new Date().toISOString().slice(0,10)}function A(){return{step:0,seller:F(),buyer:F(),lines:[D()],issueDate:K(),deliveryDate:K(),dueDate:"",employee:W(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,error:"",savedAt:new Date().toISOString()}}function B(e){return e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0)}function ce(){try{const e=localStorage.getItem(N);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...A(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function C(e,a,t){return`
		<label>Name<input data-p="${e}" data-f="name" value="${n(a.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${n(a.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${n(a.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${n(a.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${n(a.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${n(a.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${e}" data-f="phone" value="${n(a.phone)}" /></label>
			${t?`<label>Webseite<input data-p="${e}" data-f="website" value="${n(a.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${n(a.contactName)}" /></label>`}
		</div>
		${t?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${n(a.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${n(a.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" /></label>`}`}const oe=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function J(e,a){let t=A();const l=!!a;let c=[],s=[],o=[];if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',g.get(a).then(u=>{if(u.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(u.status)}).</div>`;return}t={...A(),seller:u.seller,buyer:u.buyer,lines:u.lines.length>0?u.lines:[D()],issueDate:u.issueDate,deliveryDate:u.deliveryDate,dueDate:u.dueDate??"",employee:u.employeeCode??W(),documentTitle:u.documentTitle,notes:u.notes??"",draftId:u.id},p(),r()}).catch(u=>{e.innerHTML=`<div class="card error">${n(u.message)}</div>`});return}const v=ce();if(v&&B(v)&&!v.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(v.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=v,r()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(N),r()});return}v&&B(v)&&(t=v),p(),B(t)||g.company.getDefault().then(u=>{u&&!t.seller.name.trim()&&u.profile.name.trim()&&(t.seller={...t.seller,...u.profile},t.selectedCompany=u.id,r(!0))}).catch(()=>{});function p(){g.company.list().then(u=>{c=u,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),g.customers.list().then(u=>{s=u,t.step===1&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),g.products.list().then(u=>{o=u,t.step===2&&!e.querySelector("#w-catalog")&&r()}).catch(()=>{})}function m(){try{const u=l?{...t,draftId:null}:t;localStorage.setItem(N,JSON.stringify({...u,error:"",savedAt:new Date().toISOString()}))}catch{}}function f(){e.querySelectorAll("input[data-p]").forEach(d=>{const y=d.dataset.p==="seller"?t.seller:t.buyer;y[d.dataset.f]=d.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(d=>{const[y,b]=d.dataset.l.split("."),E=t.lines[Number(y)];E&&(b==="quantity"||b==="unitPriceNet"||b==="vatRate"||b==="discountPercent"?E[b]=Number(d.value):E[b]=d.value)});const u=d=>e.querySelector(`#${d}`)?.value??"";t.issueDate=u("w-issue")||t.issueDate,t.deliveryDate=u("w-delivery")||t.deliveryDate,e.querySelector("#w-due")&&(t.dueDate=u("w-due")),e.querySelector("#w-employee")&&(t.employee=u("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=u("w-title")||t.documentTitle);const w=e.querySelector("#w-notes");w&&(t.notes=w.value),m()}function i(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((w,d)=>`<span class="${d===t.step?"on":""}">${d+1}. ${w}</span>`).join("")}</div>`}function r(u=!1){u||f();let w="";if(t.step===0&&(w=`<div class="card"><h3>Verkäufer</h3>
				${c.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${c.map(d=>`<option value="${n(d.id)}" ${t.selectedCompany===d.id?"selected":""}>${n(d.name)}${d.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${C("seller",t.seller,!0)}</div>`),t.step===1&&(w=`<div class="card"><h3>Käufer</h3>
				${s.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${s.map(d=>`<option value="${n(d.id)}" ${t.selectedCustomer===d.id?"selected":""}>${n(d.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${C("buyer",t.buyer,!1)}</div>`),t.step===2&&(w=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${oe.map(d=>`<option ${d===t.documentTitle?"selected":""}>${d}</option>`).join("")}
				</select></label>
				${o.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${o.map(d=>`<option value="${n(d.id)}">${n(d.sku?`${d.sku} · `:"")}${n(d.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((d,y)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${y}.description" value="${n(d.description)}" /></label>
						<label>Art.Nr.<input data-l="${y}.sku" value="${n(d.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${y}.details" rows="1">${n(d.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${y}.quantity" type="number" min="0" step="any" value="${d.quantity}" /></label>
						<label>Einheit<input data-l="${y}.unit" value="${n(d.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${y}.unitPriceNet" type="number" min="0" step="0.01" value="${d.unitPriceNet}" /></label>
						<label>Rabatt %<input data-l="${y}.discountPercent" type="number" min="0" max="100" step="0.1" value="${d.discountPercent??0}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${y}.vatRate">
							${[19,7,0].map(b=>`<option ${b===d.vatRate?"selected":""}>${b}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${y}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(t.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(t.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(t.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(t.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(t.notes)}</textarea></label>
			</div>`),t.step===3){const d=t.lines.reduce((b,E)=>b+E.quantity*E.unitPriceNet*(1-(E.discountPercent??0)/100),0),y=t.lines.reduce((b,E)=>b+E.quantity*E.unitPriceNet*(1-(E.discountPercent??0)/100)*E.vatRate/100,0);w=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${t.lines.length} Positionen</p>
				<p><strong>ca. ${x(Math.round((d+y)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${i()}${w}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,r()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const d=e.querySelector("#w-company")?.value??"",y=c.find(b=>b.id===d);y?(t.seller={...t.seller,...y.profile},t.selectedCompany=y.id,r(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const d=e.querySelector("#w-customer")?.value??"",y=s.find(b=>b.id===d);y?(t.buyer={...t.buyer,...y.profile},t.selectedCustomer=y.id,r(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,r()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(N),t=A(),r())}),e.querySelector("#w-add")?.addEventListener("click",()=>{f(),t.lines.push(D()),r()}),e.querySelector("#w-take")?.addEventListener("click",()=>{f();const d=e.querySelector("#w-catalog")?.value??"",y=o.find(b=>b.id===d);y&&t.lines.push({description:y.name,sku:y.sku||void 0,details:y.details||void 0,quantity:1,unit:y.unit,unitPriceNet:y.unitPriceNet,vatRate:y.vatRate}),r()}),e.querySelectorAll("[data-del]").forEach(d=>d.addEventListener("click",()=>{f(),t.lines.splice(Number(d.dataset.del),1),t.lines.length===0&&t.lines.push(D()),r()})),e.querySelector("#w-save")?.addEventListener("click",()=>{h(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&h(!0)})}async function h(u){f(),t.error="";const w={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(V,t.employee.trim())}catch{}let d;t.draftId?d=await g.update(t.draftId,w):(d=await g.create(w),t.draftId=d.id,m()),u&&(d=await g.issue(d.id),localStorage.removeItem(N)),location.hash=`#/invoices/${d.id}`}catch(d){t.error=d.message,r()}}e.addEventListener("input",()=>{try{$()}catch{}});function $(){e.querySelectorAll("input[data-p]").forEach(b=>{const E=b.dataset.p==="seller"?t.seller:t.buyer;E[b.dataset.f]=b.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(b=>{const[E,T]=b.dataset.l.split("."),M=t.lines[Number(E)];M&&(T==="quantity"||T==="unitPriceNet"||T==="vatRate"||T==="discountPercent"?M[T]=Number(b.value):M[T]=b.value)});const u=b=>e.querySelector(`#${b}`)?.value??"",w=u("w-issue"),d=u("w-delivery");w&&(t.issueDate=w),d&&(t.deliveryDate=d),e.querySelector("#w-due")&&(t.dueDate=u("w-due")),e.querySelector("#w-employee")&&(t.employee=u("w-employee"));const y=u("w-title");y&&(t.documentTitle=y),t.notes=e.querySelector("#w-notes")?.value??t.notes,m()}r()}const de=document.querySelector("#app");function ue(e){const a=!!U(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];de.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([l,c])=>`<a href="${l}" class="${e===l||l==="#/"&&e.startsWith("#/invoices")?"active":""}">${c}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function G(){const e=location.hash||"#/";ue(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await ee(a):e==="#/new"?J(a):e.startsWith("#/edit/")?J(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await te(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await le(a):e==="#/company"?await X(a):e==="#/customers"?await Y(a):e==="#/products"?await ie(a):e==="#/backup"?await _(a):e==="#/login"?ae(a):e==="#/logout"?ne():e==="#/status"?await se(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{G()});G();
