(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))o(l);new MutationObserver(l=>{for(const c of l)if(c.type==="childList")for(const d of c.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&o(d)}).observe(document,{childList:!0,subtree:!0});function a(l){const c={};return l.integrity&&(c.integrity=l.integrity),l.referrerPolicy&&(c.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?c.credentials="include":l.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function o(l){if(l.ep)return;l.ep=!0;const c=a(l);fetch(l.href,c)}})();const q="einv-token";function x(){try{return localStorage.getItem(q)}catch{return null}}function N(t){try{t?localStorage.setItem(q,t):localStorage.removeItem(q)}catch{}}async function $(t,e){const a=await y(t,{headers:{"content-type":"application/json"},...e});if(!a.ok){const o=await a.json().catch(()=>({}));throw new Error(o.error??`HTTP ${a.status}`)}return await a.json()}async function y(t,e){const a={...e?.headers??{}},o=x();o&&(a.authorization=`Bearer ${o}`);const l=await fetch(t,{...e,headers:a});if(l.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return l}const f={health:()=>$("/api/health"),list:(t={})=>{const e=new URLSearchParams(t).toString();return $(`/api/invoices${e?`?${e}`:""}`)},get:t=>$(`/api/invoices/${t}`),create:t=>$("/api/invoices",{method:"POST",body:JSON.stringify(t)}),update:(t,e)=>$(`/api/invoices/${t}`,{method:"PATCH",body:JSON.stringify(e)}),issue:t=>$(`/api/invoices/${t}/issue`,{method:"POST"}),validate:t=>$(`/api/invoices/${t}/validate`,{method:"POST"}),pdfUrl:t=>`/api/invoices/${t}.pdf`,xmlUrl:t=>`/api/invoices/${t}.xml`,xlsxUrl:t=>`/api/invoices/${t}.xlsx`,company:{list:()=>$("/api/company-profiles"),getDefault:()=>$("/api/company-profiles/default"),create:(t,e)=>$("/api/company-profiles",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>$(`/api/company-profiles/${t}`,{method:"PUT",body:JSON.stringify(e)})},exportUrl:(t={})=>{const e=new URLSearchParams(t).toString();return`/api/invoices/export.xlsx${e?`?${e}`:""}`}};function n(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function S(t){return`${Number(t).toFixed(2)} EUR`}function E(t){return t.split("/").pop()??t}async function R(t){t.innerHTML='<div class="card">Lade Backups…</div>';let e=[],a="",o=!1;async function l(){const d=await y("/api/backups");if(!d.ok)throw new Error("Backups konnten nicht geladen werden");e=await d.json(),c()}function c(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${o?"error":""}">${n(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${e.map(d=>`<div class="row" style="margin-top:8px">
				<strong>${n(E(d.filename))}</strong>
				<span class="muted">${n(d.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(d.size/1024)} KB</span>
				<a class="btn secondary" href="/api/backups/file/${n(E(d.filename))}">Download</a>
				<button class="secondary" data-restore="${n(d.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,t.querySelector("#b-now")?.addEventListener("click",async()=>{try{const d=await y("/api/backups",{method:"POST"});if(!d.ok)throw new Error((await d.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const p=await d.json();a=`Gesichert: ${E(p.filename)}`,o=!1,await l()}catch(d){a=d.message,o=!0,c()}}),t.querySelectorAll("[data-restore]").forEach(d=>d.addEventListener("click",async()=>{const p=d.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${E(p)}? Die aktuelle Datenbank wird ersetzt.`))try{const m=await y("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await m.json();a=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen${r.fileErrors.length>0?` (${r.fileErrors.length} Dateifehler)`:""}`,o=!1,c()}catch(m){a=m.message,o=!0,c()}})),t.querySelector("#b-upload")?.addEventListener("click",async()=>{const d=t.querySelector("#b-file")?.files?.[0];if(!d){a="Bitte zuerst eine ZIP-Datei wählen",o=!0,c();return}if(window.confirm(`Wirklich wiederherstellen aus ${d.name}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await new Promise((s,u)=>{const i=new FileReader;i.onload=()=>s(String(i.result).split(",")[1]),i.onerror=()=>u(new Error("Datei nicht lesbar")),i.readAsDataURL(d)}),m=await y("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:p})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await m.json();a=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen`,o=!1,await l()}catch(p){a=p.message,o=!0,c()}})}try{await l()}catch(d){t.innerHTML=`<div class="card error">${n(d.message)}</div>`}}const A=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function g(t,e,a){return`<label>${a}<input data-f="${e}" value="${n(t[e]??"")}" /></label>`}async function U(t){t.innerHTML='<div class="card">Lade Firmendaten…</div>';let e=null,a="",o=!1;try{e=await f.company.getDefault(),e||(e=(await f.company.list())[0]??null)}catch(c){t.innerHTML=`<div class="card error">${n(c.message)}</div>`;return}function l(){const c=e?.profile??A();t.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(e?.name??"Meine Firma")}" /></label>
			${g(c,"name","Firmenname")}
			${g(c,"street","Straße")}
			<div class="grid2">${g(c,"zip","PLZ")}${g(c,"city","Ort")}</div>
			<div class="grid2">${g(c,"country","Land")}${g(c,"email","E-Mail")}</div>
			<div class="grid2">${g(c,"phone","Telefon")}${g(c,"website","Webseite")}</div>
			<div class="grid2">${g(c,"vatId","USt-IdNr.")}${g(c,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${g(c,"iban","IBAN")}${g(c,"bic","BIC")}</div>
			${a?`<p class="${o?"error":""}">${n(a)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,t.querySelector("#c-save")?.addEventListener("click",async()=>{const d={...A()};t.querySelectorAll("input[data-f]").forEach(m=>{d[m.dataset.f]=m.value});const p=t.querySelector("#c-name")?.value.trim()||"Meine Firma";try{e?e=await f.company.update(e.id,{name:p,profile:d}):e=await f.company.create(p,d),a="Gespeichert.",o=!1,l()}catch(m){a=m.message,o=!0,l()}})}l()}function B(t){return`<span class="badge ${t}">${t}</span>`}async function F(t){t.innerHTML=`
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
		<div id="list"></div>`;const e=t.querySelector("#f-status"),a=t.querySelector("#f-q"),o=t.querySelector("#list");async function l(){const d={};e.value&&(d.status=e.value),a.value.trim()&&(d.q=a.value.trim());try{const p=await f.list(d);o.innerHTML=p.map(m=>`<div class="card"><div class="row">
					<strong>${n(m.number??"(Entwurf)")}</strong>${B(m.status)}
					<span>${n(m.buyer.name||"—")}</span>
					<span>${S(m.totals.grossTotal)}</span>
					<a href="#/invoices/${n(m.id)}">Ansehen</a>
					${m.pdfPath?`<a href="${f.pdfUrl(m.id)}" download="${n(m.number??"rechnung")}.pdf">PDF ↓</a>`:""}
					${m.xml?`<a href="${f.xmlUrl(m.id)}" download="${n(m.number??"rechnung")}.xml">XML ↓</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>'}catch(p){o.innerHTML=`<div class="card error">${n(p.message)}</div>`}}e.onchange=()=>{c(),l()},a.oninput=()=>{c(),l()};function c(){const d={};e.value&&(d.status=e.value),a.value.trim()&&(d.q=a.value.trim()),t.querySelector("#f-export").href=f.exportUrl(d)}c(),await l()}async function V(t,e){t.innerHTML='<div class="card">Lade…</div>';try{const a=await f.get(e);t.innerHTML=`
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
			${a.lines.map((l,c)=>`<tr><td>${c+1}</td><td>${n(l.description)}</td><td>${l.quantity} ${n(l.unit)}</td><td>${l.vatRate} %</td><td>${S(l.quantity*l.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${S(a.totals.grossTotal)}</strong> <span class="muted">(netto ${S(a.totals.netTotal)} + USt ${S(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${n(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?`<a class="btn secondary" href="${f.pdfUrl(a.id)}" target="_blank" rel="noopener">PDF ansehen</a>`:""}
				${a.pdfPath?`<a class="btn secondary" href="${f.pdfUrl(a.id)}" download="${n(a.number??"rechnung")}.pdf">PDF ↓</a>`:""}
				${a.xml?`<a class="btn secondary" href="${f.xmlUrl(a.id)}" download="${n(a.number??"rechnung")}.xml">XML ↓</a>`:""}
				${a.xlsxPath?`<a class="btn secondary" href="${f.xlsxUrl(a.id)}" download="${n(a.number??"rechnung")}.xlsx">Excel ↓</a>`:""}
			</div><div id="d-out"></div></div>`;const o=t.querySelector("#d-out");t.querySelector("#d-validate")?.addEventListener("click",async()=>{o.innerHTML='<p class="muted">Validiere…</p>';try{const l=await f.validate(a.id);o.innerHTML=l.formatErrors.length+l.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...l.formatErrors,...l.businessErrors].map(c=>`<li class="error">${n(c)}</li>`).join("")}</ul>`}catch(l){o.innerHTML=`<p class="error">${n(l.message)}</p>`}}),t.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const l=await f.issue(a.id);location.hash=`#/invoices/${l.id}`,location.reload()}catch(l){o.innerHTML=`<p class="error">${n(l.message)}</p>`}})}catch(a){t.innerHTML=`<div class="card error">${n(a.message)}</div>`}}function K(t){const e=x();t.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(e??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${e?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,t.querySelector("#l-save")?.addEventListener("click",()=>{const a=t.querySelector("#l-token")?.value.trim()??"";N(a||null),location.hash="#/"}),t.querySelector("#l-out")?.addEventListener("click",()=>{N(null),location.hash="#/login",location.reload()})}function J(){N(null),location.hash="#/login"}async function C(t){try{const e=await f.health();t.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(e.version)} · Schema: ${n(String(e.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(e.counts,null,2))}</pre></div>`}catch(e){t.innerHTML=`<div class="card error">API nicht erreichbar: ${n(e.message)}</div>`}}const W=["title","meta","parties","positions","totals"],M=["payment","notes"];async function G(t){t.innerHTML='<div class="card">Lade Vorlagen…</div>';let e=[],a=null,o="";async function l(){e=await c(),p()}async function c(){const r=await y("/api/templates");if(!r.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await r.json()}function d(r){const s=r.definition,u=(i,h,v)=>`<label><input type="checkbox" data-f="blocks.${i}" ${s.blocks[i]?"checked":""} ${v?"disabled":""} style="width:auto" /> ${h}${v?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(r.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(s.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(s.colors.text)}" /></label>
		</div>
		${W.map(i=>u(i,`Block ${i}`,!0)).join("")}
		${M.map(i=>u(i,`Block ${i}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${s.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${s.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${s.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${s.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showTagline" ${s.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${n(s.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${n(s.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${n(s.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${n(s.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${n(s.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(i=>`<option ${s.logo?.position===i?"selected":""}>${i}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${s.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${s.logo?`<p class="muted">Aktuell: ${n(s.logo.path)}</p>`:""}`}function p(){t.innerHTML=`
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
		${a?`<div class="card"><h3>${n(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${d(a)}
			${o?`<p class="error">${n(o)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#t-new")?.addEventListener("click",async()=>{const u=(await(await y("/api/templates")).json())[0];if(!u){o="Keine Basisvorlage vorhanden",p();return}a={...structuredClone(u),id:"neu",name:"Neu",version:1,isDefault:!1},o="",p()}),t.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{const s=e.find(u=>u.id===r.dataset.edit);s&&(a=structuredClone(s),o="",p())})),t.querySelectorAll("[data-prev]").forEach(r=>r.addEventListener("click",async()=>{const s=e.find(h=>h.id===r.dataset.prev);if(!s)return;const u=await y("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!u.ok){o="Vorschau fehlgeschlagen",p();return}const i=await u.blob();window.open(URL.createObjectURL(i),"_blank")})),t.querySelectorAll("[data-def]").forEach(r=>r.addEventListener("click",async()=>{await y(`/api/templates/${r.dataset.def}/default`,{method:"POST"}),a=null,await l()})),t.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{const s=await y(`/api/templates/${r.dataset.del}`,{method:"DELETE"});if(!s.ok){o=(await s.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await l()})),t.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,o="",p()}),t.querySelector("#t-save")?.addEventListener("click",()=>{m()})}async function m(){if(!a)return;const r=structuredClone(a.definition);r.name=(t.querySelector("#t-name")?.value??r.name).trim(),r.colors.primary=t.querySelector("#t-c1")?.value??r.colors.primary,r.colors.text=t.querySelector("#t-c2")?.value??r.colors.text;for(const s of M)r.blocks[s]=t.querySelector(`[data-f="blocks.${s}"]`)?.checked??r.blocks[s];for(const s of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])r[s]=t.querySelector(`[data-f="${s}"]`)?.checked??!1;r.footerText=t.querySelector("#t-footer")?.value??"",r.introText=t.querySelector("#t-intro")?.value??"",r.closingText=t.querySelector("#t-closing")?.value??"",r.signatureName=t.querySelector("#t-sign")?.value??"",r.headerExtra=t.querySelector("#t-hextra")?.value??"",r.logo&&(r.logo.position=t.querySelector("#t-lpos")?.value??"right",r.logo.widthMm=Number(t.querySelector("#t-lw")?.value??30));try{let s=a.id;if(s==="neu"){const i=await y("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");s=(await i.json()).id}else{const i=await y(`/api/templates/${s}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const u=t.querySelector("#t-logo")?.files?.[0];if(u){const i=await new Promise((v,b)=>{const w=new FileReader;w.onload=()=>v(String(w.result).split(",")[1]),w.onerror=()=>b(new Error("Datei nicht lesbar")),w.readAsDataURL(u)}),h=await y(`/api/templates/${s}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:u.name,mime:u.type,dataBase64:i})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,o="",await l()}catch(s){o=s.message,p()}}try{await l()}catch(r){t.innerHTML=`<div class="card error">${n(r.message)}</div>`}}const j=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),P=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),k="einv-wizard-v1",H="einv-employee";function Z(){try{return localStorage.getItem(H)??""}catch{return""}}function O(){return new Date().toISOString().slice(0,10)}function D(){return{step:0,seller:j(),buyer:j(),lines:[P()],issueDate:O(),deliveryDate:O(),dueDate:"",employee:Z(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,error:"",savedAt:new Date().toISOString()}}function T(t){return t.seller.name.trim()!==""||t.buyer.name.trim()!==""||t.lines.some(e=>e.description.trim()!==""||e.unitPriceNet!==0)}function _(){try{const t=localStorage.getItem(k);if(!t)return null;const e=JSON.parse(t);return!e||!Array.isArray(e.lines)||!e.seller||!e.buyer?null:{...D(),...e,error:"",step:Math.min(Number(e.step)||0,3)}}catch{return null}}function I(t,e,a){return`
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
		</div>`,t.querySelector("#w-resume")?.addEventListener("click",()=>{e=a,p()}),t.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(k),p()});return}a&&T(a)&&(e=a);let o=[];f.company.list().then(s=>{o=s,e.step===0&&!t.querySelector("#w-company")&&p()}).catch(()=>{}),T(e)||f.company.getDefault().then(s=>{s&&!e.seller.name.trim()&&s.profile.name.trim()&&(e.seller={...e.seller,...s.profile},e.selectedCompany=s.id,p(!0))}).catch(()=>{});function l(){try{localStorage.setItem(k,JSON.stringify({...e,error:"",savedAt:new Date().toISOString()}))}catch{}}function c(){t.querySelectorAll("input[data-p]").forEach(u=>{const i=u.dataset.p==="seller"?e.seller:e.buyer;i[u.dataset.f]=u.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(u=>{const[i,h]=u.dataset.l.split("."),v=e.lines[Number(i)];v&&(h==="quantity"||h==="unitPriceNet"||h==="vatRate"?v[h]=Number(u.value):v[h]=u.value)});const s=u=>t.querySelector(`#${u}`)?.value??"";e.issueDate=s("w-issue")||e.issueDate,e.deliveryDate=s("w-delivery")||e.deliveryDate,e.dueDate=s("w-due"),t.querySelector("#w-employee")&&(e.employee=s("w-employee")),e.documentTitle=s("w-title")||"Rechnung",e.notes=t.querySelector("#w-notes")?.value??"",l()}function d(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((u,i)=>`<span class="${i===e.step?"on":""}">${i+1}. ${u}</span>`).join("")}</div>`}function p(s=!1){s||c();let u="";if(e.step===0&&(u=`<div class="card"><h3>Verkäufer</h3>
				${o.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${o.map(i=>`<option value="${n(i.id)}" ${e.selectedCompany===i.id?"selected":""}>${n(i.name)}${i.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${I("seller",e.seller,!0)}</div>`),e.step===1&&(u=`<div class="card"><h3>Käufer</h3>${I("buyer",e.buyer,!1)}</div>`),e.step===2&&(u=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${X.map(i=>`<option ${i===e.documentTitle?"selected":""}>${i}</option>`).join("")}
				</select></label>
				${e.lines.map((i,h)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${h}.description" value="${n(i.description)}" /></label>
						<label>Art.Nr.<input data-l="${h}.sku" value="${n(i.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${h}.details" rows="1">${n(i.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${h}.quantity" type="number" min="0" step="any" value="${i.quantity}" /></label>
						<label>Einheit<input data-l="${h}.unit" value="${n(i.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${h}.unitPriceNet" type="number" min="0" step="0.01" value="${i.unitPriceNet}" /></label>
						<label>USt %<select data-l="${h}.vatRate">
							${[19,7,0].map(v=>`<option ${v===i.vatRate?"selected":""}>${v}</option>`).join("")}
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
			</div>`),e.step===3){const i=e.lines.reduce((v,b)=>v+b.quantity*b.unitPriceNet,0),h=e.lines.reduce((v,b)=>v+b.quantity*b.unitPriceNet*b.vatRate/100,0);u=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(e.documentTitle)}</strong> · ${n(e.seller.name||"—")} → ${n(e.buyer.name||"—")} · ${e.lines.length} Positionen</p>
				<p><strong>ca. ${S(Math.round((i+h)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}t.innerHTML=`${d()}${u}
			${e.error?`<div class="card error">${n(e.error)}</div>`:""}
			<div class="row">
				${e.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${e.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,t.querySelector("#w-back")?.addEventListener("click",()=>{e.step--,p()}),t.querySelector("#w-company")?.addEventListener("change",()=>{const i=t.querySelector("#w-company")?.value??"",h=o.find(v=>v.id===i);h?(e.seller={...e.seller,...h.profile},e.selectedCompany=h.id,p(!0)):e.selectedCompany=null}),t.querySelector("#w-next")?.addEventListener("click",()=>{e.step++,p()}),t.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(k),e=D(),p())}),t.querySelector("#w-add")?.addEventListener("click",()=>{c(),e.lines.push(P()),p()}),t.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",()=>{c(),e.lines.splice(Number(i.dataset.del),1),e.lines.length===0&&e.lines.push(P()),p()})),t.querySelector("#w-save")?.addEventListener("click",()=>{m(!1)}),t.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&m(!0)})}async function m(s){c(),e.error="";const u={seller:e.seller,buyer:e.buyer,lines:e.lines,issueDate:e.issueDate,deliveryDate:e.deliveryDate,dueDate:e.dueDate||void 0,currency:"EUR",employeeCode:e.employee.trim()||void 0,documentTitle:e.documentTitle,notes:e.notes||void 0};try{if(e.employee.trim())try{localStorage.setItem(H,e.employee.trim())}catch{}let i;e.draftId?i=await f.update(e.draftId,u):(i=await f.create(u),e.draftId=i.id,l()),s&&(i=await f.issue(i.id),localStorage.removeItem(k)),location.hash=`#/invoices/${i.id}`}catch(i){e.error=i.message,p()}}t.addEventListener("input",()=>{try{r()}catch{}});function r(){t.querySelectorAll("input[data-p]").forEach(v=>{const b=v.dataset.p==="seller"?e.seller:e.buyer;b[v.dataset.f]=v.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(v=>{const[b,w]=v.dataset.l.split("."),L=e.lines[Number(b)];L&&(w==="quantity"||w==="unitPriceNet"||w==="vatRate"?L[w]=Number(v.value):L[w]=v.value)});const s=v=>t.querySelector(`#${v}`)?.value??"",u=s("w-issue"),i=s("w-delivery");u&&(e.issueDate=u),i&&(e.deliveryDate=i),e.dueDate=s("w-due"),t.querySelector("#w-employee")&&(e.employee=s("w-employee"));const h=s("w-title");h&&(e.documentTitle=h),e.notes=t.querySelector("#w-notes")?.value??e.notes,l()}p()}const Q=document.querySelector("#app");function ee(t){const e=!!x(),a=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/backup","Backup"],["#/status","Status"],[e?"#/logout":"#/login",e?"Logout":"Login"]];Q.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${a.map(([o,l])=>`<a href="${o}" class="${t===o||o==="#/"&&t.startsWith("#/invoices")?"active":""}">${l}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function z(){const t=location.hash||"#/";ee(t);const e=document.querySelector("#view");t==="#/"||t==="#"?await F(e):t==="#/new"?Y(e):t.startsWith("#/invoices/")?await V(e,decodeURIComponent(t.slice(11))):t==="#/templates"?await G(e):t==="#/company"?await U(e):t==="#/backup"?await R(e):t==="#/login"?K(e):t==="#/logout"?J():t==="#/status"?await C(e):e.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{z()});z();
