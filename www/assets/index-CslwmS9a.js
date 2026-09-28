(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))l(d);new MutationObserver(d=>{for(const i of d)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&l(c)}).observe(document,{childList:!0,subtree:!0});function a(d){const i={};return d.integrity&&(i.integrity=d.integrity),d.referrerPolicy&&(i.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?i.credentials="include":d.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function l(d){if(d.ep)return;d.ep=!0;const i=a(d);fetch(d.href,i)}})();const x="einv-token";function j(){try{return localStorage.getItem(x)}catch{return null}}function D(t){try{t?localStorage.setItem(x,t):localStorage.removeItem(x)}catch{}}async function g(t,e){const a=await $(t,{headers:{"content-type":"application/json"},...e});if(!a.ok){const l=await a.json().catch(()=>({}));throw new Error(l.error??`HTTP ${a.status}`)}return await a.json()}async function $(t,e){const a={...e?.headers??{}},l=j();l&&(a.authorization=`Bearer ${l}`);const d=await fetch(t,{...e,headers:a});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function q(t,e){const a=await $(t);if(!a.ok){const c=await a.json().catch(()=>({}));throw new Error(c.error??`Download fehlgeschlagen (HTTP ${a.status})`)}const l=await a.blob(),d=/filename="([^"]+)"/.exec(a.headers.get("content-disposition")??""),i=document.createElement("a");i.href=URL.createObjectURL(l),i.download=d?.[1]??e,document.body.appendChild(i),i.click(),i.remove(),window.setTimeout(()=>URL.revokeObjectURL(i.href),1e4)}async function F(t){const e=await $(t);if(!e.ok){const d=await e.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${e.status})`)}const a=await e.blob(),l=URL.createObjectURL(a);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const y={health:()=>g("/api/health"),list:(t={})=>{const e=new URLSearchParams(t).toString();return g(`/api/invoices${e?`?${e}`:""}`)},get:t=>g(`/api/invoices/${t}`),create:t=>g("/api/invoices",{method:"POST",body:JSON.stringify(t)}),update:(t,e)=>g(`/api/invoices/${t}`,{method:"PATCH",body:JSON.stringify(e)}),issue:t=>g(`/api/invoices/${t}/issue`,{method:"POST"}),validate:t=>g(`/api/invoices/${t}/validate`,{method:"POST"}),pdfUrl:t=>`/api/invoices/${t}.pdf`,xmlUrl:t=>`/api/invoices/${t}.xml`,xlsxUrl:t=>`/api/invoices/${t}.xlsx`,company:{list:()=>g("/api/company-profiles"),getDefault:()=>g("/api/company-profiles/default"),create:(t,e)=>g("/api/company-profiles",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>g(`/api/company-profiles/${t}`,{method:"PUT",body:JSON.stringify(e)})},customers:{list:()=>g("/api/customers"),create:(t,e)=>g("/api/customers",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>g(`/api/customers/${t}`,{method:"PUT",body:JSON.stringify(e)}),remove:t=>g(`/api/customers/${t}`,{method:"DELETE"})},exportUrl:(t={})=>{const e=new URLSearchParams(t).toString();return`/api/invoices/export.xlsx${e?`?${e}`:""}`}};function n(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function k(t){return`${Number(t).toFixed(2)} EUR`}function L(t){return t.split("/").pop()??t}async function C(t){t.innerHTML='<div class="card">Lade Backups…</div>';let e=[],a="",l=!1;async function d(){const c=await $("/api/backups");if(!c.ok)throw new Error("Backups konnten nicht geladen werden");e=await c.json(),i()}function i(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${l?"error":""}">${n(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${e.map(c=>`<div class="row" style="margin-top:8px">
				<strong>${n(L(c.filename))}</strong>
				<span class="muted">${n(c.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(c.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(c.filename)}">Download</button>
				<button class="secondary" data-restore="${n(c.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,t.querySelector("#b-now")?.addEventListener("click",async()=>{try{const c=await $("/api/backups",{method:"POST"});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const v=await c.json();a=`Gesichert: ${L(v.filename)}`,l=!1,await d()}catch(c){a=c.message,l=!0,i()}}),t.querySelectorAll("[data-dl]").forEach(c=>c.addEventListener("click",async()=>{const v=c.dataset.dl??"";try{await q(`/api/backups/file/${L(v)}`,L(v))}catch(m){a=m.message,l=!0,i()}})),t.querySelectorAll("[data-restore]").forEach(c=>c.addEventListener("click",async()=>{const v=c.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${L(v)}? Die aktuelle Datenbank wird ersetzt.`))try{const m=await $("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:v})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const s=await m.json();a=`Wiederhergestellt: ${s.invoices} Rechnungen, ${s.templates} Vorlagen${s.fileErrors.length>0?` (${s.fileErrors.length} Dateifehler)`:""}`,l=!1,i()}catch(m){a=m.message,l=!0,i()}})),t.querySelector("#b-upload")?.addEventListener("click",async()=>{const c=t.querySelector("#b-file")?.files?.[0];if(!c){a="Bitte zuerst eine ZIP-Datei wählen",l=!0,i();return}if(window.confirm(`Wirklich wiederherstellen aus ${c.name}? Die aktuelle Datenbank wird ersetzt.`))try{const v=await new Promise((r,u)=>{const o=new FileReader;o.onload=()=>r(String(o.result).split(",")[1]),o.onerror=()=>u(new Error("Datei nicht lesbar")),o.readAsDataURL(c)}),m=await $("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:v})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const s=await m.json();a=`Wiederhergestellt: ${s.invoices} Rechnungen, ${s.templates} Vorlagen`,l=!1,await d()}catch(v){a=v.message,l=!0,i()}})}try{await d()}catch(c){t.innerHTML=`<div class="card error">${n(c.message)}</div>`}}const O=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function w(t,e,a){return`<label>${a}<input data-f="${e}" value="${n(t[e]??"")}" /></label>`}async function J(t){t.innerHTML='<div class="card">Lade Firmendaten…</div>';let e=null,a="",l=!1;try{e=await y.company.getDefault(),e||(e=(await y.company.list())[0]??null)}catch(i){t.innerHTML=`<div class="card error">${n(i.message)}</div>`;return}function d(){const i=e?.profile??O();t.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(e?.name??"Meine Firma")}" /></label>
			${w(i,"name","Firmenname")}
			${w(i,"street","Straße")}
			<div class="grid2">${w(i,"zip","PLZ")}${w(i,"city","Ort")}</div>
			<div class="grid2">${w(i,"country","Land")}${w(i,"email","E-Mail")}</div>
			<div class="grid2">${w(i,"phone","Telefon")}${w(i,"website","Webseite")}</div>
			<div class="grid2">${w(i,"vatId","USt-IdNr.")}${w(i,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${w(i,"iban","IBAN")}${w(i,"bic","BIC")}</div>
			${a?`<p class="${l?"error":""}">${n(a)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,t.querySelector("#c-save")?.addEventListener("click",async()=>{const c={...O()};t.querySelectorAll("input[data-f]").forEach(m=>{c[m.dataset.f]=m.value});const v=t.querySelector("#c-name")?.value.trim()||"Meine Firma";try{e?e=await y.company.update(e.id,{name:v,profile:c}):e=await y.company.create(v,c),a="Gespeichert.",l=!1,d()}catch(m){a=m.message,l=!0,d()}})}d()}const U=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function S(t,e,a){return`<label>${a}<input data-f="${e}" value="${n(t[e]??"")}" /></label>`}async function V(t){t.innerHTML='<div class="card">Lade Kunden…</div>';let e=[],a=null,l=!1,d="",i=!1;async function c(){e=await y.customers.list(),m()}function v(r,u){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(u)}" /></label>
		${S(r,"name","Firmenname")}
		${S(r,"street","Straße")}
		<div class="grid2">${S(r,"zip","PLZ")}${S(r,"city","Ort")}</div>
		<div class="grid2">${S(r,"country","Land")}${S(r,"email","E-Mail")}</div>
		<div class="grid2">${S(r,"phone","Telefon")}${S(r,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(r.customerNumber)}" /></label>`}function m(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${e.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${n(r.name)}</strong>
				<span class="muted">${n(r.profile.city||"")}</span>
				<button class="secondary" data-edit="${r.id}">Bearbeiten</button>
				<button class="danger" data-del="${r.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${a||l?`<div class="card"><h3>${l?"Neuer Kunde":n(a?.name??"")}</h3>
			${v(a?.profile??U(),a?.name??"")}
			${d?`<p class="${i?"error":""}">${n(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#k-new")?.addEventListener("click",()=>{a=null,l=!0,d="",m()}),t.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{a=e.find(u=>u.id===r.dataset.edit)??null,l=!1,d="",m()})),t.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await y.customers.remove(r.dataset.del??""),await c()}catch(u){d=u.message,i=!0,m()}})),t.querySelector("#k-cancel")?.addEventListener("click",()=>{a=null,l=!1,d="",m()}),t.querySelector("#k-save")?.addEventListener("click",()=>{s()})}async function s(){const r={...U()};t.querySelectorAll("input[data-f]").forEach(o=>{r[o.dataset.f]=o.value});const u=t.querySelector("#k-name")?.value.trim()||r.name.trim()||"Kunde";try{l?await y.customers.create(u,r):a&&await y.customers.update(a.id,{name:u,profile:r}),a=null,l=!1,d="",await c()}catch(o){d=o.message,i=!0,m()}}try{await c()}catch(r){t.innerHTML=`<div class="card error">${n(r.message)}</div>`}}function W(t){return`<span class="badge ${t}">${t}</span>`}async function G(t){t.innerHTML=`
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
		<div id="list-err"></div>`;const e=t.querySelector("#f-status"),a=t.querySelector("#f-q"),l=t.querySelector("#list"),d=t.querySelector("#list-err");function i(v){d.innerHTML=`<div class="card error">${n(v.message)}</div>`}async function c(){const v={};e.value&&(v.status=e.value),a.value.trim()&&(v.q=a.value.trim());try{const m=await y.list(v);l.innerHTML=m.map(s=>`<div class="card"><div class="row">
					<strong>${n(s.number??"(Entwurf)")}</strong>${W(s.status)}
					<span>${n(s.buyer.name||"—")}</span>
					<span>${k(s.totals.grossTotal)}</span>
					<a href="#/invoices/${n(s.id)}">Ansehen</a>
					${s.pdfPath?`<button class="secondary" data-dl="pdf:${n(s.id)}:${n(s.number??"rechnung")}">PDF ↓</button>`:""}
					${s.xml?`<button class="secondary" data-dl="xml:${n(s.id)}:${n(s.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(s=>s.addEventListener("click",async()=>{const[r,u,o]=(s.dataset.dl??"").split(":"),p=r==="pdf"?y.pdfUrl(u):y.xmlUrl(u);try{await q(p,`${o}.${r}`)}catch(h){i(h)}}))}catch(m){l.innerHTML=`<div class="card error">${n(m.message)}</div>`}}e.onchange=()=>{c()},a.oninput=()=>{c()},t.querySelector("#f-export")?.addEventListener("click",async()=>{const v={};e.value&&(v.status=e.value),a.value.trim()&&(v.q=a.value.trim());try{await q(y.exportUrl(v),"export.xlsx")}catch(m){i(m)}}),await c()}async function Z(t,e){t.innerHTML='<div class="card">Lade…</div>';try{const a=await y.get(e);t.innerHTML=`
			<div class="card"><div class="row">
				<strong>${n(a.number??"(Entwurf)")}</strong>
				<span class="badge ${a.status}">${a.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${n(a.seller.name)}<br />${n(a.seller.street)}<br />${n(a.seller.zip)} ${n(a.seller.city)}</div>
				<div><strong>Käufer</strong><br />${n(a.buyer.name)}<br />${n(a.buyer.street)}<br />${n(a.buyer.zip)} ${n(a.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${n(a.issueDate)} · Leistung: ${n(a.deliveryDate)}${a.dueDate?` · Fällig: ${n(a.dueDate)}`:""}</p>
			<table class="lines"><tr><th>#</th><th>Beschreibung</th><th>Menge</th><th>USt</th><th>Netto</th></tr>
			${a.lines.map((i,c)=>`<tr><td>${c+1}</td><td>${n(i.description)}</td><td>${i.quantity} ${n(i.unit)}</td><td>${i.vatRate} %</td><td>${k(i.quantity*i.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${k(a.totals.grossTotal)}</strong> <span class="muted">(netto ${k(a.totals.netTotal)} + USt ${k(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${n(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
				${a.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
				${a.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
				${a.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div></div>`;const l=t.querySelector("#d-out"),d=i=>{l.innerHTML=`<p class="error">${n(i.message)}</p>`};t.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const c=i.dataset.dl,v=c==="pdf"?y.pdfUrl(a.id):c==="xml"?y.xmlUrl(a.id):y.xlsxUrl(a.id);try{await q(v,`${a.number??"rechnung"}.${c}`)}catch(m){d(m)}})),t.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await F(y.pdfUrl(a.id))}catch(i){d(i)}}),t.querySelector("#d-validate")?.addEventListener("click",async()=>{l.innerHTML='<p class="muted">Validiere…</p>';try{const i=await y.validate(a.id);l.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(c=>`<li class="error">${n(c)}</li>`).join("")}</ul>`}catch(i){l.innerHTML=`<p class="error">${n(i.message)}</p>`}}),t.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await y.issue(a.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){l.innerHTML=`<p class="error">${n(i.message)}</p>`}})}catch(a){t.innerHTML=`<div class="card error">${n(a.message)}</div>`}}function _(t){const e=j();t.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(e??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${e?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,t.querySelector("#l-save")?.addEventListener("click",()=>{const a=t.querySelector("#l-token")?.value.trim()??"";D(a||null),location.hash="#/"}),t.querySelector("#l-out")?.addEventListener("click",()=>{D(null),location.hash="#/login",location.reload()})}function X(){D(null),location.hash="#/login"}async function Y(t){try{const e=await y.health();t.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(e.version)} · Schema: ${n(String(e.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(e.counts,null,2))}</pre></div>`}catch(e){t.innerHTML=`<div class="card error">API nicht erreichbar: ${n(e.message)}</div>`}}const Q=["title","meta","parties","positions","totals"],H=["payment","notes"];async function ee(t){t.innerHTML='<div class="card">Lade Vorlagen…</div>';let e=[],a=null,l="";async function d(){e=await i(),v()}async function i(){const s=await $("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function c(s){const r=s.definition,u=(o,p,h)=>`<label><input type="checkbox" data-f="blocks.${o}" ${r.blocks[o]?"checked":""} ${h?"disabled":""} style="width:auto" /> ${p}${h?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${Q.map(o=>u(o,`Block ${o}`,!0)).join("")}
		${H.map(o=>u(o,`Block ${o}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${r.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${r.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${r.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${r.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
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
				${["right","left","center"].map(o=>`<option ${r.logo?.position===o?"selected":""}>${o}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${n(r.logo.path)}</p>`:""}`}function v(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${e.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${n(s.name)}</strong><span class="muted">v${s.version}</span>
				${s.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${s.id}">Vorschau</button>
				${s.isDefault?"":`<button class="secondary" data-def="${s.id}">Standard</button>`}
				${s.isDefault?"":`<button class="danger" data-del="${s.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${a?`<div class="card"><h3>${n(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${c(a)}
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#t-new")?.addEventListener("click",async()=>{const u=(await(await $("/api/templates")).json())[0];if(!u){l="Keine Basisvorlage vorhanden",v();return}a={...structuredClone(u),id:"neu",name:"Neu",version:1,isDefault:!1},l="",v()}),t.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const r=e.find(u=>u.id===s.dataset.edit);r&&(a=structuredClone(r),l="",v())})),t.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const r=e.find(p=>p.id===s.dataset.prev);if(!r)return;const u=await $("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!u.ok){l="Vorschau fehlgeschlagen",v();return}const o=await u.blob();window.open(URL.createObjectURL(o),"_blank")})),t.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{await $(`/api/templates/${s.dataset.def}/default`,{method:"POST"}),a=null,await d()})),t.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const r=await $(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!r.ok){l=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",v();return}await d()})),t.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,l="",v()}),t.querySelector("#t-save")?.addEventListener("click",()=>{m()})}async function m(){if(!a)return;const s=structuredClone(a.definition);s.name=(t.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=t.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=t.querySelector("#t-c2")?.value??s.colors.text;for(const r of H)s.blocks[r]=t.querySelector(`[data-f="blocks.${r}"]`)?.checked??s.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])s[r]=t.querySelector(`[data-f="${r}"]`)?.checked??!1;s.footerText=t.querySelector("#t-footer")?.value??"",s.introText=t.querySelector("#t-intro")?.value??"",s.closingText=t.querySelector("#t-closing")?.value??"",s.signatureName=t.querySelector("#t-sign")?.value??"",s.headerExtra=t.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=t.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(t.querySelector("#t-lw")?.value??30));try{let r=a.id;if(r==="neu"){const o=await $("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:s.name,definition:s})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await o.json()).id}else{const o=await $(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:s.name,definition:s})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const u=t.querySelector("#t-logo")?.files?.[0];if(u){const o=await new Promise((h,f)=>{const b=new FileReader;b.onload=()=>h(String(b.result).split(",")[1]),b.onerror=()=>f(new Error("Datei nicht lesbar")),b.readAsDataURL(u)}),p=await $(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:u.name,mime:u.type,dataBase64:o})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,l="",await d()}catch(r){l=r.message,v()}}try{await d()}catch(s){t.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const R=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),A=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),T="einv-wizard-v1",B="einv-employee";function te(){try{return localStorage.getItem(B)??""}catch{return""}}function I(){return new Date().toISOString().slice(0,10)}function M(){return{step:0,seller:R(),buyer:R(),lines:[A()],issueDate:I(),deliveryDate:I(),dueDate:"",employee:te(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,error:"",savedAt:new Date().toISOString()}}function P(t){return t.seller.name.trim()!==""||t.buyer.name.trim()!==""||t.lines.some(e=>e.description.trim()!==""||e.unitPriceNet!==0)}function ae(){try{const t=localStorage.getItem(T);if(!t)return null;const e=JSON.parse(t);return!e||!Array.isArray(e.lines)||!e.seller||!e.buyer?null:{...M(),...e,error:"",step:Math.min(Number(e.step)||0,3)}}catch{return null}}function z(t,e,a){return`
		<label>Name<input data-p="${t}" data-f="name" value="${n(e.name)}" /></label>
		<label>Straße<input data-p="${t}" data-f="street" value="${n(e.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${t}" data-f="zip" value="${n(e.zip)}" /></label>
			<label>Ort<input data-p="${t}" data-f="city" value="${n(e.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${t}" data-f="country" value="${n(e.country)}" /></label>
			<label>E-Mail<input data-p="${t}" data-f="email" value="${n(e.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${t}" data-f="phone" value="${n(e.phone)}" /></label>
			${a?`<label>Webseite<input data-p="${t}" data-f="website" value="${n(e.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${t}" data-f="contactName" value="${n(e.contactName)}" /></label>`}
		</div>
		${a?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${t}" data-f="vatId" value="${n(e.vatId)}" /></label>
			<label>Steuernummer<input data-p="${t}" data-f="taxNumber" value="${n(e.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${t}" data-f="iban" value="${n(e.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${t}" data-f="customerNumber" value="${n(e.customerNumber)}" /></label>`}`}const ne=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function ie(t){let e=M();const a=ae();if(a&&P(a)&&!a.draftId){t.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(a.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,t.querySelector("#w-resume")?.addEventListener("click",()=>{e=a,m()}),t.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(T),m()});return}a&&P(a)&&(e=a);let l=[];y.company.list().then(u=>{l=u,(e.step===0||e.step===1)&&!t.querySelector("#w-company")&&!t.querySelector("#w-customer")&&m()}).catch(()=>{});let d=[];y.customers.list().then(u=>{d=u,e.step===1&&!t.querySelector("#w-customer")&&m()}).catch(()=>{}),P(e)||y.company.getDefault().then(u=>{u&&!e.seller.name.trim()&&u.profile.name.trim()&&(e.seller={...e.seller,...u.profile},e.selectedCompany=u.id,m(!0))}).catch(()=>{});function i(){try{localStorage.setItem(T,JSON.stringify({...e,error:"",savedAt:new Date().toISOString()}))}catch{}}function c(){t.querySelectorAll("input[data-p]").forEach(o=>{const p=o.dataset.p==="seller"?e.seller:e.buyer;p[o.dataset.f]=o.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(o=>{const[p,h]=o.dataset.l.split("."),f=e.lines[Number(p)];f&&(h==="quantity"||h==="unitPriceNet"||h==="vatRate"?f[h]=Number(o.value):f[h]=o.value)});const u=o=>t.querySelector(`#${o}`)?.value??"";e.issueDate=u("w-issue")||e.issueDate,e.deliveryDate=u("w-delivery")||e.deliveryDate,e.dueDate=u("w-due"),t.querySelector("#w-employee")&&(e.employee=u("w-employee")),e.documentTitle=u("w-title")||"Rechnung",e.notes=t.querySelector("#w-notes")?.value??"",i()}function v(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((o,p)=>`<span class="${p===e.step?"on":""}">${p+1}. ${o}</span>`).join("")}</div>`}function m(u=!1){u||c();let o="";if(e.step===0&&(o=`<div class="card"><h3>Verkäufer</h3>
				${l.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${l.map(p=>`<option value="${n(p.id)}" ${e.selectedCompany===p.id?"selected":""}>${n(p.name)}${p.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${z("seller",e.seller,!0)}</div>`),e.step===1&&(o=`<div class="card"><h3>Käufer</h3>
				${d.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${d.map(p=>`<option value="${n(p.id)}" ${e.selectedCustomer===p.id?"selected":""}>${n(p.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${z("buyer",e.buyer,!1)}</div>`),e.step===2&&(o=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${ne.map(p=>`<option ${p===e.documentTitle?"selected":""}>${p}</option>`).join("")}
				</select></label>
				${e.lines.map((p,h)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${h}.description" value="${n(p.description)}" /></label>
						<label>Art.Nr.<input data-l="${h}.sku" value="${n(p.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${h}.details" rows="1">${n(p.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${h}.quantity" type="number" min="0" step="any" value="${p.quantity}" /></label>
						<label>Einheit<input data-l="${h}.unit" value="${n(p.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${h}.unitPriceNet" type="number" min="0" step="0.01" value="${p.unitPriceNet}" /></label>
						<label>USt %<select data-l="${h}.vatRate">
							${[19,7,0].map(f=>`<option ${f===p.vatRate?"selected":""}>${f}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${h}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(e.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(e.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(e.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(e.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(e.notes)}</textarea></label>
			</div>`),e.step===3){const p=e.lines.reduce((f,b)=>f+b.quantity*b.unitPriceNet,0),h=e.lines.reduce((f,b)=>f+b.quantity*b.unitPriceNet*b.vatRate/100,0);o=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(e.documentTitle)}</strong> · ${n(e.seller.name||"—")} → ${n(e.buyer.name||"—")} · ${e.lines.length} Positionen</p>
				<p><strong>ca. ${k(Math.round((p+h)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}t.innerHTML=`${v()}${o}
			${e.error?`<div class="card error">${n(e.error)}</div>`:""}
			<div class="row">
				${e.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${e.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,t.querySelector("#w-back")?.addEventListener("click",()=>{e.step--,m()}),t.querySelector("#w-company")?.addEventListener("change",()=>{const p=t.querySelector("#w-company")?.value??"",h=l.find(f=>f.id===p);h?(e.seller={...e.seller,...h.profile},e.selectedCompany=h.id,m(!0)):e.selectedCompany=null}),t.querySelector("#w-customer")?.addEventListener("change",()=>{const p=t.querySelector("#w-customer")?.value??"",h=d.find(f=>f.id===p);h?(e.buyer={...e.buyer,...h.profile},e.selectedCustomer=h.id,m(!0)):e.selectedCustomer=null}),t.querySelector("#w-next")?.addEventListener("click",()=>{e.step++,m()}),t.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(T),e=M(),m())}),t.querySelector("#w-add")?.addEventListener("click",()=>{c(),e.lines.push(A()),m()}),t.querySelectorAll("[data-del]").forEach(p=>p.addEventListener("click",()=>{c(),e.lines.splice(Number(p.dataset.del),1),e.lines.length===0&&e.lines.push(A()),m()})),t.querySelector("#w-save")?.addEventListener("click",()=>{s(!1)}),t.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&s(!0)})}async function s(u){c(),e.error="";const o={seller:e.seller,buyer:e.buyer,lines:e.lines,issueDate:e.issueDate,deliveryDate:e.deliveryDate,dueDate:e.dueDate||void 0,currency:"EUR",employeeCode:e.employee.trim()||void 0,documentTitle:e.documentTitle,notes:e.notes||void 0};try{if(e.employee.trim())try{localStorage.setItem(B,e.employee.trim())}catch{}let p;e.draftId?p=await y.update(e.draftId,o):(p=await y.create(o),e.draftId=p.id,i()),u&&(p=await y.issue(p.id),localStorage.removeItem(T)),location.hash=`#/invoices/${p.id}`}catch(p){e.error=p.message,m()}}t.addEventListener("input",()=>{try{r()}catch{}});function r(){t.querySelectorAll("input[data-p]").forEach(f=>{const b=f.dataset.p==="seller"?e.seller:e.buyer;b[f.dataset.f]=f.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(f=>{const[b,E]=f.dataset.l.split("."),N=e.lines[Number(b)];N&&(E==="quantity"||E==="unitPriceNet"||E==="vatRate"?N[E]=Number(f.value):N[E]=f.value)});const u=f=>t.querySelector(`#${f}`)?.value??"",o=u("w-issue"),p=u("w-delivery");o&&(e.issueDate=o),p&&(e.deliveryDate=p),e.dueDate=u("w-due"),t.querySelector("#w-employee")&&(e.employee=u("w-employee"));const h=u("w-title");h&&(e.documentTitle=h),e.notes=t.querySelector("#w-notes")?.value??e.notes,i()}m()}const se=document.querySelector("#app");function re(t){const e=!!j(),a=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/backup","Backup"],["#/status","Status"],[e?"#/logout":"#/login",e?"Logout":"Login"]];se.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${a.map(([l,d])=>`<a href="${l}" class="${t===l||l==="#/"&&t.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function K(){const t=location.hash||"#/";re(t);const e=document.querySelector("#view");t==="#/"||t==="#"?await G(e):t==="#/new"?ie(e):t.startsWith("#/invoices/")?await Z(e,decodeURIComponent(t.slice(11))):t==="#/templates"?await ee(e):t==="#/company"?await J(e):t==="#/customers"?await V(e):t==="#/backup"?await C(e):t==="#/login"?_(e):t==="#/logout"?X():t==="#/status"?await Y(e):e.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{K()});K();
