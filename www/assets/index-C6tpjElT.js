(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))l(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&l(c)}).observe(document,{childList:!0,subtree:!0});function t(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function l(o){if(o.ep)return;o.ep=!0;const i=t(o);fetch(o.href,i)}})();const B="einv-token";function U(){try{return localStorage.getItem(B)}catch{return null}}function O(e){try{e?localStorage.setItem(B,e):localStorage.removeItem(B)}catch{}}async function k(e,a){const t=await S(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`HTTP ${t.status}`)}return await t.json()}async function S(e,a){const t={...a?.headers??{}},l=U();l&&(t.authorization=`Bearer ${l}`);const o=await fetch(e,{...a,headers:t});if(o.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return o}async function A(e,a){const t=await S(e);if(!t.ok){const c=await t.json().catch(()=>({}));throw new Error(c.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const l=await t.blob(),o=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),i=document.createElement("a");i.href=URL.createObjectURL(l),i.download=o?.[1]??a,document.body.appendChild(i),i.click(),i.remove(),window.setTimeout(()=>URL.revokeObjectURL(i.href),1e4)}async function G(e){const a=await S(e);if(!a.ok){const o=await a.json().catch(()=>({}));throw new Error(o.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),l=URL.createObjectURL(t);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const b={health:()=>k("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return k(`/api/invoices${a?`?${a}`:""}`)},get:e=>k(`/api/invoices/${e}`),create:e=>k("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>k(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>k(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>k(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>k("/api/company-profiles"),getDefault:()=>k("/api/company-profiles/default"),create:(e,a)=>k("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>k("/api/customers"),create:(e,a)=>k("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>k(`/api/customers/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function T(e){return`${Number(e).toFixed(2)} EUR`}function q(e){return e.split("/").pop()??e}async function Z(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",l=!1;async function o(){const c=await S("/api/backups");if(!c.ok)throw new Error("Backups konnten nicht geladen werden");a=await c.json(),i()}function i(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(c=>`<div class="row" style="margin-top:8px">
				<strong>${n(q(c.filename))}</strong>
				<span class="muted">${n(c.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(c.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(c.filename)}">Download</button>
				<button class="secondary" data-restore="${n(c.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const c=await S("/api/backups",{method:"POST"});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const p=await c.json();t=`Gesichert: ${q(p.filename)}`,l=!1,await o()}catch(c){t=c.message,l=!0,i()}}),e.querySelectorAll("[data-dl]").forEach(c=>c.addEventListener("click",async()=>{const p=c.dataset.dl??"";try{await A(`/api/backups/file/${q(p)}`,q(p))}catch(f){t=f.message,l=!0,i()}})),e.querySelectorAll("[data-restore]").forEach(c=>c.addEventListener("click",async()=>{const p=c.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${q(p)}? Die aktuelle Datenbank wird ersetzt.`))try{const f=await S("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const m=await f.json();t=`Wiederhergestellt: ${m.invoices} Rechnungen, ${m.templates} Vorlagen${m.fileErrors.length>0?` (${m.fileErrors.length} Dateifehler)`:""}`,l=!1,await o()}catch(f){t=f.message,l=!0,i()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const c=e.querySelector("#b-file")?.files?.[0];if(!c){t="Bitte zuerst eine ZIP-Datei wählen",l=!0,i();return}if(window.confirm(`Wirklich wiederherstellen aus ${c.name}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await new Promise((s,r)=>{const h=new FileReader;h.onload=()=>s(String(h.result).split(",")[1]),h.onerror=()=>r(new Error("Datei nicht lesbar")),h.readAsDataURL(c)}),f=await S("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:p})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const m=await f.json();t=`Wiederhergestellt: ${m.invoices} Rechnungen, ${m.templates} Vorlagen`,l=!1,await o()}catch(p){t=p.message,l=!0,i()}})}try{await o()}catch(c){e.innerHTML=`<div class="card error">${n(c.message)}</div>`}}const H=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function E(e,a,t){const l=e[a],o=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(o)}" /></label>`}async function _(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",l=!1;try{a=await b.company.getDefault(),a||(a=(await b.company.list())[0]??null)}catch(i){e.innerHTML=`<div class="card error">${n(i.message)}</div>`;return}function o(){const i=a?.profile??H();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${E(i,"name","Firmenname")}
			${E(i,"street","Straße")}
			<div class="grid2">${E(i,"zip","PLZ")}${E(i,"city","Ort")}</div>
			<div class="grid2">${E(i,"country","Land")}${E(i,"email","E-Mail")}</div>
			<div class="grid2">${E(i,"phone","Telefon")}${E(i,"website","Webseite")}</div>
			<div class="grid2">${E(i,"vatId","USt-IdNr.")}${E(i,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${E(i,"bankName","Bankname")}${E(i,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(i.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile.</p>
			<div class="grid2">
				<label>Box 1 – Adresse<textarea data-fbox="0" rows="3">${n((i.footerBoxes??[])[0]??"")}</textarea></label>
				<label>Box 2 – Kontakt<textarea data-fbox="1" rows="3">${n((i.footerBoxes??[])[1]??"")}</textarea></label>
			</div>
			<div class="grid2">
				<label>Box 3 – Bank<textarea data-fbox="2" rows="3">${n((i.footerBoxes??[])[2]??"")}</textarea></label>
				<label>Box 4 – Steuer<textarea data-fbox="3" rows="3">${n((i.footerBoxes??[])[3]??"")}</textarea></label>
			</div>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const c={...H()};e.querySelectorAll("input[data-f]").forEach(m=>{c[m.dataset.f]=m.value});const p=[0,1,2,3].map(m=>e.querySelector(`textarea[data-fbox="${m}"]`)?.value??"");p.some(m=>m.trim()!=="")?c.footerBoxes=p:delete c.footerBoxes;const f=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await b.company.update(a.id,{name:f,profile:c}):a=await b.company.create(f,c),t="Gespeichert.",l=!1,o()}catch(m){t=m.message,l=!0,o()}})}o()}const R=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function L(e,a,t){const l=e[a],o=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(o)}" /></label>`}async function X(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,l=!1,o="",i=!1;async function c(){a=await b.customers.list(),f()}function p(s,r){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(r)}" /></label>
		${L(s,"name","Firmenname")}
		${L(s,"street","Straße")}
		<div class="grid2">${L(s,"zip","PLZ")}${L(s,"city","Ort")}</div>
		<div class="grid2">${L(s,"country","Land")}${L(s,"email","E-Mail")}</div>
		<div class="grid2">${L(s,"phone","Telefon")}${L(s,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(s.customerNumber)}" /></label>`}function f(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${n(s.name)}</strong>
				<span class="muted">${n(s.profile.city||"")}</span>
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="danger" data-del="${s.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||l?`<div class="card"><h3>${l?"Neuer Kunde":n(t?.name??"")}</h3>
			${p(t?.profile??R(),t?.name??"")}
			${o?`<p class="${i?"error":""}">${n(o)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,l=!0,o="",f()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(r=>r.id===s.dataset.edit)??null,l=!1,o="",f()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await b.customers.remove(s.dataset.del??""),await c()}catch(r){o=r.message,i=!0,f()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,l=!1,o="",f()}),e.querySelector("#k-save")?.addEventListener("click",()=>{m()})}async function m(){const s={...R()};e.querySelectorAll("input[data-f]").forEach(h=>{s[h.dataset.f]=h.value});const r=e.querySelector("#k-name")?.value.trim()||s.name.trim()||"Kunde";try{l?await b.customers.create(r,s):t&&await b.customers.update(t.id,{name:r,profile:s}),t=null,l=!1,o="",await c()}catch(h){o=h.message,i=!0,f()}}try{await c()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}function Y(e){return`<span class="badge ${e}">${e}</span>`}async function Q(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),l=e.querySelector("#list"),o=e.querySelector("#list-err");function i(p){o.innerHTML=`<div class="card error">${n(p.message)}</div>`}async function c(){const p={};a.value&&(p.status=a.value),t.value.trim()&&(p.q=t.value.trim());try{const f=await b.list(p);l.innerHTML=f.map(m=>`<div class="card"><div class="row">
					<strong>${n(m.number??"(Entwurf)")}</strong>${Y(m.status)}
					<span>${n(m.buyer.name||"—")}</span>
					<span>${T(m.totals.grossTotal)}</span>
					<a href="#/invoices/${n(m.id)}">Ansehen</a>
					${m.status==="draft"?`<a href="#/edit/${n(m.id)}">Bearbeiten</a>`:""}
					${m.pdfPath?`<button class="secondary" data-dl="pdf:${n(m.id)}:${n(m.number??"rechnung")}">PDF ↓</button>`:""}
					${m.xml?`<button class="secondary" data-dl="xml:${n(m.id)}:${n(m.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(m=>m.addEventListener("click",async()=>{const[s,r,h]=(m.dataset.dl??"").split(":"),g=s==="pdf"?b.pdfUrl(r):b.xmlUrl(r);try{await A(g,`${h}.${s}`)}catch(d){i(d)}}))}catch(f){l.innerHTML=`<div class="card error">${n(f.message)}</div>`}}a.onchange=()=>{c()},t.oninput=()=>{c()},e.querySelector("#f-export")?.addEventListener("click",async()=>{const p={};a.value&&(p.status=a.value),t.value.trim()&&(p.q=t.value.trim());try{await A(b.exportUrl(p),"export.xlsx")}catch(f){i(f)}}),await c()}async function ee(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await b.get(a);e.innerHTML=`
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
			${t.lines.map((i,c)=>{const p=i.unitPriceNet*(1-(i.discountPercent??0)/100);return`<tr><td>${c+1}</td><td>${n(i.description)}${i.sku?` (${n(i.sku)})`:""}</td><td>${i.quantity} ${n(i.unit)}</td><td>${i.vatRate} %</td><td>${T(Math.round(i.quantity*p*100)/100)}</td></tr>`}).join("")}
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
			</div><div id="d-out"></div></div>`;const l=e.querySelector("#d-out"),o=i=>{l.innerHTML=`<p class="error">${n(i.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const c=i.dataset.dl,p=c==="pdf"?b.pdfUrl(t.id):c==="xml"?b.xmlUrl(t.id):b.xlsxUrl(t.id);try{await A(p,`${t.number??"rechnung"}.${c}`)}catch(f){o(f)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await G(b.pdfUrl(t.id))}catch(i){o(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{l.innerHTML='<p class="muted">Validiere…</p>';try{const i=await b.validate(t.id);l.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(c=>`<li class="error">${n(c)}</li>`).join("")}</ul>`}catch(i){l.innerHTML=`<p class="error">${n(i.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await b.issue(t.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){l.innerHTML=`<p class="error">${n(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function te(e){const a=U();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";O(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{O(null),location.hash="#/login",location.reload()})}function ae(){O(null),location.hash="#/login"}async function ne(e){try{const a=await b.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const se=["title","meta","parties","positions","totals"],z=["payment","notes"];async function ie(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,l="";async function o(){a=await i(),p()}async function i(){const s=await S("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function c(s){const r=s.definition,h=(g,d,$)=>`<label><input type="checkbox" data-f="blocks.${g}" ${r.blocks[g]?"checked":""} ${$?"disabled":""} style="width:auto" /> ${d}${$?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${se.map(g=>h(g,`Block ${g}`,!0)).join("")}
		${z.map(g=>h(g,`Block ${g}`,!1)).join("")}
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
				${["right","left","center"].map(g=>`<option ${r.logo?.position===g?"selected":""}>${g}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${n(r.logo.path)}</p>`:""}`}function p(){e.innerHTML=`
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
		${t?`<div class="card"><h3>${n(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${c(t)}
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const h=(await(await S("/api/templates")).json())[0];if(!h){l="Keine Basisvorlage vorhanden",p();return}t={...structuredClone(h),id:"neu",name:"Neu",version:1,isDefault:!1},l="",p()}catch(s){l=s.message,p()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const r=a.find(h=>h.id===s.dataset.edit);r&&(t=structuredClone(r),l="",p())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const r=a.find(h=>h.id===s.dataset.prev);if(r)try{const h=await S("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!h.ok){const d=await h.json().catch(()=>({}));throw new Error(d.error??"Vorschau fehlgeschlagen")}const g=await h.blob();window.open(URL.createObjectURL(g),"_blank")}catch(h){l=h.message,p()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await S(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(r){l=r.message,p()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const r=await S(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!r.ok){l=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,l="",p()}),e.querySelector("#t-save")?.addEventListener("click",()=>{m()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=f();if(s)try{const r=await S("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!r.ok){const h=await r.json().catch(()=>({}));throw new Error(h.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){l=r.message,p()}})}function f(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const r of z)s.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??s.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;return s.footerText=e.querySelector("#t-footer")?.value??"",s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:s.name,definition:s}}async function m(){const s=f();if(!s)return;const r=s.definition;try{let h=t.id;if(h==="neu"){const d=await S("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!d.ok)throw new Error((await d.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");h=(await d.json()).id}else{const d=await S(`/api/templates/${h}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!d.ok)throw new Error((await d.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const g=e.querySelector("#t-logo")?.files?.[0];if(g){const d=await new Promise((u,y)=>{const v=new FileReader;v.onload=()=>u(String(v.result).split(",")[1]),v.onerror=()=>y(new Error("Datei nicht lesbar")),v.readAsDataURL(g)}),$=await S(`/api/templates/${h}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:g.name,mime:g.type,dataBase64:d})});if(!$.ok)throw new Error((await $.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,l="",await o()}catch(h){l=h.message,p()}}try{await o()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const I=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),P=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),N="einv-wizard-v1",J="einv-employee";function V(){try{return localStorage.getItem(J)??""}catch{return""}}function F(){return new Date().toISOString().slice(0,10)}function D(){return{step:0,seller:I(),buyer:I(),lines:[P()],issueDate:F(),deliveryDate:F(),dueDate:"",employee:V(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,error:"",savedAt:new Date().toISOString()}}function M(e){return e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0)}function re(){try{const e=localStorage.getItem(N);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...D(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function K(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" /></label>`}`}const le=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function C(e,a){let t=D();const l=!!a;let o=[],i=[];if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',b.get(a).then(d=>{if(d.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(d.status)}).</div>`;return}t={...D(),seller:d.seller,buyer:d.buyer,lines:d.lines.length>0?d.lines:[P()],issueDate:d.issueDate,deliveryDate:d.deliveryDate,dueDate:d.dueDate??"",employee:d.employeeCode??V(),documentTitle:d.documentTitle,notes:d.notes??"",draftId:d.id},p(),r()}).catch(d=>{e.innerHTML=`<div class="card error">${n(d.message)}</div>`});return}const c=re();if(c&&M(c)&&!c.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(c.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=c,r()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(N),r()});return}c&&M(c)&&(t=c),p(),M(t)||b.company.getDefault().then(d=>{d&&!t.seller.name.trim()&&d.profile.name.trim()&&(t.seller={...t.seller,...d.profile},t.selectedCompany=d.id,r(!0))}).catch(()=>{});function p(){b.company.list().then(d=>{o=d,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),b.customers.list().then(d=>{i=d,t.step===1&&!e.querySelector("#w-customer")&&r()}).catch(()=>{})}function f(){try{const d=l?{...t,draftId:null}:t;localStorage.setItem(N,JSON.stringify({...d,error:"",savedAt:new Date().toISOString()}))}catch{}}function m(){e.querySelectorAll("input[data-p]").forEach(u=>{const y=u.dataset.p==="seller"?t.seller:t.buyer;y[u.dataset.f]=u.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(u=>{const[y,v]=u.dataset.l.split("."),w=t.lines[Number(y)];w&&(v==="quantity"||v==="unitPriceNet"||v==="vatRate"?w[v]=Number(u.value):w[v]=u.value)});const d=u=>e.querySelector(`#${u}`)?.value??"";t.issueDate=d("w-issue")||t.issueDate,t.deliveryDate=d("w-delivery")||t.deliveryDate,e.querySelector("#w-due")&&(t.dueDate=d("w-due")),e.querySelector("#w-employee")&&(t.employee=d("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=d("w-title")||t.documentTitle);const $=e.querySelector("#w-notes");$&&(t.notes=$.value),f()}function s(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map(($,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${$}</span>`).join("")}</div>`}function r(d=!1){d||m();let $="";if(t.step===0&&($=`<div class="card"><h3>Verkäufer</h3>
				${o.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${o.map(u=>`<option value="${n(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${n(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${K("seller",t.seller,!0)}</div>`),t.step===1&&($=`<div class="card"><h3>Käufer</h3>
				${i.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${i.map(u=>`<option value="${n(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${n(u.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${K("buyer",t.buyer,!1)}</div>`),t.step===2&&($=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${le.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${t.lines.map((u,y)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${y}.description" value="${n(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${y}.sku" value="${n(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${y}.details" rows="1">${n(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${y}.quantity" type="number" min="0" step="any" value="${u.quantity}" /></label>
						<label>Einheit<input data-l="${y}.unit" value="${n(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${y}.unitPriceNet" type="number" min="0" step="0.01" value="${u.unitPriceNet}" /></label>
						<label>USt %<select data-l="${y}.vatRate">
							${[19,7,0].map(v=>`<option ${v===u.vatRate?"selected":""}>${v}</option>`).join("")}
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
			</div>`),t.step===3){const u=t.lines.reduce((v,w)=>v+w.quantity*w.unitPriceNet*(1-(w.discountPercent??0)/100),0),y=t.lines.reduce((v,w)=>v+w.quantity*w.unitPriceNet*(1-(w.discountPercent??0)/100)*w.vatRate/100,0);$=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${t.lines.length} Positionen</p>
				<p><strong>ca. ${T(Math.round((u+y)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${s()}${$}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,r()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",y=o.find(v=>v.id===u);y?(t.seller={...t.seller,...y.profile},t.selectedCompany=y.id,r(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",y=i.find(v=>v.id===u);y?(t.buyer={...t.buyer,...y.profile},t.selectedCustomer=y.id,r(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,r()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(N),t=D(),r())}),e.querySelector("#w-add")?.addEventListener("click",()=>{m(),t.lines.push(P()),r()}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{m(),t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(P()),r()})),e.querySelector("#w-save")?.addEventListener("click",()=>{h(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&h(!0)})}async function h(d){m(),t.error="";const $={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(J,t.employee.trim())}catch{}let u;t.draftId?u=await b.update(t.draftId,$):(u=await b.create($),t.draftId=u.id,f()),d&&(u=await b.issue(u.id),localStorage.removeItem(N)),location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,r()}}e.addEventListener("input",()=>{try{g()}catch{}});function g(){e.querySelectorAll("input[data-p]").forEach(v=>{const w=v.dataset.p==="seller"?t.seller:t.buyer;w[v.dataset.f]=v.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(v=>{const[w,x]=v.dataset.l.split("."),j=t.lines[Number(w)];j&&(x==="quantity"||x==="unitPriceNet"||x==="vatRate"?j[x]=Number(v.value):j[x]=v.value)});const d=v=>e.querySelector(`#${v}`)?.value??"",$=d("w-issue"),u=d("w-delivery");$&&(t.issueDate=$),u&&(t.deliveryDate=u),e.querySelector("#w-due")&&(t.dueDate=d("w-due")),e.querySelector("#w-employee")&&(t.employee=d("w-employee"));const y=d("w-title");y&&(t.documentTitle=y),t.notes=e.querySelector("#w-notes")?.value??t.notes,f()}r()}const ce=document.querySelector("#app");function oe(e){const a=!!U(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];ce.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([l,o])=>`<a href="${l}" class="${e===l||l==="#/"&&e.startsWith("#/invoices")?"active":""}">${o}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function W(){const e=location.hash||"#/";oe(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await Q(a):e==="#/new"?C(a):e.startsWith("#/edit/")?C(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ee(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await ie(a):e==="#/company"?await _(a):e==="#/customers"?await X(a):e==="#/backup"?await Z(a):e==="#/login"?te(a):e==="#/logout"?ae():e==="#/status"?await ne(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{W()});W();
