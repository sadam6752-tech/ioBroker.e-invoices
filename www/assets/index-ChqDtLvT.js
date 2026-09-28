(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))d(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&d(u)}).observe(document,{childList:!0,subtree:!0});function a(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function d(s){if(s.ep)return;s.ep=!0;const o=a(s);fetch(s.href,o)}})();const T="einv-token";function D(){try{return localStorage.getItem(T)}catch{return null}}function q(t){try{t?localStorage.setItem(T,t):localStorage.removeItem(T)}catch{}}async function b(t,e){const a={"content-type":"application/json"},d=D();d&&(a.authorization=`Bearer ${d}`);const s=await fetch(t,{...e,headers:{...a,...e?.headers??{}}});if(s.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");if(!s.ok){const o=await s.json().catch(()=>({}));throw new Error(o.error??`HTTP ${s.status}`)}return await s.json()}const f={health:()=>b("/api/health"),list:(t={})=>{const e=new URLSearchParams(t).toString();return b(`/api/invoices${e?`?${e}`:""}`)},get:t=>b(`/api/invoices/${t}`),create:t=>b("/api/invoices",{method:"POST",body:JSON.stringify(t)}),update:(t,e)=>b(`/api/invoices/${t}`,{method:"PATCH",body:JSON.stringify(e)}),issue:t=>b(`/api/invoices/${t}/issue`,{method:"POST"}),validate:t=>b(`/api/invoices/${t}/validate`,{method:"POST"}),pdfUrl:t=>`/api/invoices/${t}.pdf`,xmlUrl:t=>`/api/invoices/${t}.xml`,xlsxUrl:t=>`/api/invoices/${t}.xlsx`,company:{list:()=>b("/api/company-profiles"),getDefault:()=>b("/api/company-profiles/default"),create:(t,e)=>b("/api/company-profiles",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>b(`/api/company-profiles/${t}`,{method:"PUT",body:JSON.stringify(e)})},exportUrl:(t={})=>{const e=new URLSearchParams(t).toString();return`/api/invoices/export.xlsx${e?`?${e}`:""}`}};function n(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function $(t){return`${Number(t).toFixed(2)} EUR`}function k(t){return t.split("/").pop()??t}async function z(t){t.innerHTML='<div class="card">Lade Backups…</div>';let e=[],a="",d=!1;async function s(){const u=await fetch("/api/backups");if(!u.ok)throw new Error("Backups konnten nicht geladen werden");e=await u.json(),o()}function o(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${d?"error":""}">${n(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${e.map(u=>`<div class="row" style="margin-top:8px">
				<strong>${n(k(u.filename))}</strong>
				<span class="muted">${n(u.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(u.size/1024)} KB</span>
				<a class="btn secondary" href="/api/backups/file/${n(k(u.filename))}">Download</a>
				<button class="secondary" data-restore="${n(u.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,t.querySelector("#b-now")?.addEventListener("click",async()=>{try{const u=await fetch("/api/backups",{method:"POST"});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const p=await u.json();a=`Gesichert: ${k(p.filename)}`,d=!1,await s()}catch(u){a=u.message,d=!0,o()}}),t.querySelectorAll("[data-restore]").forEach(u=>u.addEventListener("click",async()=>{const p=u.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${k(p)}? Die aktuelle Datenbank wird ersetzt.`))try{const h=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await h.json();a=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen${r.fileErrors.length>0?` (${r.fileErrors.length} Dateifehler)`:""}`,d=!1,o()}catch(h){a=h.message,d=!0,o()}})),t.querySelector("#b-upload")?.addEventListener("click",async()=>{const u=t.querySelector("#b-file")?.files?.[0];if(!u){a="Bitte zuerst eine ZIP-Datei wählen",d=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${u.name}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await new Promise((i,c)=>{const l=new FileReader;l.onload=()=>i(String(l.result).split(",")[1]),l.onerror=()=>c(new Error("Datei nicht lesbar")),l.readAsDataURL(u)}),h=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:p})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await h.json();a=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen`,d=!1,await s()}catch(p){a=p.message,d=!0,o()}})}try{await s()}catch(u){t.innerHTML=`<div class="card error">${n(u.message)}</div>`}}const x=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function y(t,e,a){return`<label>${a}<input data-f="${e}" value="${n(t[e]??"")}" /></label>`}async function R(t){t.innerHTML='<div class="card">Lade Firmendaten…</div>';let e=null,a="",d=!1;try{e=await f.company.getDefault(),e||(e=(await f.company.list())[0]??null)}catch(o){t.innerHTML=`<div class="card error">${n(o.message)}</div>`;return}function s(){const o=e?.profile??x();t.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(e?.name??"Meine Firma")}" /></label>
			${y(o,"name","Firmenname")}
			${y(o,"street","Straße")}
			<div class="grid2">${y(o,"zip","PLZ")}${y(o,"city","Ort")}</div>
			<div class="grid2">${y(o,"country","Land")}${y(o,"email","E-Mail")}</div>
			<div class="grid2">${y(o,"phone","Telefon")}${y(o,"website","Webseite")}</div>
			<div class="grid2">${y(o,"vatId","USt-IdNr.")}${y(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${y(o,"iban","IBAN")}${y(o,"bic","BIC")}</div>
			${a?`<p class="${d?"error":""}">${n(a)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,t.querySelector("#c-save")?.addEventListener("click",async()=>{const u={...x()};t.querySelectorAll("input[data-f]").forEach(h=>{u[h.dataset.f]=h.value});const p=t.querySelector("#c-name")?.value.trim()||"Meine Firma";try{e?e=await f.company.update(e.id,{name:p,profile:u}):e=await f.company.create(p,u),a="Gespeichert.",d=!1,s()}catch(h){a=h.message,d=!0,s()}})}s()}function U(t){return`<span class="badge ${t}">${t}</span>`}async function B(t){t.innerHTML=`
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
		<div id="list"></div>`;const e=t.querySelector("#f-status"),a=t.querySelector("#f-q"),d=t.querySelector("#list");async function s(){const u={};e.value&&(u.status=e.value),a.value.trim()&&(u.q=a.value.trim());try{const p=await f.list(u);d.innerHTML=p.map(h=>`<div class="card"><div class="row">
					<strong>${n(h.number??"(Entwurf)")}</strong>${U(h.status)}
					<span>${n(h.buyer.name||"—")}</span>
					<span>${$(h.totals.grossTotal)}</span>
					<a href="#/invoices/${n(h.id)}">Ansehen</a>
					${h.pdfPath?`<a href="${f.pdfUrl(h.id)}" download="${n(h.number??"rechnung")}.pdf">PDF ↓</a>`:""}
					${h.xml?`<a href="${f.xmlUrl(h.id)}" download="${n(h.number??"rechnung")}.xml">XML ↓</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>'}catch(p){d.innerHTML=`<div class="card error">${n(p.message)}</div>`}}e.onchange=()=>{o(),s()},a.oninput=()=>{o(),s()};function o(){const u={};e.value&&(u.status=e.value),a.value.trim()&&(u.q=a.value.trim()),t.querySelector("#f-export").href=f.exportUrl(u)}o(),await s()}async function F(t,e){t.innerHTML='<div class="card">Lade…</div>';try{const a=await f.get(e);t.innerHTML=`
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
			${a.lines.map((s,o)=>`<tr><td>${o+1}</td><td>${n(s.description)}</td><td>${s.quantity} ${n(s.unit)}</td><td>${s.vatRate} %</td><td>${$(s.quantity*s.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${$(a.totals.grossTotal)}</strong> <span class="muted">(netto ${$(a.totals.netTotal)} + USt ${$(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${n(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?`<a class="btn secondary" href="${f.pdfUrl(a.id)}" target="_blank" rel="noopener">PDF ansehen</a>`:""}
				${a.pdfPath?`<a class="btn secondary" href="${f.pdfUrl(a.id)}" download="${n(a.number??"rechnung")}.pdf">PDF ↓</a>`:""}
				${a.xml?`<a class="btn secondary" href="${f.xmlUrl(a.id)}" download="${n(a.number??"rechnung")}.xml">XML ↓</a>`:""}
				${a.xlsxPath?`<a class="btn secondary" href="${f.xlsxUrl(a.id)}" download="${n(a.number??"rechnung")}.xlsx">Excel ↓</a>`:""}
			</div><div id="d-out"></div></div>`;const d=t.querySelector("#d-out");t.querySelector("#d-validate")?.addEventListener("click",async()=>{d.innerHTML='<p class="muted">Validiere…</p>';try{const s=await f.validate(a.id);d.innerHTML=s.formatErrors.length+s.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...s.formatErrors,...s.businessErrors].map(o=>`<li class="error">${n(o)}</li>`).join("")}</ul>`}catch(s){d.innerHTML=`<p class="error">${n(s.message)}</p>`}}),t.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const s=await f.issue(a.id);location.hash=`#/invoices/${s.id}`,location.reload()}catch(s){d.innerHTML=`<p class="error">${n(s.message)}</p>`}})}catch(a){t.innerHTML=`<div class="card error">${n(a.message)}</div>`}}function V(t){const e=D();t.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(e??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${e?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,t.querySelector("#l-save")?.addEventListener("click",()=>{const a=t.querySelector("#l-token")?.value.trim()??"";q(a||null),location.hash="#/"}),t.querySelector("#l-out")?.addEventListener("click",()=>{q(null),location.hash="#/login",location.reload()})}function K(){q(null),location.hash="#/login"}async function J(t){try{const e=await f.health();t.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(e.version)} · Schema: ${n(String(e.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(e.counts,null,2))}</pre></div>`}catch(e){t.innerHTML=`<div class="card error">API nicht erreichbar: ${n(e.message)}</div>`}}const W=["title","meta","parties","positions","totals"],A=["payment","notes"];async function C(t){t.innerHTML='<div class="card">Lade Vorlagen…</div>';let e=[],a=null,d="";async function s(){e=await o(),p()}async function o(){const r=await fetch("/api/templates");if(!r.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await r.json()}function u(r){const i=r.definition,c=(l,v,m)=>`<label><input type="checkbox" data-f="blocks.${l}" ${i.blocks[l]?"checked":""} ${m?"disabled":""} style="width:auto" /> ${v}${m?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(r.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(i.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(i.colors.text)}" /></label>
		</div>
		${W.map(l=>c(l,`Block ${l}`,!0)).join("")}
		${A.map(l=>c(l,`Block ${l}`,!1)).join("")}
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
				${["right","left","center"].map(l=>`<option ${i.logo?.position===l?"selected":""}>${l}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${i.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${i.logo?`<p class="muted">Aktuell: ${n(i.logo.path)}</p>`:""}`}function p(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${e.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${n(r.name)}</strong><span class="muted">v${r.version}</span>
				${r.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${r.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${r.id}">Vorschau</button>
				${r.isDefault?"":`<button class="secondary" data-def="${r.id}">Standard</button>`}
				${r.isDefault?"":`<button class="danger" data-del="${r.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${a?`<div class="card"><h3>${n(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${u(a)}
			${d?`<p class="error">${n(d)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#t-new")?.addEventListener("click",async()=>{const c=(await(await fetch("/api/templates")).json())[0];if(!c){d="Keine Basisvorlage vorhanden",p();return}a={...structuredClone(c),id:"neu",name:"Neu",version:1,isDefault:!1},d="",p()}),t.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{const i=e.find(c=>c.id===r.dataset.edit);i&&(a=structuredClone(i),d="",p())})),t.querySelectorAll("[data-prev]").forEach(r=>r.addEventListener("click",async()=>{const i=e.find(v=>v.id===r.dataset.prev);if(!i)return;const c=await fetch("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!c.ok){d="Vorschau fehlgeschlagen",p();return}const l=await c.blob();window.open(URL.createObjectURL(l),"_blank")})),t.querySelectorAll("[data-def]").forEach(r=>r.addEventListener("click",async()=>{await fetch(`/api/templates/${r.dataset.def}/default`,{method:"POST"}),a=null,await s()})),t.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{const i=await fetch(`/api/templates/${r.dataset.del}`,{method:"DELETE"});if(!i.ok){d=(await i.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await s()})),t.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,d="",p()}),t.querySelector("#t-save")?.addEventListener("click",()=>{h()})}async function h(){if(!a)return;const r=structuredClone(a.definition);r.name=(t.querySelector("#t-name")?.value??r.name).trim(),r.colors.primary=t.querySelector("#t-c1")?.value??r.colors.primary,r.colors.text=t.querySelector("#t-c2")?.value??r.colors.text;for(const i of A)r.blocks[i]=t.querySelector(`[data-f="blocks.${i}"]`)?.checked??r.blocks[i];for(const i of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])r[i]=t.querySelector(`[data-f="${i}"]`)?.checked??!1;r.footerText=t.querySelector("#t-footer")?.value??"",r.introText=t.querySelector("#t-intro")?.value??"",r.closingText=t.querySelector("#t-closing")?.value??"",r.signatureName=t.querySelector("#t-sign")?.value??"",r.headerExtra=t.querySelector("#t-hextra")?.value??"",r.logo&&(r.logo.position=t.querySelector("#t-lpos")?.value??"right",r.logo.widthMm=Number(t.querySelector("#t-lw")?.value??30));try{let i=a.id;if(i==="neu"){const l=await fetch("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!l.ok)throw new Error((await l.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");i=(await l.json()).id}else{const l=await fetch(`/api/templates/${i}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!l.ok)throw new Error((await l.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const c=t.querySelector("#t-logo")?.files?.[0];if(c){const l=await new Promise((m,w)=>{const g=new FileReader;g.onload=()=>m(String(g.result).split(",")[1]),g.onerror=()=>w(new Error("Datei nicht lesbar")),g.readAsDataURL(c)}),v=await fetch(`/api/templates/${i}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:c.name,mime:c.type,dataBase64:l})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,d="",await s()}catch(i){d=i.message,p()}}try{await s()}catch(r){t.innerHTML=`<div class="card error">${n(r.message)}</div>`}}const M=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),N=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),S="einv-wizard-v1",I="einv-employee";function G(){try{return localStorage.getItem(I)??""}catch{return""}}function j(){return new Date().toISOString().slice(0,10)}function P(){return{step:0,seller:M(),buyer:M(),lines:[N()],issueDate:j(),deliveryDate:j(),dueDate:"",employee:G(),documentTitle:"Rechnung",notes:"",draftId:null,error:"",savedAt:new Date().toISOString()}}function L(t){return t.seller.name.trim()!==""||t.buyer.name.trim()!==""||t.lines.some(e=>e.description.trim()!==""||e.unitPriceNet!==0)}function Z(){try{const t=localStorage.getItem(S);if(!t)return null;const e=JSON.parse(t);return!e||!Array.isArray(e.lines)||!e.seller||!e.buyer?null:{...P(),...e,error:"",step:Math.min(Number(e.step)||0,3)}}catch{return null}}function O(t,e,a){return`
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
		<label>IBAN<input data-p="${t}" data-f="iban" value="${n(e.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${t}" data-f="customerNumber" value="${n(e.customerNumber)}" /></label>`}`}const _=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function X(t){let e=P();const a=Z();if(a&&L(a)&&!a.draftId){t.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(a.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,t.querySelector("#w-resume")?.addEventListener("click",()=>{e=a,p()}),t.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(S),p()});return}a&&L(a)&&(e=a);let d=[];f.company.list().then(i=>{d=i,e.step===0&&!t.querySelector("#w-company")&&p()}).catch(()=>{}),L(e)||f.company.getDefault().then(i=>{i&&!e.seller.name.trim()&&i.profile.name.trim()&&(e.seller={...e.seller,...i.profile},p())}).catch(()=>{});function s(){try{localStorage.setItem(S,JSON.stringify({...e,error:"",savedAt:new Date().toISOString()}))}catch{}}function o(){t.querySelectorAll("input[data-p]").forEach(c=>{const l=c.dataset.p==="seller"?e.seller:e.buyer;l[c.dataset.f]=c.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(c=>{const[l,v]=c.dataset.l.split("."),m=e.lines[Number(l)];m&&(v==="quantity"||v==="unitPriceNet"||v==="vatRate"?m[v]=Number(c.value):m[v]=c.value)});const i=c=>t.querySelector(`#${c}`)?.value??"";e.issueDate=i("w-issue")||e.issueDate,e.deliveryDate=i("w-delivery")||e.deliveryDate,e.dueDate=i("w-due"),t.querySelector("#w-employee")&&(e.employee=i("w-employee")),e.documentTitle=i("w-title")||"Rechnung",e.notes=t.querySelector("#w-notes")?.value??"",s()}function u(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((c,l)=>`<span class="${l===e.step?"on":""}">${l+1}. ${c}</span>`).join("")}</div>`}function p(){o();let i="";if(e.step===0&&(i=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(c=>`<option value="${n(c.id)}">${n(c.name)}${c.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${O("seller",e.seller,!0)}</div>`),e.step===1&&(i=`<div class="card"><h3>Käufer</h3>${O("buyer",e.buyer,!1)}</div>`),e.step===2&&(i=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${_.map(c=>`<option ${c===e.documentTitle?"selected":""}>${c}</option>`).join("")}
				</select></label>
				${e.lines.map((c,l)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${l}.description" value="${n(c.description)}" /></label>
						<label>Art.Nr.<input data-l="${l}.sku" value="${n(c.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${l}.details" rows="1">${n(c.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${l}.quantity" type="number" min="0" step="any" value="${c.quantity}" /></label>
						<label>Einheit<input data-l="${l}.unit" value="${n(c.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${l}.unitPriceNet" type="number" min="0" step="0.01" value="${c.unitPriceNet}" /></label>
						<label>USt %<select data-l="${l}.vatRate">
							${[19,7,0].map(v=>`<option ${v===c.vatRate?"selected":""}>${v}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${l}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(e.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(e.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(e.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(e.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(e.notes)}</textarea></label>
			</div>`),e.step===3){const c=e.lines.reduce((v,m)=>v+m.quantity*m.unitPriceNet,0),l=e.lines.reduce((v,m)=>v+m.quantity*m.unitPriceNet*m.vatRate/100,0);i=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(e.documentTitle)}</strong> · ${n(e.seller.name||"—")} → ${n(e.buyer.name||"—")} · ${e.lines.length} Positionen</p>
				<p><strong>ca. ${$(Math.round((c+l)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}t.innerHTML=`${u()}${i}
			${e.error?`<div class="card error">${n(e.error)}</div>`:""}
			<div class="row">
				${e.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${e.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,t.querySelector("#w-back")?.addEventListener("click",()=>{e.step--,p()}),t.querySelector("#w-company")?.addEventListener("change",()=>{const c=t.querySelector("#w-company")?.value??"",l=d.find(v=>v.id===c);l&&(o(),e.seller={...e.seller,...l.profile},p())}),t.querySelector("#w-next")?.addEventListener("click",()=>{e.step++,p()}),t.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(S),e=P(),p())}),t.querySelector("#w-add")?.addEventListener("click",()=>{o(),e.lines.push(N()),p()}),t.querySelectorAll("[data-del]").forEach(c=>c.addEventListener("click",()=>{o(),e.lines.splice(Number(c.dataset.del),1),e.lines.length===0&&e.lines.push(N()),p()})),t.querySelector("#w-save")?.addEventListener("click",()=>{h(!1)}),t.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&h(!0)})}async function h(i){o(),e.error="";const c={seller:e.seller,buyer:e.buyer,lines:e.lines,issueDate:e.issueDate,deliveryDate:e.deliveryDate,dueDate:e.dueDate||void 0,currency:"EUR",employeeCode:e.employee.trim()||void 0,documentTitle:e.documentTitle,notes:e.notes||void 0};try{if(e.employee.trim())try{localStorage.setItem(I,e.employee.trim())}catch{}let l;e.draftId?l=await f.update(e.draftId,c):(l=await f.create(c),e.draftId=l.id,s()),i&&(l=await f.issue(l.id),localStorage.removeItem(S)),location.hash=`#/invoices/${l.id}`}catch(l){e.error=l.message,p()}}t.addEventListener("input",()=>{try{r()}catch{}});function r(){t.querySelectorAll("input[data-p]").forEach(m=>{const w=m.dataset.p==="seller"?e.seller:e.buyer;w[m.dataset.f]=m.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(m=>{const[w,g]=m.dataset.l.split("."),E=e.lines[Number(w)];E&&(g==="quantity"||g==="unitPriceNet"||g==="vatRate"?E[g]=Number(m.value):E[g]=m.value)});const i=m=>t.querySelector(`#${m}`)?.value??"",c=i("w-issue"),l=i("w-delivery");c&&(e.issueDate=c),l&&(e.deliveryDate=l),e.dueDate=i("w-due"),t.querySelector("#w-employee")&&(e.employee=i("w-employee"));const v=i("w-title");v&&(e.documentTitle=v),e.notes=t.querySelector("#w-notes")?.value??e.notes,s()}p()}const Y=document.querySelector("#app");function Q(t){const e=!!D(),a=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/backup","Backup"],["#/status","Status"],[e?"#/logout":"#/login",e?"Logout":"Login"]];Y.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${a.map(([d,s])=>`<a href="${d}" class="${t===d||d==="#/"&&t.startsWith("#/invoices")?"active":""}">${s}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function H(){const t=location.hash||"#/";Q(t);const e=document.querySelector("#view");t==="#/"||t==="#"?await B(e):t==="#/new"?X(e):t.startsWith("#/invoices/")?await F(e,decodeURIComponent(t.slice(11))):t==="#/templates"?await C(e):t==="#/company"?await R(e):t==="#/backup"?await z(e):t==="#/login"?V(e):t==="#/logout"?K():t==="#/status"?await J(e):e.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{H()});H();
