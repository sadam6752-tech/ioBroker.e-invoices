(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))l(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&l(c)}).observe(document,{childList:!0,subtree:!0});function t(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function l(o){if(o.ep)return;o.ep=!0;const s=t(o);fetch(o.href,s)}})();const j="einv-token";function H(){try{return localStorage.getItem(j)}catch{return null}}function O(e){try{e?localStorage.setItem(j,e):localStorage.removeItem(j)}catch{}}async function $(e,a){const t=await w(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`HTTP ${t.status}`)}return await t.json()}async function w(e,a){const t={...a?.headers??{}},l=H();l&&(t.authorization=`Bearer ${l}`);const o=await fetch(e,{...a,headers:t});if(o.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return o}async function x(e,a){const t=await w(e);if(!t.ok){const c=await t.json().catch(()=>({}));throw new Error(c.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const l=await t.blob(),o=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),s=document.createElement("a");s.href=URL.createObjectURL(l),s.download=o?.[1]??a,document.body.appendChild(s),s.click(),s.remove(),window.setTimeout(()=>URL.revokeObjectURL(s.href),1e4)}async function W(e){const a=await w(e);if(!a.ok){const o=await a.json().catch(()=>({}));throw new Error(o.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),l=URL.createObjectURL(t);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const b={health:()=>$("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return $(`/api/invoices${a?`?${a}`:""}`)},get:e=>$(`/api/invoices/${e}`),create:e=>$("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>$(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>$(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>$(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>$("/api/company-profiles"),getDefault:()=>$("/api/company-profiles/default"),create:(e,a)=>$("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>$(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>$("/api/customers"),create:(e,a)=>$("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>$(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>$(`/api/customers/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function E(e){return`${Number(e).toFixed(2)} EUR`}function q(e){return e.split("/").pop()??e}async function G(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",l=!1;async function o(){const c=await w("/api/backups");if(!c.ok)throw new Error("Backups konnten nicht geladen werden");a=await c.json(),s()}function s(){e.innerHTML=`
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
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const c=await w("/api/backups",{method:"POST"});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const p=await c.json();t=`Gesichert: ${q(p.filename)}`,l=!1,await o()}catch(c){t=c.message,l=!0,s()}}),e.querySelectorAll("[data-dl]").forEach(c=>c.addEventListener("click",async()=>{const p=c.dataset.dl??"";try{await x(`/api/backups/file/${q(p)}`,q(p))}catch(m){t=m.message,l=!0,s()}})),e.querySelectorAll("[data-restore]").forEach(c=>c.addEventListener("click",async()=>{const p=c.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${q(p)}? Die aktuelle Datenbank wird ersetzt.`))try{const m=await w("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await m.json();t=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen${r.fileErrors.length>0?` (${r.fileErrors.length} Dateifehler)`:""}`,l=!1,s()}catch(m){t=m.message,l=!0,s()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const c=e.querySelector("#b-file")?.files?.[0];if(!c){t="Bitte zuerst eine ZIP-Datei wählen",l=!0,s();return}if(window.confirm(`Wirklich wiederherstellen aus ${c.name}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await new Promise((i,v)=>{const h=new FileReader;h.onload=()=>i(String(h.result).split(",")[1]),h.onerror=()=>v(new Error("Datei nicht lesbar")),h.readAsDataURL(c)}),m=await w("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:p})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await m.json();t=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen`,l=!1,await o()}catch(p){t=p.message,l=!0,s()}})}try{await o()}catch(c){e.innerHTML=`<div class="card error">${n(c.message)}</div>`}}const U=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function S(e,a,t){return`<label>${t}<input data-f="${a}" value="${n(e[a]??"")}" /></label>`}async function Z(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",l=!1;try{a=await b.company.getDefault(),a||(a=(await b.company.list())[0]??null)}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`;return}function o(){const s=a?.profile??U();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${S(s,"name","Firmenname")}
			${S(s,"street","Straße")}
			<div class="grid2">${S(s,"zip","PLZ")}${S(s,"city","Ort")}</div>
			<div class="grid2">${S(s,"country","Land")}${S(s,"email","E-Mail")}</div>
			<div class="grid2">${S(s,"phone","Telefon")}${S(s,"website","Webseite")}</div>
			<div class="grid2">${S(s,"vatId","USt-IdNr.")}${S(s,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${S(s,"iban","IBAN")}${S(s,"bic","BIC")}</div>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const c={...U()};e.querySelectorAll("input[data-f]").forEach(m=>{c[m.dataset.f]=m.value});const p=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await b.company.update(a.id,{name:p,profile:c}):a=await b.company.create(p,c),t="Gespeichert.",l=!1,o()}catch(m){t=m.message,l=!0,o()}})}o()}const R=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function L(e,a,t){return`<label>${t}<input data-f="${a}" value="${n(e[a]??"")}" /></label>`}async function _(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,l=!1,o="",s=!1;async function c(){a=await b.customers.list(),m()}function p(i,v){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(v)}" /></label>
		${L(i,"name","Firmenname")}
		${L(i,"street","Straße")}
		<div class="grid2">${L(i,"zip","PLZ")}${L(i,"city","Ort")}</div>
		<div class="grid2">${L(i,"country","Land")}${L(i,"email","E-Mail")}</div>
		<div class="grid2">${L(i,"phone","Telefon")}${L(i,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(i.customerNumber)}" /></label>`}function m(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${n(i.name)}</strong>
				<span class="muted">${n(i.profile.city||"")}</span>
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="danger" data-del="${i.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||l?`<div class="card"><h3>${l?"Neuer Kunde":n(t?.name??"")}</h3>
			${p(t?.profile??R(),t?.name??"")}
			${o?`<p class="${s?"error":""}">${n(o)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,l=!0,o="",m()}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{t=a.find(v=>v.id===i.dataset.edit)??null,l=!1,o="",m()})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await b.customers.remove(i.dataset.del??""),await c()}catch(v){o=v.message,s=!0,m()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,l=!1,o="",m()}),e.querySelector("#k-save")?.addEventListener("click",()=>{r()})}async function r(){const i={...R()};e.querySelectorAll("input[data-f]").forEach(h=>{i[h.dataset.f]=h.value});const v=e.querySelector("#k-name")?.value.trim()||i.name.trim()||"Kunde";try{l?await b.customers.create(v,i):t&&await b.customers.update(t.id,{name:v,profile:i}),t=null,l=!1,o="",await c()}catch(h){o=h.message,s=!0,m()}}try{await c()}catch(i){e.innerHTML=`<div class="card error">${n(i.message)}</div>`}}function X(e){return`<span class="badge ${e}">${e}</span>`}async function Y(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),l=e.querySelector("#list"),o=e.querySelector("#list-err");function s(p){o.innerHTML=`<div class="card error">${n(p.message)}</div>`}async function c(){const p={};a.value&&(p.status=a.value),t.value.trim()&&(p.q=t.value.trim());try{const m=await b.list(p);l.innerHTML=m.map(r=>`<div class="card"><div class="row">
					<strong>${n(r.number??"(Entwurf)")}</strong>${X(r.status)}
					<span>${n(r.buyer.name||"—")}</span>
					<span>${E(r.totals.grossTotal)}</span>
					<a href="#/invoices/${n(r.id)}">Ansehen</a>
					${r.status==="draft"?`<a href="#/edit/${n(r.id)}">Bearbeiten</a>`:""}
					${r.pdfPath?`<button class="secondary" data-dl="pdf:${n(r.id)}:${n(r.number??"rechnung")}">PDF ↓</button>`:""}
					${r.xml?`<button class="secondary" data-dl="xml:${n(r.id)}:${n(r.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(r=>r.addEventListener("click",async()=>{const[i,v,h]=(r.dataset.dl??"").split(":"),d=i==="pdf"?b.pdfUrl(v):b.xmlUrl(v);try{await x(d,`${h}.${i}`)}catch(y){s(y)}}))}catch(m){l.innerHTML=`<div class="card error">${n(m.message)}</div>`}}a.onchange=()=>{c()},t.oninput=()=>{c()},e.querySelector("#f-export")?.addEventListener("click",async()=>{const p={};a.value&&(p.status=a.value),t.value.trim()&&(p.q=t.value.trim());try{await x(b.exportUrl(p),"export.xlsx")}catch(m){s(m)}}),await c()}async function Q(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await b.get(a);e.innerHTML=`
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
			${t.lines.map((s,c)=>`<tr><td>${c+1}</td><td>${n(s.description)}</td><td>${s.quantity} ${n(s.unit)}</td><td>${s.vatRate} %</td><td>${E(s.quantity*s.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${E(t.totals.grossTotal)}</strong> <span class="muted">(netto ${E(t.totals.netTotal)} + USt ${E(t.totals.taxTotal)})</span></p>
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
			</div><div id="d-out"></div></div>`;const l=e.querySelector("#d-out"),o=s=>{l.innerHTML=`<p class="error">${n(s.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(s=>s.addEventListener("click",async()=>{const c=s.dataset.dl,p=c==="pdf"?b.pdfUrl(t.id):c==="xml"?b.xmlUrl(t.id):b.xlsxUrl(t.id);try{await x(p,`${t.number??"rechnung"}.${c}`)}catch(m){o(m)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await W(b.pdfUrl(t.id))}catch(s){o(s)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{l.innerHTML='<p class="muted">Validiere…</p>';try{const s=await b.validate(t.id);l.innerHTML=s.formatErrors.length+s.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...s.formatErrors,...s.businessErrors].map(c=>`<li class="error">${n(c)}</li>`).join("")}</ul>`}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const s=await b.issue(t.id);location.hash=`#/invoices/${s.id}`,location.reload()}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function ee(e){const a=H();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";O(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{O(null),location.hash="#/login",location.reload()})}function te(){O(null),location.hash="#/login"}async function ae(e){try{const a=await b.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const ne=["title","meta","parties","positions","totals"],I=["payment","notes"];async function ie(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,l="";async function o(){a=await s(),p()}async function s(){const r=await w("/api/templates");if(!r.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await r.json()}function c(r){const i=r.definition,v=(h,d,y)=>`<label><input type="checkbox" data-f="blocks.${h}" ${i.blocks[h]?"checked":""} ${y?"disabled":""} style="width:auto" /> ${d}${y?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(r.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(i.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(i.colors.text)}" /></label>
		</div>
		${ne.map(h=>v(h,`Block ${h}`,!0)).join("")}
		${I.map(h=>v(h,`Block ${h}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${i.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${i.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${i.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${i.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showTagline" ${i.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${n(i.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${n(i.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${n(i.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${n(i.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${n(i.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(h=>`<option ${i.logo?.position===h?"selected":""}>${h}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${i.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${i.logo?`<p class="muted">Aktuell: ${n(i.logo.path)}</p>`:""}`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${a.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${n(r.name)}</strong><span class="muted">v${r.version}</span>
				${r.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${r.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${r.id}">Vorschau</button>
				${r.isDefault?"":`<button class="secondary" data-def="${r.id}">Standard</button>`}
				${r.isDefault?"":`<button class="danger" data-del="${r.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${n(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${c(t)}
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{const v=(await(await w("/api/templates")).json())[0];if(!v){l="Keine Basisvorlage vorhanden",p();return}t={...structuredClone(v),id:"neu",name:"Neu",version:1,isDefault:!1},l="",p()}),e.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{const i=a.find(v=>v.id===r.dataset.edit);i&&(t=structuredClone(i),l="",p())})),e.querySelectorAll("[data-prev]").forEach(r=>r.addEventListener("click",async()=>{const i=a.find(d=>d.id===r.dataset.prev);if(!i)return;const v=await w("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!v.ok){l="Vorschau fehlgeschlagen",p();return}const h=await v.blob();window.open(URL.createObjectURL(h),"_blank")})),e.querySelectorAll("[data-def]").forEach(r=>r.addEventListener("click",async()=>{await w(`/api/templates/${r.dataset.def}/default`,{method:"POST"}),t=null,await o()})),e.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{const i=await w(`/api/templates/${r.dataset.del}`,{method:"DELETE"});if(!i.ok){l=(await i.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,l="",p()}),e.querySelector("#t-save")?.addEventListener("click",()=>{m()})}async function m(){if(!t)return;const r=structuredClone(t.definition);r.name=(e.querySelector("#t-name")?.value??r.name).trim(),r.colors.primary=e.querySelector("#t-c1")?.value??r.colors.primary,r.colors.text=e.querySelector("#t-c2")?.value??r.colors.text;for(const i of I)r.blocks[i]=e.querySelector(`[data-f="blocks.${i}"]`)?.checked??r.blocks[i];for(const i of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])r[i]=e.querySelector(`[data-f="${i}"]`)?.checked??!1;r.footerText=e.querySelector("#t-footer")?.value??"",r.introText=e.querySelector("#t-intro")?.value??"",r.closingText=e.querySelector("#t-closing")?.value??"",r.signatureName=e.querySelector("#t-sign")?.value??"",r.headerExtra=e.querySelector("#t-hextra")?.value??"",r.logo&&(r.logo.position=e.querySelector("#t-lpos")?.value??"right",r.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30));try{let i=t.id;if(i==="neu"){const h=await w("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");i=(await h.json()).id}else{const h=await w(`/api/templates/${i}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const v=e.querySelector("#t-logo")?.files?.[0];if(v){const h=await new Promise((y,u)=>{const f=new FileReader;f.onload=()=>y(String(f.result).split(",")[1]),f.onerror=()=>u(new Error("Datei nicht lesbar")),f.readAsDataURL(v)}),d=await w(`/api/templates/${i}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:v.name,mime:v.type,dataBase64:h})});if(!d.ok)throw new Error((await d.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,l="",await o()}catch(i){l=i.message,p()}}try{await o()}catch(r){e.innerHTML=`<div class="card error">${n(r.message)}</div>`}}const z=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),D=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),N="einv-wizard-v1",F="einv-employee";function J(){try{return localStorage.getItem(F)??""}catch{return""}}function B(){return new Date().toISOString().slice(0,10)}function P(){return{step:0,seller:z(),buyer:z(),lines:[D()],issueDate:B(),deliveryDate:B(),dueDate:"",employee:J(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,error:"",savedAt:new Date().toISOString()}}function M(e){return e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0)}function se(){try{const e=localStorage.getItem(N);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...P(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function K(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" /></label>`}`}const re=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function C(e,a){let t=P();if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',b.get(a).then(d=>{if(d.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(d.status)}).</div>`;return}t={...P(),seller:d.seller,buyer:d.buyer,lines:d.lines.length>0?d.lines:[D()],issueDate:d.issueDate,deliveryDate:d.deliveryDate,dueDate:d.dueDate??"",employee:d.employeeCode??J(),documentTitle:d.documentTitle,notes:d.notes??"",draftId:d.id},c(),i()}).catch(d=>{e.innerHTML=`<div class="card error">${n(d.message)}</div>`});return}const l=se();if(l&&M(l)&&!l.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(l.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=l,i()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(N),i()});return}l&&M(l)&&(t=l);let o=[],s=[];c(),M(t)||b.company.getDefault().then(d=>{d&&!t.seller.name.trim()&&d.profile.name.trim()&&(t.seller={...t.seller,...d.profile},t.selectedCompany=d.id,i(!0))}).catch(()=>{});function c(){b.company.list().then(d=>{o=d,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&i()}).catch(()=>{}),b.customers.list().then(d=>{s=d,t.step===1&&!e.querySelector("#w-customer")&&i()}).catch(()=>{})}function p(){try{localStorage.setItem(N,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function m(){e.querySelectorAll("input[data-p]").forEach(y=>{const u=y.dataset.p==="seller"?t.seller:t.buyer;u[y.dataset.f]=y.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(y=>{const[u,f]=y.dataset.l.split("."),g=t.lines[Number(u)];g&&(f==="quantity"||f==="unitPriceNet"||f==="vatRate"?g[f]=Number(y.value):g[f]=y.value)});const d=y=>e.querySelector(`#${y}`)?.value??"";t.issueDate=d("w-issue")||t.issueDate,t.deliveryDate=d("w-delivery")||t.deliveryDate,t.dueDate=d("w-due"),e.querySelector("#w-employee")&&(t.employee=d("w-employee")),t.documentTitle=d("w-title")||"Rechnung",t.notes=e.querySelector("#w-notes")?.value??"",p()}function r(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((y,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${y}</span>`).join("")}</div>`}function i(d=!1){d||m();let y="";if(t.step===0&&(y=`<div class="card"><h3>Verkäufer</h3>
				${o.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${o.map(u=>`<option value="${n(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${n(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${K("seller",t.seller,!0)}</div>`),t.step===1&&(y=`<div class="card"><h3>Käufer</h3>
				${s.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${s.map(u=>`<option value="${n(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${n(u.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${K("buyer",t.buyer,!1)}</div>`),t.step===2&&(y=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${re.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${t.lines.map((u,f)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${f}.description" value="${n(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${f}.sku" value="${n(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${f}.details" rows="1">${n(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${f}.quantity" type="number" min="0" step="any" value="${u.quantity}" /></label>
						<label>Einheit<input data-l="${f}.unit" value="${n(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${f}.unitPriceNet" type="number" min="0" step="0.01" value="${u.unitPriceNet}" /></label>
						<label>USt %<select data-l="${f}.vatRate">
							${[19,7,0].map(g=>`<option ${g===u.vatRate?"selected":""}>${g}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${f}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(t.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(t.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(t.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(t.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(t.notes)}</textarea></label>
			</div>`),t.step===3){const u=t.lines.reduce((g,k)=>g+k.quantity*k.unitPriceNet,0),f=t.lines.reduce((g,k)=>g+k.quantity*k.unitPriceNet*k.vatRate/100,0);y=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${t.lines.length} Positionen</p>
				<p><strong>ca. ${E(Math.round((u+f)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${r()}${y}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,i()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",f=o.find(g=>g.id===u);f?(t.seller={...t.seller,...f.profile},t.selectedCompany=f.id,i(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",f=s.find(g=>g.id===u);f?(t.buyer={...t.buyer,...f.profile},t.selectedCustomer=f.id,i(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,i()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(N),t=P(),i())}),e.querySelector("#w-add")?.addEventListener("click",()=>{m(),t.lines.push(D()),i()}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{m(),t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(D()),i()})),e.querySelector("#w-save")?.addEventListener("click",()=>{v(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&v(!0)})}async function v(d){m(),t.error="";const y={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(F,t.employee.trim())}catch{}let u;t.draftId?u=await b.update(t.draftId,y):(u=await b.create(y),t.draftId=u.id,p()),d&&(u=await b.issue(u.id),localStorage.removeItem(N)),location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,i()}}e.addEventListener("input",()=>{try{h()}catch{}});function h(){e.querySelectorAll("input[data-p]").forEach(g=>{const k=g.dataset.p==="seller"?t.seller:t.buyer;k[g.dataset.f]=g.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(g=>{const[k,T]=g.dataset.l.split("."),A=t.lines[Number(k)];A&&(T==="quantity"||T==="unitPriceNet"||T==="vatRate"?A[T]=Number(g.value):A[T]=g.value)});const d=g=>e.querySelector(`#${g}`)?.value??"",y=d("w-issue"),u=d("w-delivery");y&&(t.issueDate=y),u&&(t.deliveryDate=u),t.dueDate=d("w-due"),e.querySelector("#w-employee")&&(t.employee=d("w-employee"));const f=d("w-title");f&&(t.documentTitle=f),t.notes=e.querySelector("#w-notes")?.value??t.notes,p()}i()}const le=document.querySelector("#app");function ce(e){const a=!!H(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];le.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([l,o])=>`<a href="${l}" class="${e===l||l==="#/"&&e.startsWith("#/invoices")?"active":""}">${o}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function V(){const e=location.hash||"#/";ce(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await Y(a):e==="#/new"?C(a):e.startsWith("#/edit/")?C(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Q(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await ie(a):e==="#/company"?await Z(a):e==="#/customers"?await _(a):e==="#/backup"?await G(a):e==="#/login"?ee(a):e==="#/logout"?te():e==="#/status"?await ae(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{V()});V();
