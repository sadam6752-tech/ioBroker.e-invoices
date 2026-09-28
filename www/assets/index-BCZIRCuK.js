(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))d(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&d(u)}).observe(document,{childList:!0,subtree:!0});function a(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function d(l){if(l.ep)return;l.ep=!0;const o=a(l);fetch(l.href,o)}})();const q="einv-token";function x(){try{return localStorage.getItem(q)}catch{return null}}function N(t){try{t?localStorage.setItem(q,t):localStorage.removeItem(q)}catch{}}async function g(t,e){const a=await y(t,{headers:{"content-type":"application/json"},...e});if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`HTTP ${a.status}`)}return await a.json()}async function y(t,e){const a={...e?.headers??{}},d=x();d&&(a.authorization=`Bearer ${d}`);const l=await fetch(t,{...e,headers:a});if(l.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return l}const f={health:()=>g("/api/health"),list:(t={})=>{const e=new URLSearchParams(t).toString();return g(`/api/invoices${e?`?${e}`:""}`)},get:t=>g(`/api/invoices/${t}`),create:t=>g("/api/invoices",{method:"POST",body:JSON.stringify(t)}),update:(t,e)=>g(`/api/invoices/${t}`,{method:"PATCH",body:JSON.stringify(e)}),issue:t=>g(`/api/invoices/${t}/issue`,{method:"POST"}),validate:t=>g(`/api/invoices/${t}/validate`,{method:"POST"}),pdfUrl:t=>`/api/invoices/${t}.pdf`,xmlUrl:t=>`/api/invoices/${t}.xml`,xlsxUrl:t=>`/api/invoices/${t}.xlsx`,company:{list:()=>g("/api/company-profiles"),getDefault:()=>g("/api/company-profiles/default"),create:(t,e)=>g("/api/company-profiles",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>g(`/api/company-profiles/${t}`,{method:"PUT",body:JSON.stringify(e)})},exportUrl:(t={})=>{const e=new URLSearchParams(t).toString();return`/api/invoices/export.xlsx${e?`?${e}`:""}`}};function n(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function w(t){return`${Number(t).toFixed(2)} EUR`}function E(t){return t.split("/").pop()??t}async function R(t){t.innerHTML='<div class="card">Lade Backups…</div>';let e=[],a="",d=!1;async function l(){const u=await y("/api/backups");if(!u.ok)throw new Error("Backups konnten nicht geladen werden");e=await u.json(),o()}function o(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${d?"error":""}">${n(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${e.map(u=>`<div class="row" style="margin-top:8px">
				<strong>${n(E(u.filename))}</strong>
				<span class="muted">${n(u.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(u.size/1024)} KB</span>
				<a class="btn secondary" href="/api/backups/file/${n(E(u.filename))}">Download</a>
				<button class="secondary" data-restore="${n(u.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,t.querySelector("#b-now")?.addEventListener("click",async()=>{try{const u=await y("/api/backups",{method:"POST"});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const p=await u.json();a=`Gesichert: ${E(p.filename)}`,d=!1,await l()}catch(u){a=u.message,d=!0,o()}}),t.querySelectorAll("[data-restore]").forEach(u=>u.addEventListener("click",async()=>{const p=u.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${E(p)}? Die aktuelle Datenbank wird ersetzt.`))try{const m=await y("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const s=await m.json();a=`Wiederhergestellt: ${s.invoices} Rechnungen, ${s.templates} Vorlagen${s.fileErrors.length>0?` (${s.fileErrors.length} Dateifehler)`:""}`,d=!1,o()}catch(m){a=m.message,d=!0,o()}})),t.querySelector("#b-upload")?.addEventListener("click",async()=>{const u=t.querySelector("#b-file")?.files?.[0];if(!u){a="Bitte zuerst eine ZIP-Datei wählen",d=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${u.name}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await new Promise((i,c)=>{const r=new FileReader;r.onload=()=>i(String(r.result).split(",")[1]),r.onerror=()=>c(new Error("Datei nicht lesbar")),r.readAsDataURL(u)}),m=await y("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:p})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const s=await m.json();a=`Wiederhergestellt: ${s.invoices} Rechnungen, ${s.templates} Vorlagen`,d=!1,await l()}catch(p){a=p.message,d=!0,o()}})}try{await l()}catch(u){t.innerHTML=`<div class="card error">${n(u.message)}</div>`}}const A=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function b(t,e,a){return`<label>${a}<input data-f="${e}" value="${n(t[e]??"")}" /></label>`}async function U(t){t.innerHTML='<div class="card">Lade Firmendaten…</div>';let e=null,a="",d=!1;try{e=await f.company.getDefault(),e||(e=(await f.company.list())[0]??null)}catch(o){t.innerHTML=`<div class="card error">${n(o.message)}</div>`;return}function l(){const o=e?.profile??A();t.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(e?.name??"Meine Firma")}" /></label>
			${b(o,"name","Firmenname")}
			${b(o,"street","Straße")}
			<div class="grid2">${b(o,"zip","PLZ")}${b(o,"city","Ort")}</div>
			<div class="grid2">${b(o,"country","Land")}${b(o,"email","E-Mail")}</div>
			<div class="grid2">${b(o,"phone","Telefon")}${b(o,"website","Webseite")}</div>
			<div class="grid2">${b(o,"vatId","USt-IdNr.")}${b(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${b(o,"iban","IBAN")}${b(o,"bic","BIC")}</div>
			${a?`<p class="${d?"error":""}">${n(a)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,t.querySelector("#c-save")?.addEventListener("click",async()=>{const u={...A()};t.querySelectorAll("input[data-f]").forEach(m=>{u[m.dataset.f]=m.value});const p=t.querySelector("#c-name")?.value.trim()||"Meine Firma";try{e?e=await f.company.update(e.id,{name:p,profile:u}):e=await f.company.create(p,u),a="Gespeichert.",d=!1,l()}catch(m){a=m.message,d=!0,l()}})}l()}function B(t){return`<span class="badge ${t}">${t}</span>`}async function F(t){t.innerHTML=`
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
		<div id="list"></div>`;const e=t.querySelector("#f-status"),a=t.querySelector("#f-q"),d=t.querySelector("#list");async function l(){const u={};e.value&&(u.status=e.value),a.value.trim()&&(u.q=a.value.trim());try{const p=await f.list(u);d.innerHTML=p.map(m=>`<div class="card"><div class="row">
					<strong>${n(m.number??"(Entwurf)")}</strong>${B(m.status)}
					<span>${n(m.buyer.name||"—")}</span>
					<span>${w(m.totals.grossTotal)}</span>
					<a href="#/invoices/${n(m.id)}">Ansehen</a>
					${m.pdfPath?`<a href="${f.pdfUrl(m.id)}" download="${n(m.number??"rechnung")}.pdf">PDF ↓</a>`:""}
					${m.xml?`<a href="${f.xmlUrl(m.id)}" download="${n(m.number??"rechnung")}.xml">XML ↓</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>'}catch(p){d.innerHTML=`<div class="card error">${n(p.message)}</div>`}}e.onchange=()=>{o(),l()},a.oninput=()=>{o(),l()};function o(){const u={};e.value&&(u.status=e.value),a.value.trim()&&(u.q=a.value.trim()),t.querySelector("#f-export").href=f.exportUrl(u)}o(),await l()}async function V(t,e){t.innerHTML='<div class="card">Lade…</div>';try{const a=await f.get(e);t.innerHTML=`
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
			${a.lines.map((l,o)=>`<tr><td>${o+1}</td><td>${n(l.description)}</td><td>${l.quantity} ${n(l.unit)}</td><td>${l.vatRate} %</td><td>${w(l.quantity*l.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${w(a.totals.grossTotal)}</strong> <span class="muted">(netto ${w(a.totals.netTotal)} + USt ${w(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${n(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?`<a class="btn secondary" href="${f.pdfUrl(a.id)}" target="_blank" rel="noopener">PDF ansehen</a>`:""}
				${a.pdfPath?`<a class="btn secondary" href="${f.pdfUrl(a.id)}" download="${n(a.number??"rechnung")}.pdf">PDF ↓</a>`:""}
				${a.xml?`<a class="btn secondary" href="${f.xmlUrl(a.id)}" download="${n(a.number??"rechnung")}.xml">XML ↓</a>`:""}
				${a.xlsxPath?`<a class="btn secondary" href="${f.xlsxUrl(a.id)}" download="${n(a.number??"rechnung")}.xlsx">Excel ↓</a>`:""}
			</div><div id="d-out"></div></div>`;const d=t.querySelector("#d-out");t.querySelector("#d-validate")?.addEventListener("click",async()=>{d.innerHTML='<p class="muted">Validiere…</p>';try{const l=await f.validate(a.id);d.innerHTML=l.formatErrors.length+l.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...l.formatErrors,...l.businessErrors].map(o=>`<li class="error">${n(o)}</li>`).join("")}</ul>`}catch(l){d.innerHTML=`<p class="error">${n(l.message)}</p>`}}),t.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const l=await f.issue(a.id);location.hash=`#/invoices/${l.id}`,location.reload()}catch(l){d.innerHTML=`<p class="error">${n(l.message)}</p>`}})}catch(a){t.innerHTML=`<div class="card error">${n(a.message)}</div>`}}function K(t){const e=x();t.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(e??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${e?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,t.querySelector("#l-save")?.addEventListener("click",()=>{const a=t.querySelector("#l-token")?.value.trim()??"";N(a||null),location.hash="#/"}),t.querySelector("#l-out")?.addEventListener("click",()=>{N(null),location.hash="#/login",location.reload()})}function J(){N(null),location.hash="#/login"}async function W(t){try{const e=await f.health();t.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(e.version)} · Schema: ${n(String(e.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(e.counts,null,2))}</pre></div>`}catch(e){t.innerHTML=`<div class="card error">API nicht erreichbar: ${n(e.message)}</div>`}}const C=["title","meta","parties","positions","totals"],M=["payment","notes"];async function G(t){t.innerHTML='<div class="card">Lade Vorlagen…</div>';let e=[],a=null,d="";async function l(){e=await o(),p()}async function o(){const s=await y("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function u(s){const i=s.definition,c=(r,v,h)=>`<label><input type="checkbox" data-f="blocks.${r}" ${i.blocks[r]?"checked":""} ${h?"disabled":""} style="width:auto" /> ${v}${h?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(i.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(i.colors.text)}" /></label>
		</div>
		${C.map(r=>c(r,`Block ${r}`,!0)).join("")}
		${M.map(r=>c(r,`Block ${r}`,!1)).join("")}
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
				${["right","left","center"].map(r=>`<option ${i.logo?.position===r?"selected":""}>${r}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${i.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${i.logo?`<p class="muted">Aktuell: ${n(i.logo.path)}</p>`:""}`}function p(){t.innerHTML=`
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
		${a?`<div class="card"><h3>${n(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${u(a)}
			${d?`<p class="error">${n(d)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#t-new")?.addEventListener("click",async()=>{const c=(await(await y("/api/templates")).json())[0];if(!c){d="Keine Basisvorlage vorhanden",p();return}a={...structuredClone(c),id:"neu",name:"Neu",version:1,isDefault:!1},d="",p()}),t.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const i=e.find(c=>c.id===s.dataset.edit);i&&(a=structuredClone(i),d="",p())})),t.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const i=e.find(v=>v.id===s.dataset.prev);if(!i)return;const c=await y("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!c.ok){d="Vorschau fehlgeschlagen",p();return}const r=await c.blob();window.open(URL.createObjectURL(r),"_blank")})),t.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{await y(`/api/templates/${s.dataset.def}/default`,{method:"POST"}),a=null,await l()})),t.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const i=await y(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!i.ok){d=(await i.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await l()})),t.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,d="",p()}),t.querySelector("#t-save")?.addEventListener("click",()=>{m()})}async function m(){if(!a)return;const s=structuredClone(a.definition);s.name=(t.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=t.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=t.querySelector("#t-c2")?.value??s.colors.text;for(const i of M)s.blocks[i]=t.querySelector(`[data-f="blocks.${i}"]`)?.checked??s.blocks[i];for(const i of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])s[i]=t.querySelector(`[data-f="${i}"]`)?.checked??!1;s.footerText=t.querySelector("#t-footer")?.value??"",s.introText=t.querySelector("#t-intro")?.value??"",s.closingText=t.querySelector("#t-closing")?.value??"",s.signatureName=t.querySelector("#t-sign")?.value??"",s.headerExtra=t.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=t.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(t.querySelector("#t-lw")?.value??30));try{let i=a.id;if(i==="neu"){const r=await y("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:s.name,definition:s})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");i=(await r.json()).id}else{const r=await y(`/api/templates/${i}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:s.name,definition:s})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const c=t.querySelector("#t-logo")?.files?.[0];if(c){const r=await new Promise((h,S)=>{const $=new FileReader;$.onload=()=>h(String($.result).split(",")[1]),$.onerror=()=>S(new Error("Datei nicht lesbar")),$.readAsDataURL(c)}),v=await y(`/api/templates/${i}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:c.name,mime:c.type,dataBase64:r})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,d="",await l()}catch(i){d=i.message,p()}}try{await l()}catch(s){t.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const j=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),P=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),k="einv-wizard-v1",H="einv-employee";function Z(){try{return localStorage.getItem(H)??""}catch{return""}}function O(){return new Date().toISOString().slice(0,10)}function D(){return{step:0,seller:j(),buyer:j(),lines:[P()],issueDate:O(),deliveryDate:O(),dueDate:"",employee:Z(),documentTitle:"Rechnung",notes:"",draftId:null,error:"",savedAt:new Date().toISOString()}}function T(t){return t.seller.name.trim()!==""||t.buyer.name.trim()!==""||t.lines.some(e=>e.description.trim()!==""||e.unitPriceNet!==0)}function _(){try{const t=localStorage.getItem(k);if(!t)return null;const e=JSON.parse(t);return!e||!Array.isArray(e.lines)||!e.seller||!e.buyer?null:{...D(),...e,error:"",step:Math.min(Number(e.step)||0,3)}}catch{return null}}function I(t,e,a){return`
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
		<label>IBAN<input data-p="${t}" data-f="iban" value="${n(e.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${t}" data-f="customerNumber" value="${n(e.customerNumber)}" /></label>`}`}const X=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function Y(t){let e=D();const a=_();if(a&&T(a)&&!a.draftId){t.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(a.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,t.querySelector("#w-resume")?.addEventListener("click",()=>{e=a,p()}),t.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(k),p()});return}a&&T(a)&&(e=a);let d=[];f.company.list().then(i=>{d=i,e.step===0&&!t.querySelector("#w-company")&&p()}).catch(()=>{}),T(e)||f.company.getDefault().then(i=>{i&&!e.seller.name.trim()&&i.profile.name.trim()&&(e.seller={...e.seller,...i.profile},p())}).catch(()=>{});function l(){try{localStorage.setItem(k,JSON.stringify({...e,error:"",savedAt:new Date().toISOString()}))}catch{}}function o(){t.querySelectorAll("input[data-p]").forEach(c=>{const r=c.dataset.p==="seller"?e.seller:e.buyer;r[c.dataset.f]=c.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(c=>{const[r,v]=c.dataset.l.split("."),h=e.lines[Number(r)];h&&(v==="quantity"||v==="unitPriceNet"||v==="vatRate"?h[v]=Number(c.value):h[v]=c.value)});const i=c=>t.querySelector(`#${c}`)?.value??"";e.issueDate=i("w-issue")||e.issueDate,e.deliveryDate=i("w-delivery")||e.deliveryDate,e.dueDate=i("w-due"),t.querySelector("#w-employee")&&(e.employee=i("w-employee")),e.documentTitle=i("w-title")||"Rechnung",e.notes=t.querySelector("#w-notes")?.value??"",l()}function u(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((c,r)=>`<span class="${r===e.step?"on":""}">${r+1}. ${c}</span>`).join("")}</div>`}function p(){o();let i="";if(e.step===0&&(i=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(c=>`<option value="${n(c.id)}">${n(c.name)}${c.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${I("seller",e.seller,!0)}</div>`),e.step===1&&(i=`<div class="card"><h3>Käufer</h3>${I("buyer",e.buyer,!1)}</div>`),e.step===2&&(i=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${X.map(c=>`<option ${c===e.documentTitle?"selected":""}>${c}</option>`).join("")}
				</select></label>
				${e.lines.map((c,r)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${r}.description" value="${n(c.description)}" /></label>
						<label>Art.Nr.<input data-l="${r}.sku" value="${n(c.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${r}.details" rows="1">${n(c.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${r}.quantity" type="number" min="0" step="any" value="${c.quantity}" /></label>
						<label>Einheit<input data-l="${r}.unit" value="${n(c.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${r}.unitPriceNet" type="number" min="0" step="0.01" value="${c.unitPriceNet}" /></label>
						<label>USt %<select data-l="${r}.vatRate">
							${[19,7,0].map(v=>`<option ${v===c.vatRate?"selected":""}>${v}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${r}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(e.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(e.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(e.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(e.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(e.notes)}</textarea></label>
			</div>`),e.step===3){const c=e.lines.reduce((v,h)=>v+h.quantity*h.unitPriceNet,0),r=e.lines.reduce((v,h)=>v+h.quantity*h.unitPriceNet*h.vatRate/100,0);i=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(e.documentTitle)}</strong> · ${n(e.seller.name||"—")} → ${n(e.buyer.name||"—")} · ${e.lines.length} Positionen</p>
				<p><strong>ca. ${w(Math.round((c+r)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}t.innerHTML=`${u()}${i}
			${e.error?`<div class="card error">${n(e.error)}</div>`:""}
			<div class="row">
				${e.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${e.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,t.querySelector("#w-back")?.addEventListener("click",()=>{e.step--,p()}),t.querySelector("#w-company")?.addEventListener("change",()=>{const c=t.querySelector("#w-company")?.value??"",r=d.find(v=>v.id===c);r&&(o(),e.seller={...e.seller,...r.profile},p())}),t.querySelector("#w-next")?.addEventListener("click",()=>{e.step++,p()}),t.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(k),e=D(),p())}),t.querySelector("#w-add")?.addEventListener("click",()=>{o(),e.lines.push(P()),p()}),t.querySelectorAll("[data-del]").forEach(c=>c.addEventListener("click",()=>{o(),e.lines.splice(Number(c.dataset.del),1),e.lines.length===0&&e.lines.push(P()),p()})),t.querySelector("#w-save")?.addEventListener("click",()=>{m(!1)}),t.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&m(!0)})}async function m(i){o(),e.error="";const c={seller:e.seller,buyer:e.buyer,lines:e.lines,issueDate:e.issueDate,deliveryDate:e.deliveryDate,dueDate:e.dueDate||void 0,currency:"EUR",employeeCode:e.employee.trim()||void 0,documentTitle:e.documentTitle,notes:e.notes||void 0};try{if(e.employee.trim())try{localStorage.setItem(H,e.employee.trim())}catch{}let r;e.draftId?r=await f.update(e.draftId,c):(r=await f.create(c),e.draftId=r.id,l()),i&&(r=await f.issue(r.id),localStorage.removeItem(k)),location.hash=`#/invoices/${r.id}`}catch(r){e.error=r.message,p()}}t.addEventListener("input",()=>{try{s()}catch{}});function s(){t.querySelectorAll("input[data-p]").forEach(h=>{const S=h.dataset.p==="seller"?e.seller:e.buyer;S[h.dataset.f]=h.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(h=>{const[S,$]=h.dataset.l.split("."),L=e.lines[Number(S)];L&&($==="quantity"||$==="unitPriceNet"||$==="vatRate"?L[$]=Number(h.value):L[$]=h.value)});const i=h=>t.querySelector(`#${h}`)?.value??"",c=i("w-issue"),r=i("w-delivery");c&&(e.issueDate=c),r&&(e.deliveryDate=r),e.dueDate=i("w-due"),t.querySelector("#w-employee")&&(e.employee=i("w-employee"));const v=i("w-title");v&&(e.documentTitle=v),e.notes=t.querySelector("#w-notes")?.value??e.notes,l()}p()}const Q=document.querySelector("#app");function ee(t){const e=!!x(),a=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/backup","Backup"],["#/status","Status"],[e?"#/logout":"#/login",e?"Logout":"Login"]];Q.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${a.map(([d,l])=>`<a href="${d}" class="${t===d||d==="#/"&&t.startsWith("#/invoices")?"active":""}">${l}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function z(){const t=location.hash||"#/";ee(t);const e=document.querySelector("#view");t==="#/"||t==="#"?await F(e):t==="#/new"?Y(e):t.startsWith("#/invoices/")?await V(e,decodeURIComponent(t.slice(11))):t==="#/templates"?await G(e):t==="#/company"?await U(e):t==="#/backup"?await R(e):t==="#/login"?K(e):t==="#/logout"?J():t==="#/status"?await W(e):e.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{z()});z();
