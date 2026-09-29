(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))r(d);new MutationObserver(d=>{for(const o of d)if(o.type==="childList")for(const l of o.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&r(l)}).observe(document,{childList:!0,subtree:!0});function t(d){const o={};return d.integrity&&(o.integrity=d.integrity),d.referrerPolicy&&(o.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?o.credentials="include":d.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(d){if(d.ep)return;d.ep=!0;const o=t(d);fetch(d.href,o)}})();const z="einv-token";function K(){try{return localStorage.getItem(z)}catch{return null}}function I(e){try{e?localStorage.setItem(z,e):localStorage.removeItem(z)}catch{}}async function S(e,a){const t=await E(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const r=await t.json().catch(()=>({}));throw new Error(r.error??`HTTP ${t.status}`)}return await t.json()}async function E(e,a){const t={...a?.headers??{}},r=K();r&&(t.authorization=`Bearer ${r}`);const d=await fetch(e,{...a,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function U(e,a){const t=await E(e);if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const r=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(r),o.download=d?.[1]??a,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function se(e){const a=await E(e);if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),r=URL.createObjectURL(t);window.open(r,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(r),6e4)}const g={health:()=>S("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return S(`/api/invoices${a?`?${a}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,a)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>S("/api/customers"),create:(e,a)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function q(e){return`${Number(e).toFixed(2)} EUR`}function R(e){return e.split("/").pop()??e}async function ie(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",r=!1;async function d(){const l=await E("/api/backups");if(!l.ok)throw new Error("Backups konnten nicht geladen werden");a=await l.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${r?"error":""}">${n(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(l=>`<div class="row" style="margin-top:8px">
				<strong>${n(R(l.filename))}</strong>
				<span class="muted">${n(l.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(l.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(l.filename)}">Download</button>
				<button class="secondary" data-restore="${n(l.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const l=await E("/api/backups",{method:"POST"});if(!l.ok)throw new Error((await l.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const v=await l.json();t=`Gesichert: ${R(v.filename)}`,r=!1,await d()}catch(l){t=l.message,r=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(l=>l.addEventListener("click",async()=>{const v=l.dataset.dl??"";try{await U(`/api/backups/file/${R(v)}`,R(v))}catch(i){t=i.message,r=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(l=>l.addEventListener("click",async()=>{const v=l.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${R(v)}? Die aktuelle Datenbank wird ersetzt.`))try{const i=await E("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:v})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const p=await i.json();t=`Wiederhergestellt: ${p.invoices} Rechnungen, ${p.templates} Vorlagen${p.fileErrors.length>0?` (${p.fileErrors.length} Dateifehler)`:""}`,r=!1,await d()}catch(i){t=i.message,r=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const l=e.querySelector("#b-file")?.files?.[0];if(!l){t="Bitte zuerst eine ZIP-Datei wählen",r=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${l.name}? Die aktuelle Datenbank wird ersetzt.`))try{const v=await new Promise((f,s)=>{const c=new FileReader;c.onload=()=>f(String(c.result).split(",")[1]),c.onerror=()=>s(new Error("Datei nicht lesbar")),c.readAsDataURL(l)}),i=await E("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:v})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const p=await i.json();t=`Wiederhergestellt: ${p.invoices} Rechnungen, ${p.templates} Vorlagen`,r=!1,await d()}catch(v){t=v.message,r=!0,o()}})}try{await d()}catch(l){e.innerHTML=`<div class="card error">${n(l.message)}</div>`}}const W=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,a,t){const r=e[a],d=Array.isArray(r)?r.join(`
`):r??"";return`<label>${t}<input data-f="${a}" value="${n(d)}" /></label>`}async function re(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",r=!1;try{a=await g.company.getDefault(),a||(a=(await g.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${n(o.message)}</div>`;return}function d(){const o=a?.profile??W();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${x(o,"name","Firmenname")}
			${x(o,"street","Straße")}
			<div class="grid2">${x(o,"zip","PLZ")}${x(o,"city","Ort")}</div>
			<div class="grid2">${x(o,"country","Land")}${x(o,"email","E-Mail")}</div>
			<div class="grid2">${x(o,"phone","Telefon")}${x(o,"website","Webseite")}</div>
			<div class="grid2">${x(o,"vatId","USt-IdNr.")}${x(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${x(o,"bankName","Bankname")}${x(o,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(o.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(l=>`<div class="grid2"><label>Box ${l+1}<textarea data-fbox="${l}" rows="3">${n((o.footerBoxes??[])[l]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${l}">
					${["left","center","right"].map(v=>`<option value="${v}" ${(o.footerAlign??[])[l]===v||!(o.footerAlign??[])[l]&&v==="left"?"selected":""}>${v==="left"?"Links":v==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${r?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const l={...W()};e.querySelectorAll("input[data-f]").forEach(p=>{l[p.dataset.f]=p.value});const v=[0,1,2,3].map(p=>e.querySelector(`textarea[data-fbox="${p}"]`)?.value??"");v.some(p=>p.trim()!=="")?(l.footerBoxes=v,l.footerAlign=[0,1,2,3].map(p=>{const f=e.querySelector(`select[data-falign="${p}"]`)?.value;return f==="center"||f==="right"?f:"left"})):(delete l.footerBoxes,delete l.footerAlign);const i=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await g.company.update(a.id,{name:i,profile:l}):a=await g.company.create(i,l),t="Gespeichert.",r=!1,d()}catch(p){t=p.message,r=!0,d()}})}d()}const G=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function A(e,a,t){const r=e[a],d=Array.isArray(r)?r.join(`
`):r??"";return`<label>${t}<input data-f="${a}" value="${n(d)}" /></label>`}async function le(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,r=!1,d="",o=!1;async function l(){a=await g.customers.list(),i()}function v(f,s){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(s)}" /></label>
		${A(f,"name","Firmenname")}
		${A(f,"street","Straße")}
		<div class="grid2">${A(f,"zip","PLZ")}${A(f,"city","Ort")}</div>
		<div class="grid2">${A(f,"country","Land")}${A(f,"email","E-Mail")}</div>
		<div class="grid2">${A(f,"phone","Telefon")}${A(f,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(f.customerNumber)}" /></label>`}function i(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(f=>`<div class="row" style="margin-top:8px">
				<strong>${n(f.name)}</strong>
				<span class="muted">${n(f.profile.city||"")}</span>
				<button class="secondary" data-edit="${f.id}">Bearbeiten</button>
				<button class="danger" data-del="${f.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||r?`<div class="card"><h3>${r?"Neuer Kunde":n(t?.name??"")}</h3>
			${v(t?.profile??G(),t?.name??"")}
			${d?`<p class="${o?"error":""}">${n(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,r=!0,d="",i()}),e.querySelectorAll("[data-edit]").forEach(f=>f.addEventListener("click",()=>{t=a.find(s=>s.id===f.dataset.edit)??null,r=!1,d="",i()})),e.querySelectorAll("[data-del]").forEach(f=>f.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await g.customers.remove(f.dataset.del??""),await l()}catch(s){d=s.message,o=!0,i()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,r=!1,d="",i()}),e.querySelector("#k-save")?.addEventListener("click",()=>{p()})}async function p(){const f={...G()};e.querySelectorAll("input[data-f]").forEach(c=>{f[c.dataset.f]=c.value});const s=e.querySelector("#k-name")?.value.trim()||f.name.trim()||"Kunde";try{r?await g.customers.create(s,f):t&&await g.customers.update(t.id,{name:s,profile:f}),t=null,r=!1,d="",await l()}catch(c){d=c.message,o=!0,i()}}try{await l()}catch(f){e.innerHTML=`<div class="card error">${n(f.message)}</div>`}}function ce(e){return`<span class="badge ${e}">${e}</span>`}async function oe(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),r=e.querySelector("#list"),d=e.querySelector("#list-err");function o(v){d.innerHTML=`<div class="card error">${n(v.message)}</div>`}async function l(){const v={};a.value&&(v.status=a.value),t.value.trim()&&(v.q=t.value.trim());try{const i=await g.list(v);r.innerHTML=i.map(p=>`<div class="card"><div class="row">
					<strong>${n(p.number??"(Entwurf)")}</strong>${ce(p.status)}
					<span>${n(p.buyer.name||"—")}</span>
					<span>${q(p.totals.grossTotal)}</span>
					<a href="#/invoices/${n(p.id)}">Ansehen</a>
					${p.status==="draft"?`<a href="#/edit/${n(p.id)}">Bearbeiten</a>`:""}
					${p.pdfPath?`<button class="secondary" data-dl="pdf:${n(p.id)}:${n(p.number??"rechnung")}">PDF ↓</button>`:""}
					${p.xml?`<button class="secondary" data-dl="xml:${n(p.id)}:${n(p.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',r.querySelectorAll("[data-dl]").forEach(p=>p.addEventListener("click",async()=>{const[f,s,c]=(p.dataset.dl??"").split(":"),m=f==="pdf"?g.pdfUrl(s):g.xmlUrl(s);try{await U(m,`${c}.${f}`)}catch(w){o(w)}}))}catch(i){r.innerHTML=`<div class="card error">${n(i.message)}</div>`}}a.onchange=()=>{l()},t.oninput=()=>{l()},e.querySelector("#f-export")?.addEventListener("click",async()=>{const v={};a.value&&(v.status=a.value),t.value.trim()&&(v.q=t.value.trim());try{await U(g.exportUrl(v),"export.xlsx")}catch(i){o(i)}}),await l()}function B(e){return Math.round((e+Number.EPSILON)*100)/100}async function de(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await g.get(a),d=(Array.isArray(t.lines)?t.lines:[]).map(i=>{const p=Math.min(Math.max(Number(i.discountPercent)||0,0),100),f=Number(i.quantity)||0,s=Number(i.unitPriceNet)||0;return{line:i,discount:p,gross:B(f*s),net:B(f*s*(1-p/100))}}),o=d.some(i=>i.discount>0);e.innerHTML=`
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
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${o?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${d.map((i,p)=>`<tr>
					<td>${p+1}</td><td>${n(i.line.description)}${i.line.sku?` (${n(i.line.sku)})`:""}</td>
					<td class="r">${n(i.line.quantity)} ${n(i.line.unit)}</td>
					<td class="r">${q(Number(i.line.unitPriceNet))}</td>
					${o?`<td class="r">${i.discount>0?`${n(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?q(B(i.gross-i.net)):"–"}</td>`:""}
					<td class="r">${n(i.line.vatRate)} %</td><td class="r"><strong>${q(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${q(t.totals.grossTotal)}</strong> <span class="muted">(netto ${q(t.totals.netTotal)} + USt ${q(t.totals.taxTotal)})</span></p>
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
			</div><div id="d-out"></div></div>`;const l=e.querySelector("#d-out"),v=i=>{l.innerHTML=`<p class="error">${n(i.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const p=i.dataset.dl,f=p==="pdf"?g.pdfUrl(t.id):p==="xml"?g.xmlUrl(t.id):g.xlsxUrl(t.id);try{await U(f,`${t.number??"rechnung"}.${p}`)}catch(s){v(s)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await se(g.pdfUrl(t.id))}catch(i){v(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{l.innerHTML='<p class="muted">Validiere…</p>';try{const i=await g.validate(t.id);l.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(p=>`<li class="error">${n(p)}</li>`).join("")}</ul>`}catch(i){l.innerHTML=`<p class="error">${n(i.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await g.issue(t.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){l.innerHTML=`<p class="error">${n(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function ue(e){const a=K();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";I(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{I(null),location.hash="#/login",location.reload()})}function pe(){I(null),location.hash="#/login"}async function me(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,r=!1,d="",o=!1;async function l(){a=await g.products.list(),i()}function v(s){const c=m=>n(m??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${c(s.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${c(s.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${c(s.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${c(s.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${s.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(m=>`<option ${m===(s.vatRate??19)?"selected":""}>${m}</option>`).join("")}
		</select></label>`}function i(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${a.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${n(s.sku?`${s.sku} · `:"")}${n(s.name)}</strong>
				<span class="muted">${n(s.unit)} · ${Number(s.unitPriceNet).toFixed(2)} EUR · ${s.vatRate} %</span>
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="danger" data-del="${s.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||r?`<div class="card"><h3>${r?"Neue Position":n(t?.name??"")}</h3>
			${v(t??{})}
			${d?`<p class="${o?"error":""}">${n(d)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,r=!0,d="",i()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(c=>c.id===s.dataset.edit)??null,r=!1,d="",i()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await g.products.remove(s.dataset.del??""),await l()}catch(c){d=c.message,o=!0,i()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,r=!1,d="",i()}),e.querySelector("#p-save")?.addEventListener("click",()=>{f()})}function p(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function f(){const s=p();try{r?await g.products.create(s):t&&await g.products.update(t.id,s),t=null,r=!1,d="",await l()}catch(c){d=c.message,o=!0,i()}}try{await l()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}async function he(e){try{const a=await g.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const fe=["title","meta","parties","positions","totals"],Z=["payment","notes"];async function ve(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,r="",d=[];try{const s=await E("/api/company-profiles");s.ok&&(d=await s.json())}catch{}async function o(){a=await l(),i()}async function l(){const s=await E("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function v(s){const c=s.definition,m=(w,N,h)=>`<label><input type="checkbox" data-f="blocks.${w}" ${c.blocks[w]?"checked":""} ${h?"disabled":""} style="width:auto" /> ${N}${h?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${d.map(w=>`<option value="${n(w.id)}" ${s.definition.companyId===w.id?"selected":""}>${n(w.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(c.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(c.colors.text)}" /></label>
		</div>
		${fe.map(w=>m(w,`Block ${w}`,!0)).join("")}
		${Z.map(w=>m(w,`Block ${w}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${c.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${c.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${c.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${c.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${c.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${c.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${c.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${n(c.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${n(c.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${n(c.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${n(c.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${n(c.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(w=>`<option ${c.logo?.position===w?"selected":""}>${w}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${c.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${c.logo?`<p class="muted">Aktuell: ${n(c.logo.path)}</p>`:""}`}function i(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${a.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${n(s.name)}</strong><span class="muted">v${s.version}</span>
				${s.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${s.id}">Vorschau</button>
				${s.isDefault?"":`<button class="secondary" data-def="${s.id}">Standard</button>`}
				${s.isDefault?"":`<button class="danger" data-del="${s.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${n(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${v(t)}
			${r?`<p class="error">${n(r)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const m=(await(await E("/api/templates")).json())[0];if(!m){r="Keine Basisvorlage vorhanden",i();return}t={...structuredClone(m),id:"neu",name:"Neu",version:1,isDefault:!1},r="",i()}catch(s){r=s.message,i()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const c=a.find(m=>m.id===s.dataset.edit);c&&(t=structuredClone(c),r="",i())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const c=a.find(m=>m.id===s.dataset.prev);if(c)try{const m=await E("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:c.definition})});if(!m.ok){const N=await m.json().catch(()=>({}));throw new Error(N.error??"Vorschau fehlgeschlagen")}const w=await m.blob();window.open(URL.createObjectURL(w),"_blank")}catch(m){r=m.message,i()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await E(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(c){r=c.message,i()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const c=await E(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!c.ok){r=(await c.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",i();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,r="",i()}),e.querySelector("#t-save")?.addEventListener("click",()=>{f()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=p();if(s)try{const c=await E("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!c.ok){const m=await c.json().catch(()=>({}));throw new Error(m.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await c.blob()),"_blank")}catch(c){r=c.message,i()}})}function p(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const m of Z)s.blocks[m]=e.querySelector(`[data-f="blocks.${m}"]`)?.checked??s.blocks[m];for(const m of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[m]=e.querySelector(`[data-f="${m}"]`)?.checked??!1;s.footerText=e.querySelector("#t-footer")?.value??"";const c=e.querySelector("#t-company")?.value??"";return c?s.companyId=c:delete s.companyId,s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:s.name,definition:s}}async function f(){const s=p();if(!s)return;const c=s.definition;try{let m=t.id;if(m==="neu"){const N=await E("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:c.name,definition:c})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");m=(await N.json()).id}else{const N=await E(`/api/templates/${m}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:c.name,definition:c})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const w=e.querySelector("#t-logo")?.files?.[0];if(w){const N=await new Promise((k,u)=>{const y=new FileReader;y.onload=()=>k(String(y.result).split(",")[1]),y.onerror=()=>u(new Error("Datei nicht lesbar")),y.readAsDataURL(w)}),h=await E(`/api/templates/${m}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:w.name,mime:w.type,dataBase64:N})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,r="",await o()}catch(m){r=m.message,i()}}try{await o()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const _=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),O=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19});function j(e){return Math.round((e+Number.EPSILON)*100)/100}const M="einv-wizard-v1",ee="einv-employee";function te(){try{return localStorage.getItem(ee)??""}catch{return""}}function X(){return new Date().toISOString().slice(0,10)}function F(){return{step:0,seller:_(),buyer:_(),lines:[O()],issueDate:X(),deliveryDate:X(),dueDate:"",employee:te(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function H(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function ye(){try{const e=localStorage.getItem(M);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...F(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function Y(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" /></label>`}`}const be=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function Q(e,a){let t=F();const r=!!a;let d=[],o=[],l=[],v=!1;if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',g.get(a).then(h=>{if(h.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(h.status)}).</div>`;return}t={...F(),seller:h.seller,buyer:h.buyer,lines:h.lines.length>0?h.lines:[O()],issueDate:h.issueDate,deliveryDate:h.deliveryDate,dueDate:h.dueDate??"",employee:h.employeeCode??te(),documentTitle:h.documentTitle,notes:h.notes??"",draftId:h.id},p(),m()}).catch(h=>{e.innerHTML=`<div class="card error">${n(h.message)}</div>`});return}const i=ye();if(i&&H(i)&&!i.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(i.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=i,p(),m()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(M),p(),m()});return}i&&H(i)&&(t=i),p(),H(t)||g.company.getDefault().then(h=>{h&&!t.seller.name.trim()&&h.profile.name.trim()&&(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,m(!0))}).catch(()=>{});function p(){g.company.list().then(h=>{d=h,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&m()}).catch(()=>{}),g.customers.list().then(h=>{o=h,t.step===1&&!e.querySelector("#w-customer")&&m()}).catch(()=>{}),g.products.list().then(h=>{l=h,t.step===2&&!e.querySelector("#w-catalog")&&m()}).catch(()=>{})}function f(){try{if(r)return;if(!t.dirty){localStorage.removeItem(M);return}localStorage.setItem(M,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function s(){e.querySelectorAll("input[data-p]").forEach(u=>{const y=u.dataset.p==="seller"?t.seller:t.buyer;y[u.dataset.f]=u.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(u=>{const[y,$]=u.dataset.l.split("."),T=t.lines[Number(y)];if(T)if($==="quantity"||$==="unitPriceNet"||$==="vatRate"||$==="discountPercent"){const L=Number(u.value),D=Number.isFinite(L)?L:0;T[$]=$==="discountPercent"?Math.min(Math.max(D,0),100):D}else T[$]=u.value});const h=u=>e.querySelector(`#${u}`)?.value??"";t.issueDate=h("w-issue")||t.issueDate,t.deliveryDate=h("w-delivery")||t.deliveryDate,e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=h("w-title")||t.documentTitle);const k=e.querySelector("#w-notes");k&&(t.notes=k.value),f()}function c(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((k,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${k}</span>`).join("")}</div>`}function m(h=!1){h||s();let k="";if(t.step===0&&(k=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(u=>`<option value="${n(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${n(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("seller",t.seller,!0)}</div>`),t.step===1&&(k=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(u=>`<option value="${n(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${n(u.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("buyer",t.buyer,!1)}</div>`),t.step===2&&(k=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${be.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${l.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${l.map(u=>`<option value="${n(u.id)}">${n(u.sku?`${u.sku} · `:"")}${n(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,y)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${y}.description" value="${n(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${y}.sku" value="${n(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${y}.details" rows="1">${n(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${y}.quantity" type="number" min="0" step="any" value="${n(u.quantity)}" /></label>
						<label>Einheit<input data-l="${y}.unit" value="${n(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${y}.unitPriceNet" type="number" min="0" step="0.01" value="${n(u.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${y}.discountPercent" type="number" min="0" max="100" step="0.1" value="${n(u.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${y}.vatRate">
							${[19,7,0].map($=>`<option ${$===Number(u.vatRate)?"selected":""}>${$}</option>`).join("")}
						</select></label>
						${Number(u.vatRate)===0?`<label>Steuerbefreiung<textarea data-l="${y}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${n(u.exemptionReason)}</textarea></label>`:""}
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
			</div>`),t.step===3){const u=t.lines.map(b=>{const P=Number(b.quantity)||0,J=Number(b.unitPriceNet)||0,V=Math.min(Math.max(Number(b.discountPercent)||0,0),100),ne=j(P*J);return{...b,discount:V,gross:ne,net:j(P*J*(1-V/100))}}).filter(b=>b.description.trim()!==""||b.gross>0),y=new Map;for(const b of u)y.set(Number(b.vatRate)||0,j((y.get(Number(b.vatRate)||0)??0)+b.net));const $=[...y.entries()].sort(([b],[P])=>b-P).map(([b,P])=>({rate:b,net:P,tax:j(P*b/100)})),T=j($.reduce((b,P)=>b+P.net,0)),L=j($.reduce((b,P)=>b+P.tax,0)),D=j(T+L),C=u.some(b=>b.discount>0);k=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${C?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(b=>`<tr>
							<td>${n(b.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${n(b.quantity)} ${n(b.unit)}</td>
							<td class="r">${q(b.unitPriceNet)}</td>
							${C?`<td class="r">${b.discount>0?`${n(b.discount)} %`:"–"}</td><td class="r">${b.discount>0?q(j(b.gross-b.net)):"–"}</td>`:""}
							<td class="r">${n(b.vatRate)} %</td><td class="r"><strong>${q(b.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${q(T)}</td></tr>
						${$.map(b=>`<tr class="sub"><td class="lbl">USt ${n(b.rate)} % auf ${q(b.net)}</td><td class="r">${q(b.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${q(D)}</td></tr>
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${c()}${k}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,m()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",y=d.find($=>$.id===u);y?(t.seller={...t.seller,...y.profile},t.selectedCompany=y.id,m(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",y=o.find($=>$.id===u);y?(t.buyer={...t.buyer,...y.profile},t.selectedCustomer=y.id,m(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,m()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(M),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.push(O()),m()}),e.querySelector("#w-take")?.addEventListener("click",()=>{s();const u=e.querySelector("#w-catalog")?.value??"",y=l.find($=>$.id===u);if(y){const $={description:y.name,sku:y.sku||void 0,details:y.details||void 0,quantity:1,unit:y.unit,unitPriceNet:y.unitPriceNet,vatRate:y.vatRate},T=t.lines.findIndex(L=>!L.description.trim()&&!(L.sku??"").trim()&&!(L.details??"").trim()&&L.unitPriceNet===0);T>=0?t.lines[T]=$:t.lines.push($),t.dirty=!0}m(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(O()),m(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{w(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&w(!0)})}async function w(h){if(!v){v=!0;try{s(),t.error="";const k={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(ee,t.employee.trim())}catch{}let u;t.draftId?u=await g.update(t.draftId,k):(u=await g.create(k),t.draftId=u.id),h&&(u=await g.issue(u.id));try{localStorage.removeItem(M)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,m()}}finally{v=!1}}}e.addEventListener("input",()=>{try{N()}catch{}});function N(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach($=>{const T=$.dataset.p==="seller"?t.seller:t.buyer;T[$.dataset.f]=$.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach($=>{const[T,L]=$.dataset.l.split("."),D=t.lines[Number(T)];D&&(L==="quantity"||L==="unitPriceNet"||L==="vatRate"||L==="discountPercent"?D[L]=Number($.value):D[L]=$.value)});const h=$=>e.querySelector(`#${$}`)?.value??"",k=h("w-issue"),u=h("w-delivery");k&&(t.issueDate=k),u&&(t.deliveryDate=u),e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee"));const y=h("w-title");y&&(t.documentTitle=y),t.notes=e.querySelector("#w-notes")?.value??t.notes,f()}m()}const $e=document.querySelector("#app");function ge(e){const a=!!K(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];$e.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([r,d])=>`<a href="${r}" class="${e===r||r==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function ae(){const e=location.hash||"#/";ge(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await oe(a):e==="#/new"?Q(a):e.startsWith("#/edit/")?Q(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await de(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await ve(a):e==="#/company"?await re(a):e==="#/customers"?await le(a):e==="#/products"?await me(a):e==="#/backup"?await ie(a):e==="#/login"?ue(a):e==="#/logout"?pe():e==="#/status"?await he(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{ae()});ae();
