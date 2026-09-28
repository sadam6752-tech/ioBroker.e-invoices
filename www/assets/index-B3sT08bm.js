(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))d(r);new MutationObserver(r=>{for(const c of r)if(c.type==="childList")for(const l of c.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&d(l)}).observe(document,{childList:!0,subtree:!0});function a(r){const c={};return r.integrity&&(c.integrity=r.integrity),r.referrerPolicy&&(c.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?c.credentials="include":r.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function d(r){if(r.ep)return;r.ep=!0;const c=a(r);fetch(r.href,c)}})();const L="einv-token";function P(){try{return localStorage.getItem(L)}catch{return null}}function T(t){try{t?localStorage.setItem(L,t):localStorage.removeItem(L)}catch{}}async function y(t,e){const a={"content-type":"application/json"},d=P();d&&(a.authorization=`Bearer ${d}`);const r=await fetch(t,{...e,headers:{...a,...e?.headers??{}}});if(r.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");if(!r.ok){const c=await r.json().catch(()=>({}));throw new Error(c.error??`HTTP ${r.status}`)}return await r.json()}const v={health:()=>y("/api/health"),list:(t={})=>{const e=new URLSearchParams(t).toString();return y(`/api/invoices${e?`?${e}`:""}`)},get:t=>y(`/api/invoices/${t}`),create:t=>y("/api/invoices",{method:"POST",body:JSON.stringify(t)}),update:(t,e)=>y(`/api/invoices/${t}`,{method:"PATCH",body:JSON.stringify(e)}),issue:t=>y(`/api/invoices/${t}/issue`,{method:"POST"}),validate:t=>y(`/api/invoices/${t}/validate`,{method:"POST"}),pdfUrl:t=>`/api/invoices/${t}.pdf`,xmlUrl:t=>`/api/invoices/${t}.xml`,xlsxUrl:t=>`/api/invoices/${t}.xlsx`,company:{list:()=>y("/api/company-profiles"),getDefault:()=>y("/api/company-profiles/default"),create:(t,e)=>y("/api/company-profiles",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>y(`/api/company-profiles/${t}`,{method:"PUT",body:JSON.stringify(e)})},exportUrl:(t={})=>{const e=new URLSearchParams(t).toString();return`/api/invoices/export.xlsx${e?`?${e}`:""}`}};function i(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function w(t){return`${Number(t).toFixed(2)} EUR`}function k(t){return t.split("/").pop()??t}async function H(t){t.innerHTML='<div class="card">Lade Backups…</div>';let e=[],a="",d=!1;async function r(){const l=await fetch("/api/backups");if(!l.ok)throw new Error("Backups konnten nicht geladen werden");e=await l.json(),c()}function c(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${d?"error":""}">${i(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${e.map(l=>`<div class="row" style="margin-top:8px">
				<strong>${i(k(l.filename))}</strong>
				<span class="muted">${i(l.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(l.size/1024)} KB</span>
				<a class="btn secondary" href="/api/backups/file/${i(k(l.filename))}">Download</a>
				<button class="secondary" data-restore="${i(l.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,t.querySelector("#b-now")?.addEventListener("click",async()=>{try{const l=await fetch("/api/backups",{method:"POST"});if(!l.ok)throw new Error((await l.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const h=await l.json();a=`Gesichert: ${k(h.filename)}`,d=!1,await r()}catch(l){a=l.message,d=!0,c()}}),t.querySelectorAll("[data-restore]").forEach(l=>l.addEventListener("click",async()=>{const h=l.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${k(h)}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:h})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const n=await p.json();a=`Wiederhergestellt: ${n.invoices} Rechnungen, ${n.templates} Vorlagen${n.fileErrors.length>0?` (${n.fileErrors.length} Dateifehler)`:""}`,d=!1,c()}catch(p){a=p.message,d=!0,c()}})),t.querySelector("#b-upload")?.addEventListener("click",async()=>{const l=t.querySelector("#b-file")?.files?.[0];if(!l){a="Bitte zuerst eine ZIP-Datei wählen",d=!0,c();return}if(window.confirm(`Wirklich wiederherstellen aus ${l.name}? Die aktuelle Datenbank wird ersetzt.`))try{const h=await new Promise((s,o)=>{const u=new FileReader;u.onload=()=>s(String(u.result).split(",")[1]),u.onerror=()=>o(new Error("Datei nicht lesbar")),u.readAsDataURL(l)}),p=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:h})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const n=await p.json();a=`Wiederhergestellt: ${n.invoices} Rechnungen, ${n.templates} Vorlagen`,d=!1,await r()}catch(h){a=h.message,d=!0,c()}})}try{await r()}catch(l){t.innerHTML=`<div class="card error">${i(l.message)}</div>`}}const D=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function f(t,e,a){return`<label>${a}<input data-f="${e}" value="${i(t[e]??"")}" /></label>`}async function z(t){t.innerHTML='<div class="card">Lade Firmendaten…</div>';let e=null,a="",d=!1;try{e=await v.company.getDefault(),e||(e=(await v.company.list())[0]??null)}catch(c){t.innerHTML=`<div class="card error">${i(c.message)}</div>`;return}function r(){const c=e?.profile??D();t.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${i(e?.name??"Meine Firma")}" /></label>
			${f(c,"name","Firmenname")}
			${f(c,"street","Straße")}
			<div class="grid2">${f(c,"zip","PLZ")}${f(c,"city","Ort")}</div>
			<div class="grid2">${f(c,"country","Land")}${f(c,"email","E-Mail")}</div>
			<div class="grid2">${f(c,"phone","Telefon")}${f(c,"website","Webseite")}</div>
			<div class="grid2">${f(c,"vatId","USt-IdNr.")}${f(c,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${f(c,"iban","IBAN")}${f(c,"bic","BIC")}</div>
			${a?`<p class="${d?"error":""}">${i(a)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,t.querySelector("#c-save")?.addEventListener("click",async()=>{const l={...D()};t.querySelectorAll("input[data-f]").forEach(p=>{l[p.dataset.f]=p.value});const h=t.querySelector("#c-name")?.value.trim()||"Meine Firma";try{e?e=await v.company.update(e.id,{name:h,profile:l}):e=await v.company.create(h,l),a="Gespeichert.",d=!1,r()}catch(p){a=p.message,d=!0,r()}})}r()}function R(t){return`<span class="badge ${t}">${t}</span>`}async function B(t){t.innerHTML=`
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
			<a class="btn secondary" id="f-export" href="#">Excel</a>
		</div></div>
		<div id="list"></div>`;const e=t.querySelector("#f-status"),a=t.querySelector("#f-q"),d=t.querySelector("#list");async function r(){const l={};e.value&&(l.status=e.value),a.value.trim()&&(l.q=a.value.trim());try{const h=await v.list(l);d.innerHTML=h.map(p=>`<div class="card"><div class="row">
					<strong>${i(p.number??"(Entwurf)")}</strong>${R(p.status)}
					<span>${i(p.buyer.name||"—")}</span>
					<span>${w(p.totals.grossTotal)}</span>
					<a href="#/invoices/${i(p.id)}">Ansehen</a>
					${p.pdfPath?`<a href="${v.pdfUrl(p.id)}" download="${i(p.number??"rechnung")}.pdf">PDF ↓</a>`:""}
					${p.xml?`<a href="${v.xmlUrl(p.id)}" download="${i(p.number??"rechnung")}.xml">XML ↓</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>'}catch(h){d.innerHTML=`<div class="card error">${i(h.message)}</div>`}}e.onchange=()=>{c(),r()},a.oninput=()=>{c(),r()};function c(){const l={};e.value&&(l.status=e.value),a.value.trim()&&(l.q=a.value.trim()),t.querySelector("#f-export").href=v.exportUrl(l)}c(),await r()}async function U(t,e){t.innerHTML='<div class="card">Lade…</div>';try{const a=await v.get(e);t.innerHTML=`
			<div class="card"><div class="row">
				<strong>${i(a.number??"(Entwurf)")}</strong>
				<span class="badge ${a.status}">${a.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${i(a.seller.name)}<br />${i(a.seller.street)}<br />${i(a.seller.zip)} ${i(a.seller.city)}</div>
				<div><strong>Käufer</strong><br />${i(a.buyer.name)}<br />${i(a.buyer.street)}<br />${i(a.buyer.zip)} ${i(a.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${i(a.issueDate)} · Leistung: ${i(a.deliveryDate)}${a.dueDate?` · Fällig: ${i(a.dueDate)}`:""}</p>
			<table class="lines"><tr><th>#</th><th>Beschreibung</th><th>Menge</th><th>USt</th><th>Netto</th></tr>
			${a.lines.map((r,c)=>`<tr><td>${c+1}</td><td>${i(r.description)}</td><td>${r.quantity} ${i(r.unit)}</td><td>${r.vatRate} %</td><td>${w(r.quantity*r.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${w(a.totals.grossTotal)}</strong> <span class="muted">(netto ${w(a.totals.netTotal)} + USt ${w(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${i(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?`<a class="btn secondary" href="${v.pdfUrl(a.id)}" target="_blank" rel="noopener">PDF ansehen</a>`:""}
				${a.pdfPath?`<a class="btn secondary" href="${v.pdfUrl(a.id)}" download="${i(a.number??"rechnung")}.pdf">PDF ↓</a>`:""}
				${a.xml?`<a class="btn secondary" href="${v.xmlUrl(a.id)}" download="${i(a.number??"rechnung")}.xml">XML ↓</a>`:""}
				${a.xlsxPath?`<a class="btn secondary" href="${v.xlsxUrl(a.id)}" download="${i(a.number??"rechnung")}.xlsx">Excel ↓</a>`:""}
			</div><div id="d-out"></div></div>`;const d=t.querySelector("#d-out");t.querySelector("#d-validate")?.addEventListener("click",async()=>{d.innerHTML='<p class="muted">Validiere…</p>';try{const r=await v.validate(a.id);d.innerHTML=r.formatErrors.length+r.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...r.formatErrors,...r.businessErrors].map(c=>`<li class="error">${i(c)}</li>`).join("")}</ul>`}catch(r){d.innerHTML=`<p class="error">${i(r.message)}</p>`}}),t.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const r=await v.issue(a.id);location.hash=`#/invoices/${r.id}`,location.reload()}catch(r){d.innerHTML=`<p class="error">${i(r.message)}</p>`}})}catch(a){t.innerHTML=`<div class="card error">${i(a.message)}</div>`}}function F(t){const e=P();t.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${i(e??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${e?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,t.querySelector("#l-save")?.addEventListener("click",()=>{const a=t.querySelector("#l-token")?.value.trim()??"";T(a||null),location.hash="#/"}),t.querySelector("#l-out")?.addEventListener("click",()=>{T(null),location.hash="#/login",location.reload()})}function V(){T(null),location.hash="#/login"}async function K(t){try{const e=await v.health();t.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${i(e.version)} · Schema: ${i(String(e.schemaVersion))}</p>
			<pre class="dump">${i(JSON.stringify(e.counts,null,2))}</pre></div>`}catch(e){t.innerHTML=`<div class="card error">API nicht erreichbar: ${i(e.message)}</div>`}}const J=["title","meta","parties","positions","totals"],x=["payment","notes"];async function W(t){t.innerHTML='<div class="card">Lade Vorlagen…</div>';let e=[],a=null,d="";async function r(){e=await c(),h()}async function c(){const n=await fetch("/api/templates");if(!n.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await n.json()}function l(n){const s=n.definition,o=(u,m,b)=>`<label><input type="checkbox" data-f="blocks.${u}" ${s.blocks[u]?"checked":""} ${b?"disabled":""} style="width:auto" /> ${m}${b?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${i(n.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${i(s.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${i(s.colors.text)}" /></label>
		</div>
		${J.map(u=>o(u,`Block ${u}`,!0)).join("")}
		${x.map(u=>o(u,`Block ${u}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${s.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${s.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${s.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${s.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showTagline" ${s.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${i(s.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${i(s.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${i(s.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${i(s.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${i(s.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(u=>`<option ${s.logo?.position===u?"selected":""}>${u}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${s.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${s.logo?`<p class="muted">Aktuell: ${i(s.logo.path)}</p>`:""}`}function h(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${e.map(n=>`<div class="row" style="margin-top:8px">
				<strong>${i(n.name)}</strong><span class="muted">v${n.version}</span>
				${n.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${n.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${n.id}">Vorschau</button>
				${n.isDefault?"":`<button class="secondary" data-def="${n.id}">Standard</button>`}
				${n.isDefault?"":`<button class="danger" data-del="${n.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${a?`<div class="card"><h3>${i(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${l(a)}
			${d?`<p class="error">${i(d)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#t-new")?.addEventListener("click",async()=>{const o=(await(await fetch("/api/templates")).json())[0];if(!o){d="Keine Basisvorlage vorhanden",h();return}a={...structuredClone(o),id:"neu",name:"Neu",version:1,isDefault:!1},d="",h()}),t.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{const s=e.find(o=>o.id===n.dataset.edit);s&&(a=structuredClone(s),d="",h())})),t.querySelectorAll("[data-prev]").forEach(n=>n.addEventListener("click",async()=>{const s=e.find(m=>m.id===n.dataset.prev);if(!s)return;const o=await fetch("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!o.ok){d="Vorschau fehlgeschlagen",h();return}const u=await o.blob();window.open(URL.createObjectURL(u),"_blank")})),t.querySelectorAll("[data-def]").forEach(n=>n.addEventListener("click",async()=>{await fetch(`/api/templates/${n.dataset.def}/default`,{method:"POST"}),a=null,await r()})),t.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{const s=await fetch(`/api/templates/${n.dataset.del}`,{method:"DELETE"});if(!s.ok){d=(await s.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",h();return}await r()})),t.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,d="",h()}),t.querySelector("#t-save")?.addEventListener("click",()=>{p()})}async function p(){if(!a)return;const n=structuredClone(a.definition);n.name=(t.querySelector("#t-name")?.value??n.name).trim(),n.colors.primary=t.querySelector("#t-c1")?.value??n.colors.primary,n.colors.text=t.querySelector("#t-c2")?.value??n.colors.text;for(const s of x)n.blocks[s]=t.querySelector(`[data-f="blocks.${s}"]`)?.checked??n.blocks[s];for(const s of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])n[s]=t.querySelector(`[data-f="${s}"]`)?.checked??!1;n.footerText=t.querySelector("#t-footer")?.value??"",n.introText=t.querySelector("#t-intro")?.value??"",n.closingText=t.querySelector("#t-closing")?.value??"",n.signatureName=t.querySelector("#t-sign")?.value??"",n.headerExtra=t.querySelector("#t-hextra")?.value??"",n.logo&&(n.logo.position=t.querySelector("#t-lpos")?.value??"right",n.logo.widthMm=Number(t.querySelector("#t-lw")?.value??30));try{let s=a.id;if(s==="neu"){const u=await fetch("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:n.name,definition:n})});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");s=(await u.json()).id}else{const u=await fetch(`/api/templates/${s}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:n.name,definition:n})});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const o=t.querySelector("#t-logo")?.files?.[0];if(o){const u=await new Promise((b,$)=>{const g=new FileReader;g.onload=()=>b(String(g.result).split(",")[1]),g.onerror=()=>$(new Error("Datei nicht lesbar")),g.readAsDataURL(o)}),m=await fetch(`/api/templates/${s}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:o.name,mime:o.type,dataBase64:u})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,d="",await r()}catch(s){d=s.message,h()}}try{await r()}catch(n){t.innerHTML=`<div class="card error">${i(n.message)}</div>`}}const A=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),q=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),S="einv-wizard-v1",O="einv-employee";function C(){try{return localStorage.getItem(O)??""}catch{return""}}function M(){return new Date().toISOString().slice(0,10)}function N(){return{step:0,seller:A(),buyer:A(),lines:[q()],issueDate:M(),deliveryDate:M(),dueDate:"",employee:C(),documentTitle:"Rechnung",notes:"",draftId:null,error:"",savedAt:new Date().toISOString()}}function E(t){return t.seller.name.trim()!==""||t.buyer.name.trim()!==""||t.lines.some(e=>e.description.trim()!==""||e.unitPriceNet!==0)}function G(){try{const t=localStorage.getItem(S);if(!t)return null;const e=JSON.parse(t);return!e||!Array.isArray(e.lines)||!e.seller||!e.buyer?null:{...N(),...e,error:"",step:Math.min(Number(e.step)||0,3)}}catch{return null}}function j(t,e,a){return`
		<label>Name<input data-p="${t}" data-f="name" value="${i(e.name)}" /></label>
		<label>Straße<input data-p="${t}" data-f="street" value="${i(e.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${t}" data-f="zip" value="${i(e.zip)}" /></label>
			<label>Ort<input data-p="${t}" data-f="city" value="${i(e.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${t}" data-f="country" value="${i(e.country)}" /></label>
			<label>E-Mail<input data-p="${t}" data-f="email" value="${i(e.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${t}" data-f="phone" value="${i(e.phone)}" /></label>
			${a?`<label>Webseite<input data-p="${t}" data-f="website" value="${i(e.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${t}" data-f="contactName" value="${i(e.contactName)}" /></label>`}
		</div>
		${a?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${t}" data-f="vatId" value="${i(e.vatId)}" /></label>
			<label>Steuernummer<input data-p="${t}" data-f="taxNumber" value="${i(e.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${t}" data-f="iban" value="${i(e.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${t}" data-f="customerNumber" value="${i(e.customerNumber)}" /></label>`}`}const Z=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function _(t){let e=N();const a=G();if(a&&E(a)&&!a.draftId){t.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${i(a.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,t.querySelector("#w-resume")?.addEventListener("click",()=>{e=a,l()}),t.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(S),l()});return}a&&E(a)&&(e=a),E(e)||v.company.getDefault().then(n=>{n&&!e.seller.name.trim()&&n.profile.name.trim()&&(e.seller={...e.seller,...n.profile},l())}).catch(()=>{});function d(){try{localStorage.setItem(S,JSON.stringify({...e,error:"",savedAt:new Date().toISOString()}))}catch{}}function r(){t.querySelectorAll("input[data-p]").forEach(s=>{const o=s.dataset.p==="seller"?e.seller:e.buyer;o[s.dataset.f]=s.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(s=>{const[o,u]=s.dataset.l.split("."),m=e.lines[Number(o)];m&&(u==="quantity"||u==="unitPriceNet"||u==="vatRate"?m[u]=Number(s.value):m[u]=s.value)});const n=s=>t.querySelector(`#${s}`)?.value??"";e.issueDate=n("w-issue")||e.issueDate,e.deliveryDate=n("w-delivery")||e.deliveryDate,e.dueDate=n("w-due"),t.querySelector("#w-employee")&&(e.employee=n("w-employee")),e.documentTitle=n("w-title")||"Rechnung",e.notes=t.querySelector("#w-notes")?.value??"",d()}function c(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((s,o)=>`<span class="${o===e.step?"on":""}">${o+1}. ${s}</span>`).join("")}</div>`}function l(){r();let n="";if(e.step===0&&(n=`<div class="card"><h3>Verkäufer</h3>${j("seller",e.seller,!0)}</div>`),e.step===1&&(n=`<div class="card"><h3>Käufer</h3>${j("buyer",e.buyer,!1)}</div>`),e.step===2&&(n=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Z.map(s=>`<option ${s===e.documentTitle?"selected":""}>${s}</option>`).join("")}
				</select></label>
				${e.lines.map((s,o)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${o}.description" value="${i(s.description)}" /></label>
						<label>Art.Nr.<input data-l="${o}.sku" value="${i(s.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${o}.details" rows="1">${i(s.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${o}.quantity" type="number" min="0" step="any" value="${s.quantity}" /></label>
						<label>Einheit<input data-l="${o}.unit" value="${i(s.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${o}.unitPriceNet" type="number" min="0" step="0.01" value="${s.unitPriceNet}" /></label>
						<label>USt %<select data-l="${o}.vatRate">
							${[19,7,0].map(u=>`<option ${u===s.vatRate?"selected":""}>${u}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${o}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${i(e.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${i(e.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${i(e.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${i(e.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${i(e.notes)}</textarea></label>
			</div>`),e.step===3){const s=e.lines.reduce((u,m)=>u+m.quantity*m.unitPriceNet,0),o=e.lines.reduce((u,m)=>u+m.quantity*m.unitPriceNet*m.vatRate/100,0);n=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${i(e.documentTitle)}</strong> · ${i(e.seller.name||"—")} → ${i(e.buyer.name||"—")} · ${e.lines.length} Positionen</p>
				<p><strong>ca. ${w(Math.round((s+o)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}t.innerHTML=`${c()}${n}
			${e.error?`<div class="card error">${i(e.error)}</div>`:""}
			<div class="row">
				${e.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${e.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,t.querySelector("#w-back")?.addEventListener("click",()=>{e.step--,l()}),t.querySelector("#w-next")?.addEventListener("click",()=>{e.step++,l()}),t.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(S),e=N(),l())}),t.querySelector("#w-add")?.addEventListener("click",()=>{r(),e.lines.push(q()),l()}),t.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",()=>{r(),e.lines.splice(Number(s.dataset.del),1),e.lines.length===0&&e.lines.push(q()),l()})),t.querySelector("#w-save")?.addEventListener("click",()=>{h(!1)}),t.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&h(!0)})}async function h(n){r(),e.error="";const s={seller:e.seller,buyer:e.buyer,lines:e.lines,issueDate:e.issueDate,deliveryDate:e.deliveryDate,dueDate:e.dueDate||void 0,currency:"EUR",employeeCode:e.employee.trim()||void 0,documentTitle:e.documentTitle,notes:e.notes||void 0};try{if(e.employee.trim())try{localStorage.setItem(O,e.employee.trim())}catch{}let o;e.draftId?o=await v.update(e.draftId,s):(o=await v.create(s),e.draftId=o.id,d()),n&&(o=await v.issue(o.id),localStorage.removeItem(S)),location.hash=`#/invoices/${o.id}`}catch(o){e.error=o.message,l()}}t.addEventListener("input",()=>{try{p()}catch{}});function p(){t.querySelectorAll("input[data-p]").forEach(m=>{const b=m.dataset.p==="seller"?e.seller:e.buyer;b[m.dataset.f]=m.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(m=>{const[b,$]=m.dataset.l.split("."),g=e.lines[Number(b)];g&&($==="quantity"||$==="unitPriceNet"||$==="vatRate"?g[$]=Number(m.value):g[$]=m.value)});const n=m=>t.querySelector(`#${m}`)?.value??"",s=n("w-issue"),o=n("w-delivery");s&&(e.issueDate=s),o&&(e.deliveryDate=o),e.dueDate=n("w-due"),t.querySelector("#w-employee")&&(e.employee=n("w-employee"));const u=n("w-title");u&&(e.documentTitle=u),e.notes=t.querySelector("#w-notes")?.value??e.notes,d()}l()}const X=document.querySelector("#app");function Y(t){const e=!!P(),a=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/backup","Backup"],["#/status","Status"],[e?"#/logout":"#/login",e?"Logout":"Login"]];X.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${a.map(([d,r])=>`<a href="${d}" class="${t===d||d==="#/"&&t.startsWith("#/invoices")?"active":""}">${r}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function I(){const t=location.hash||"#/";Y(t);const e=document.querySelector("#view");t==="#/"||t==="#"?await B(e):t==="#/new"?_(e):t.startsWith("#/invoices/")?await U(e,decodeURIComponent(t.slice(11))):t==="#/templates"?await W(e):t==="#/company"?await z(e):t==="#/backup"?await H(e):t==="#/login"?F(e):t==="#/logout"?V():t==="#/status"?await K(e):e.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{I()});I();
