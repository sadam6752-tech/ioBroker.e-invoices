(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))l(d);new MutationObserver(d=>{for(const s of d)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&l(c)}).observe(document,{childList:!0,subtree:!0});function t(d){const s={};return d.integrity&&(s.integrity=d.integrity),d.referrerPolicy&&(s.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?s.credentials="include":d.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function l(d){if(d.ep)return;d.ep=!0;const s=t(d);fetch(d.href,s)}})();const O="einv-token";function H(){try{return localStorage.getItem(O)}catch{return null}}function U(e){try{e?localStorage.setItem(O,e):localStorage.removeItem(O)}catch{}}async function w(e,a){const t=await S(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`HTTP ${t.status}`)}return await t.json()}async function S(e,a){const t={...a?.headers??{}},l=H();l&&(t.authorization=`Bearer ${l}`);const d=await fetch(e,{...a,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function A(e,a){const t=await S(e);if(!t.ok){const c=await t.json().catch(()=>({}));throw new Error(c.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const l=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),s=document.createElement("a");s.href=URL.createObjectURL(l),s.download=d?.[1]??a,document.body.appendChild(s),s.click(),s.remove(),window.setTimeout(()=>URL.revokeObjectURL(s.href),1e4)}async function G(e){const a=await S(e);if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),l=URL.createObjectURL(t);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const v={health:()=>w("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return w(`/api/invoices${a?`?${a}`:""}`)},get:e=>w(`/api/invoices/${e}`),create:e=>w("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>w(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>w(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>w(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>w("/api/company-profiles"),getDefault:()=>w("/api/company-profiles/default"),create:(e,a)=>w("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>w(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>w("/api/customers"),create:(e,a)=>w("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>w(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>w(`/api/customers/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function T(e){return`${Number(e).toFixed(2)} EUR`}function N(e){return e.split("/").pop()??e}async function Z(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",l=!1;async function d(){const c=await S("/api/backups");if(!c.ok)throw new Error("Backups konnten nicht geladen werden");a=await c.json(),s()}function s(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(c=>`<div class="row" style="margin-top:8px">
				<strong>${n(N(c.filename))}</strong>
				<span class="muted">${n(c.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(c.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(c.filename)}">Download</button>
				<button class="secondary" data-restore="${n(c.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const c=await S("/api/backups",{method:"POST"});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const m=await c.json();t=`Gesichert: ${N(m.filename)}`,l=!1,await d()}catch(c){t=c.message,l=!0,s()}}),e.querySelectorAll("[data-dl]").forEach(c=>c.addEventListener("click",async()=>{const m=c.dataset.dl??"";try{await A(`/api/backups/file/${N(m)}`,N(m))}catch(h){t=h.message,l=!0,s()}})),e.querySelectorAll("[data-restore]").forEach(c=>c.addEventListener("click",async()=>{const m=c.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${N(m)}? Die aktuelle Datenbank wird ersetzt.`))try{const h=await S("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:m})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const i=await h.json();t=`Wiederhergestellt: ${i.invoices} Rechnungen, ${i.templates} Vorlagen${i.fileErrors.length>0?` (${i.fileErrors.length} Dateifehler)`:""}`,l=!1,await d()}catch(h){t=h.message,l=!0,s()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const c=e.querySelector("#b-file")?.files?.[0];if(!c){t="Bitte zuerst eine ZIP-Datei wählen",l=!0,s();return}if(window.confirm(`Wirklich wiederherstellen aus ${c.name}? Die aktuelle Datenbank wird ersetzt.`))try{const m=await new Promise((r,u)=>{const f=new FileReader;f.onload=()=>r(String(f.result).split(",")[1]),f.onerror=()=>u(new Error("Datei nicht lesbar")),f.readAsDataURL(c)}),h=await S("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:m})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const i=await h.json();t=`Wiederhergestellt: ${i.invoices} Rechnungen, ${i.templates} Vorlagen`,l=!1,await d()}catch(m){t=m.message,l=!0,s()}})}try{await d()}catch(c){e.innerHTML=`<div class="card error">${n(c.message)}</div>`}}const R=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function k(e,a,t){return`<label>${t}<input data-f="${a}" value="${n(e[a]??"")}" /></label>`}async function _(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",l=!1;try{a=await v.company.getDefault(),a||(a=(await v.company.list())[0]??null)}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`;return}function d(){const s=a?.profile??R();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${k(s,"name","Firmenname")}
			${k(s,"street","Straße")}
			<div class="grid2">${k(s,"zip","PLZ")}${k(s,"city","Ort")}</div>
			<div class="grid2">${k(s,"country","Land")}${k(s,"email","E-Mail")}</div>
			<div class="grid2">${k(s,"phone","Telefon")}${k(s,"website","Webseite")}</div>
			<div class="grid2">${k(s,"vatId","USt-IdNr.")}${k(s,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${k(s,"bankName","Bankname")}${k(s,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(s.bic??"")}" /></label>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const c={...R()};e.querySelectorAll("input[data-f]").forEach(h=>{c[h.dataset.f]=h.value});const m=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await v.company.update(a.id,{name:m,profile:c}):a=await v.company.create(m,c),t="Gespeichert.",l=!1,d()}catch(h){t=h.message,l=!0,d()}})}d()}const B=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function L(e,a,t){return`<label>${t}<input data-f="${a}" value="${n(e[a]??"")}" /></label>`}async function X(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,l=!1,d="",s=!1;async function c(){a=await v.customers.list(),h()}function m(r,u){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(u)}" /></label>
		${L(r,"name","Firmenname")}
		${L(r,"street","Straße")}
		<div class="grid2">${L(r,"zip","PLZ")}${L(r,"city","Ort")}</div>
		<div class="grid2">${L(r,"country","Land")}${L(r,"email","E-Mail")}</div>
		<div class="grid2">${L(r,"phone","Telefon")}${L(r,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(r.customerNumber)}" /></label>`}function h(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${n(r.name)}</strong>
				<span class="muted">${n(r.profile.city||"")}</span>
				<button class="secondary" data-edit="${r.id}">Bearbeiten</button>
				<button class="danger" data-del="${r.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||l?`<div class="card"><h3>${l?"Neuer Kunde":n(t?.name??"")}</h3>
			${m(t?.profile??B(),t?.name??"")}
			${d?`<p class="${s?"error":""}">${n(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,l=!0,d="",h()}),e.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{t=a.find(u=>u.id===r.dataset.edit)??null,l=!1,d="",h()})),e.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await v.customers.remove(r.dataset.del??""),await c()}catch(u){d=u.message,s=!0,h()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,l=!1,d="",h()}),e.querySelector("#k-save")?.addEventListener("click",()=>{i()})}async function i(){const r={...B()};e.querySelectorAll("input[data-f]").forEach(f=>{r[f.dataset.f]=f.value});const u=e.querySelector("#k-name")?.value.trim()||r.name.trim()||"Kunde";try{l?await v.customers.create(u,r):t&&await v.customers.update(t.id,{name:u,profile:r}),t=null,l=!1,d="",await c()}catch(f){d=f.message,s=!0,h()}}try{await c()}catch(r){e.innerHTML=`<div class="card error">${n(r.message)}</div>`}}function Y(e){return`<span class="badge ${e}">${e}</span>`}async function Q(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),l=e.querySelector("#list"),d=e.querySelector("#list-err");function s(m){d.innerHTML=`<div class="card error">${n(m.message)}</div>`}async function c(){const m={};a.value&&(m.status=a.value),t.value.trim()&&(m.q=t.value.trim());try{const h=await v.list(m);l.innerHTML=h.map(i=>`<div class="card"><div class="row">
					<strong>${n(i.number??"(Entwurf)")}</strong>${Y(i.status)}
					<span>${n(i.buyer.name||"—")}</span>
					<span>${T(i.totals.grossTotal)}</span>
					<a href="#/invoices/${n(i.id)}">Ansehen</a>
					${i.status==="draft"?`<a href="#/edit/${n(i.id)}">Bearbeiten</a>`:""}
					${i.pdfPath?`<button class="secondary" data-dl="pdf:${n(i.id)}:${n(i.number??"rechnung")}">PDF ↓</button>`:""}
					${i.xml?`<button class="secondary" data-dl="xml:${n(i.id)}:${n(i.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const[r,u,f]=(i.dataset.dl??"").split(":"),E=r==="pdf"?v.pdfUrl(u):v.xmlUrl(u);try{await A(E,`${f}.${r}`)}catch(p){s(p)}}))}catch(h){l.innerHTML=`<div class="card error">${n(h.message)}</div>`}}a.onchange=()=>{c()},t.oninput=()=>{c()},e.querySelector("#f-export")?.addEventListener("click",async()=>{const m={};a.value&&(m.status=a.value),t.value.trim()&&(m.q=t.value.trim());try{await A(v.exportUrl(m),"export.xlsx")}catch(h){s(h)}}),await c()}async function ee(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await v.get(a);e.innerHTML=`
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
			${t.lines.map((s,c)=>{const m=s.unitPriceNet*(1-(s.discountPercent??0)/100);return`<tr><td>${c+1}</td><td>${n(s.description)}${s.sku?` (${n(s.sku)})`:""}</td><td>${s.quantity} ${n(s.unit)}</td><td>${s.vatRate} %</td><td>${T(Math.round(s.quantity*m*100)/100)}</td></tr>`}).join("")}
			</table>
			<p><strong>Gesamt: ${T(t.totals.grossTotal)}</strong> <span class="muted">(netto ${T(t.totals.netTotal)} + USt ${T(t.totals.taxTotal)})</span></p>
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
			</div><div id="d-out"></div></div>`;const l=e.querySelector("#d-out"),d=s=>{l.innerHTML=`<p class="error">${n(s.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(s=>s.addEventListener("click",async()=>{const c=s.dataset.dl,m=c==="pdf"?v.pdfUrl(t.id):c==="xml"?v.xmlUrl(t.id):v.xlsxUrl(t.id);try{await A(m,`${t.number??"rechnung"}.${c}`)}catch(h){d(h)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await G(v.pdfUrl(t.id))}catch(s){d(s)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{l.innerHTML='<p class="muted">Validiere…</p>';try{const s=await v.validate(t.id);l.innerHTML=s.formatErrors.length+s.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...s.formatErrors,...s.businessErrors].map(c=>`<li class="error">${n(c)}</li>`).join("")}</ul>`}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const s=await v.issue(t.id);location.hash=`#/invoices/${s.id}`,location.reload()}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function te(e){const a=H();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";U(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{U(null),location.hash="#/login",location.reload()})}function ae(){U(null),location.hash="#/login"}async function ne(e){try{const a=await v.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const ie=["title","meta","parties","positions","totals"],z=["payment","notes"];async function se(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,l="";async function d(){a=await s(),m()}async function s(){const i=await S("/api/templates");if(!i.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await i.json()}function c(i){const r=i.definition,u=(f,E,p)=>`<label><input type="checkbox" data-f="blocks.${f}" ${r.blocks[f]?"checked":""} ${p?"disabled":""} style="width:auto" /> ${E}${p?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(i.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${ie.map(f=>u(f,`Block ${f}`,!0)).join("")}
		${z.map(f=>u(f,`Block ${f}`,!1)).join("")}
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
				${["right","left","center"].map(f=>`<option ${r.logo?.position===f?"selected":""}>${f}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${n(r.logo.path)}</p>`:""}`}function m(){e.innerHTML=`
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
		${t?`<div class="card"><h3>${n(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${c(t)}
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const u=(await(await S("/api/templates")).json())[0];if(!u){l="Keine Basisvorlage vorhanden",m();return}t={...structuredClone(u),id:"neu",name:"Neu",version:1,isDefault:!1},l="",m()}catch(i){l=i.message,m()}}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{const r=a.find(u=>u.id===i.dataset.edit);r&&(t=structuredClone(r),l="",m())})),e.querySelectorAll("[data-prev]").forEach(i=>i.addEventListener("click",async()=>{const r=a.find(u=>u.id===i.dataset.prev);if(r)try{const u=await S("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!u.ok){const E=await u.json().catch(()=>({}));throw new Error(E.error??"Vorschau fehlgeschlagen")}const f=await u.blob();window.open(URL.createObjectURL(f),"_blank")}catch(u){l=u.message,m()}})),e.querySelectorAll("[data-def]").forEach(i=>i.addEventListener("click",async()=>{try{if(!(await S(`/api/templates/${i.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await d()}catch(r){l=r.message,m()}})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{const r=await S(`/api/templates/${i.dataset.del}`,{method:"DELETE"});if(!r.ok){l=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",m();return}await d()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,l="",m()}),e.querySelector("#t-save")?.addEventListener("click",()=>{h()})}async function h(){if(!t)return;const i=structuredClone(t.definition);i.name=(e.querySelector("#t-name")?.value??i.name).trim(),i.colors.primary=e.querySelector("#t-c1")?.value??i.colors.primary,i.colors.text=e.querySelector("#t-c2")?.value??i.colors.text;for(const r of z)i.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??i.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])i[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;i.footerText=e.querySelector("#t-footer")?.value??"",i.introText=e.querySelector("#t-intro")?.value??"",i.closingText=e.querySelector("#t-closing")?.value??"",i.signatureName=e.querySelector("#t-sign")?.value??"",i.headerExtra=e.querySelector("#t-hextra")?.value??"",i.logo&&(i.logo.position=e.querySelector("#t-lpos")?.value??"right",i.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30));try{let r=t.id;if(r==="neu"){const f=await S("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:i.name,definition:i})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await f.json()).id}else{const f=await S(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:i.name,definition:i})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const u=e.querySelector("#t-logo")?.files?.[0];if(u){const f=await new Promise((p,g)=>{const o=new FileReader;o.onload=()=>p(String(o.result).split(",")[1]),o.onerror=()=>g(new Error("Datei nicht lesbar")),o.readAsDataURL(u)}),E=await S(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:u.name,mime:u.type,dataBase64:f})});if(!E.ok)throw new Error((await E.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,l="",await d()}catch(r){l=r.message,m()}}try{await d()}catch(i){e.innerHTML=`<div class="card error">${n(i.message)}</div>`}}const I=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),x=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),P="einv-wizard-v1",J="einv-employee";function V(){try{return localStorage.getItem(J)??""}catch{return""}}function F(){return new Date().toISOString().slice(0,10)}function D(){return{step:0,seller:I(),buyer:I(),lines:[x()],issueDate:F(),deliveryDate:F(),dueDate:"",employee:V(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,error:"",savedAt:new Date().toISOString()}}function j(e){return e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0)}function re(){try{const e=localStorage.getItem(P);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...D(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function K(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" /></label>`}`}const le=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function C(e,a){let t=D();const l=!!a;let d=[],s=[];if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',v.get(a).then(p=>{if(p.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(p.status)}).</div>`;return}t={...D(),seller:p.seller,buyer:p.buyer,lines:p.lines.length>0?p.lines:[x()],issueDate:p.issueDate,deliveryDate:p.deliveryDate,dueDate:p.dueDate??"",employee:p.employeeCode??V(),documentTitle:p.documentTitle,notes:p.notes??"",draftId:p.id},m(),u()}).catch(p=>{e.innerHTML=`<div class="card error">${n(p.message)}</div>`});return}const c=re();if(c&&j(c)&&!c.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(c.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=c,u()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(P),u()});return}c&&j(c)&&(t=c),m(),j(t)||v.company.getDefault().then(p=>{p&&!t.seller.name.trim()&&p.profile.name.trim()&&(t.seller={...t.seller,...p.profile},t.selectedCompany=p.id,u(!0))}).catch(()=>{});function m(){v.company.list().then(p=>{d=p,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&u()}).catch(()=>{}),v.customers.list().then(p=>{s=p,t.step===1&&!e.querySelector("#w-customer")&&u()}).catch(()=>{})}function h(){try{const p=l?{...t,draftId:null}:t;localStorage.setItem(P,JSON.stringify({...p,error:"",savedAt:new Date().toISOString()}))}catch{}}function i(){e.querySelectorAll("input[data-p]").forEach(o=>{const b=o.dataset.p==="seller"?t.seller:t.buyer;b[o.dataset.f]=o.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(o=>{const[b,y]=o.dataset.l.split("."),$=t.lines[Number(b)];$&&(y==="quantity"||y==="unitPriceNet"||y==="vatRate"?$[y]=Number(o.value):$[y]=o.value)});const p=o=>e.querySelector(`#${o}`)?.value??"";t.issueDate=p("w-issue")||t.issueDate,t.deliveryDate=p("w-delivery")||t.deliveryDate,e.querySelector("#w-due")&&(t.dueDate=p("w-due")),e.querySelector("#w-employee")&&(t.employee=p("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=p("w-title")||t.documentTitle);const g=e.querySelector("#w-notes");g&&(t.notes=g.value),h()}function r(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((g,o)=>`<span class="${o===t.step?"on":""}">${o+1}. ${g}</span>`).join("")}</div>`}function u(p=!1){p||i();let g="";if(t.step===0&&(g=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(o=>`<option value="${n(o.id)}" ${t.selectedCompany===o.id?"selected":""}>${n(o.name)}${o.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${K("seller",t.seller,!0)}</div>`),t.step===1&&(g=`<div class="card"><h3>Käufer</h3>
				${s.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${s.map(o=>`<option value="${n(o.id)}" ${t.selectedCustomer===o.id?"selected":""}>${n(o.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${K("buyer",t.buyer,!1)}</div>`),t.step===2&&(g=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${le.map(o=>`<option ${o===t.documentTitle?"selected":""}>${o}</option>`).join("")}
				</select></label>
				${t.lines.map((o,b)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${b}.description" value="${n(o.description)}" /></label>
						<label>Art.Nr.<input data-l="${b}.sku" value="${n(o.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${b}.details" rows="1">${n(o.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${b}.quantity" type="number" min="0" step="any" value="${o.quantity}" /></label>
						<label>Einheit<input data-l="${b}.unit" value="${n(o.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${b}.unitPriceNet" type="number" min="0" step="0.01" value="${o.unitPriceNet}" /></label>
						<label>USt %<select data-l="${b}.vatRate">
							${[19,7,0].map(y=>`<option ${y===o.vatRate?"selected":""}>${y}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${b}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(t.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(t.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(t.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(t.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(t.notes)}</textarea></label>
			</div>`),t.step===3){const o=t.lines.reduce((y,$)=>y+$.quantity*$.unitPriceNet*(1-($.discountPercent??0)/100),0),b=t.lines.reduce((y,$)=>y+$.quantity*$.unitPriceNet*(1-($.discountPercent??0)/100)*$.vatRate/100,0);g=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${t.lines.length} Positionen</p>
				<p><strong>ca. ${T(Math.round((o+b)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${r()}${g}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,u()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const o=e.querySelector("#w-company")?.value??"",b=d.find(y=>y.id===o);b?(t.seller={...t.seller,...b.profile},t.selectedCompany=b.id,u(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const o=e.querySelector("#w-customer")?.value??"",b=s.find(y=>y.id===o);b?(t.buyer={...t.buyer,...b.profile},t.selectedCustomer=b.id,u(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,u()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(P),t=D(),u())}),e.querySelector("#w-add")?.addEventListener("click",()=>{i(),t.lines.push(x()),u()}),e.querySelectorAll("[data-del]").forEach(o=>o.addEventListener("click",()=>{i(),t.lines.splice(Number(o.dataset.del),1),t.lines.length===0&&t.lines.push(x()),u()})),e.querySelector("#w-save")?.addEventListener("click",()=>{f(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&f(!0)})}async function f(p){i(),t.error="";const g={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(J,t.employee.trim())}catch{}let o;t.draftId?o=await v.update(t.draftId,g):(o=await v.create(g),t.draftId=o.id,h()),p&&(o=await v.issue(o.id),localStorage.removeItem(P)),location.hash=`#/invoices/${o.id}`}catch(o){t.error=o.message,u()}}e.addEventListener("input",()=>{try{E()}catch{}});function E(){e.querySelectorAll("input[data-p]").forEach(y=>{const $=y.dataset.p==="seller"?t.seller:t.buyer;$[y.dataset.f]=y.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(y=>{const[$,q]=y.dataset.l.split("."),M=t.lines[Number($)];M&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"?M[q]=Number(y.value):M[q]=y.value)});const p=y=>e.querySelector(`#${y}`)?.value??"",g=p("w-issue"),o=p("w-delivery");g&&(t.issueDate=g),o&&(t.deliveryDate=o),e.querySelector("#w-due")&&(t.dueDate=p("w-due")),e.querySelector("#w-employee")&&(t.employee=p("w-employee"));const b=p("w-title");b&&(t.documentTitle=b),t.notes=e.querySelector("#w-notes")?.value??t.notes,h()}u()}const ce=document.querySelector("#app");function oe(e){const a=!!H(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];ce.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([l,d])=>`<a href="${l}" class="${e===l||l==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function W(){const e=location.hash||"#/";oe(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await Q(a):e==="#/new"?C(a):e.startsWith("#/edit/")?C(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ee(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await se(a):e==="#/company"?await _(a):e==="#/customers"?await X(a):e==="#/backup"?await Z(a):e==="#/login"?te(a):e==="#/logout"?ae():e==="#/status"?await ne(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{W()});W();
