(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))d(r);new MutationObserver(r=>{for(const u of r)if(u.type==="childList")for(const c of u.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&d(c)}).observe(document,{childList:!0,subtree:!0});function a(r){const u={};return r.integrity&&(u.integrity=r.integrity),r.referrerPolicy&&(u.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?u.credentials="include":r.crossOrigin==="anonymous"?u.credentials="omit":u.credentials="same-origin",u}function d(r){if(r.ep)return;r.ep=!0;const u=a(r);fetch(r.href,u)}})();async function g(t,e){const a=await fetch(t,{headers:{"content-type":"application/json"},...e});if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`HTTP ${a.status}`)}return await a.json()}const v={health:()=>g("/api/health"),list:(t={})=>{const e=new URLSearchParams(t).toString();return g(`/api/invoices${e?`?${e}`:""}`)},get:t=>g(`/api/invoices/${t}`),create:t=>g("/api/invoices",{method:"POST",body:JSON.stringify(t)}),update:(t,e)=>g(`/api/invoices/${t}`,{method:"PATCH",body:JSON.stringify(e)}),issue:t=>g(`/api/invoices/${t}/issue`,{method:"POST"}),validate:t=>g(`/api/invoices/${t}/validate`,{method:"POST"}),pdfUrl:t=>`/api/invoices/${t}.pdf`,xmlUrl:t=>`/api/invoices/${t}.xml`,xlsxUrl:t=>`/api/invoices/${t}.xlsx`,exportUrl:(t={})=>{const e=new URLSearchParams(t).toString();return`/api/invoices/export.xlsx${e?`?${e}`:""}`}};function i(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function $(t){return`${Number(t).toFixed(2)} EUR`}function S(t){return t.split("/").pop()??t}async function P(t){t.innerHTML='<div class="card">Lade Backups…</div>';let e=[],a="",d=!1;async function r(){const c=await fetch("/api/backups");if(!c.ok)throw new Error("Backups konnten nicht geladen werden");e=await c.json(),u()}function u(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${d?"error":""}">${i(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${e.map(c=>`<div class="row" style="margin-top:8px">
				<strong>${i(S(c.filename))}</strong>
				<span class="muted">${i(c.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(c.size/1024)} KB</span>
				<a class="btn secondary" href="/api/backups/file/${i(S(c.filename))}">Download</a>
				<button class="secondary" data-restore="${i(c.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,t.querySelector("#b-now")?.addEventListener("click",async()=>{try{const c=await fetch("/api/backups",{method:"POST"});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const f=await c.json();a=`Gesichert: ${S(f.filename)}`,d=!1,await r()}catch(c){a=c.message,d=!0,u()}}),t.querySelectorAll("[data-restore]").forEach(c=>c.addEventListener("click",async()=>{const f=c.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${S(f)}? Die aktuelle Datenbank wird ersetzt.`))try{const h=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:f})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const n=await h.json();a=`Wiederhergestellt: ${n.invoices} Rechnungen, ${n.templates} Vorlagen${n.fileErrors.length>0?` (${n.fileErrors.length} Dateifehler)`:""}`,d=!1,u()}catch(h){a=h.message,d=!0,u()}})),t.querySelector("#b-upload")?.addEventListener("click",async()=>{const c=t.querySelector("#b-file")?.files?.[0];if(!c){a="Bitte zuerst eine ZIP-Datei wählen",d=!0,u();return}if(window.confirm(`Wirklich wiederherstellen aus ${c.name}? Die aktuelle Datenbank wird ersetzt.`))try{const f=await new Promise((s,l)=>{const o=new FileReader;o.onload=()=>s(String(o.result).split(",")[1]),o.onerror=()=>l(new Error("Datei nicht lesbar")),o.readAsDataURL(c)}),h=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:f})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const n=await h.json();a=`Wiederhergestellt: ${n.invoices} Rechnungen, ${n.templates} Vorlagen`,d=!1,await r()}catch(f){a=f.message,d=!0,u()}})}try{await r()}catch(c){t.innerHTML=`<div class="card error">${i(c.message)}</div>`}}function A(t){return`<span class="badge ${t}">${t}</span>`}async function j(t){t.innerHTML=`
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
		<div id="list"></div>`;const e=t.querySelector("#f-status"),a=t.querySelector("#f-q"),d=t.querySelector("#list");async function r(){const c={};e.value&&(c.status=e.value),a.value.trim()&&(c.q=a.value.trim());try{const f=await v.list(c);d.innerHTML=f.map(h=>`<div class="card"><div class="row">
					<strong>${i(h.number??"(Entwurf)")}</strong>${A(h.status)}
					<span>${i(h.buyer.name||"—")}</span>
					<span>${$(h.totals.grossTotal)}</span>
					<a href="#/invoices/${i(h.id)}">Ansehen</a>
					${h.pdfPath?`<a href="${v.pdfUrl(h.id)}" download="${i(h.number??"rechnung")}.pdf">PDF ↓</a>`:""}
					${h.xml?`<a href="${v.xmlUrl(h.id)}" download="${i(h.number??"rechnung")}.xml">XML ↓</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>'}catch(f){d.innerHTML=`<div class="card error">${i(f.message)}</div>`}}e.onchange=()=>{u(),r()},a.oninput=()=>{u(),r()};function u(){const c={};e.value&&(c.status=e.value),a.value.trim()&&(c.q=a.value.trim()),t.querySelector("#f-export").href=v.exportUrl(c)}u(),await r()}async function M(t,e){t.innerHTML='<div class="card">Lade…</div>';try{const a=await v.get(e);t.innerHTML=`
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
			${a.lines.map((r,u)=>`<tr><td>${u+1}</td><td>${i(r.description)}</td><td>${r.quantity} ${i(r.unit)}</td><td>${r.vatRate} %</td><td>${$(r.quantity*r.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${$(a.totals.grossTotal)}</strong> <span class="muted">(netto ${$(a.totals.netTotal)} + USt ${$(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${i(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?`<a class="btn secondary" href="${v.pdfUrl(a.id)}" target="_blank" rel="noopener">PDF ansehen</a>`:""}
				${a.pdfPath?`<a class="btn secondary" href="${v.pdfUrl(a.id)}" download="${i(a.number??"rechnung")}.pdf">PDF ↓</a>`:""}
				${a.xml?`<a class="btn secondary" href="${v.xmlUrl(a.id)}" download="${i(a.number??"rechnung")}.xml">XML ↓</a>`:""}
				${a.xlsxPath?`<a class="btn secondary" href="${v.xlsxUrl(a.id)}" download="${i(a.number??"rechnung")}.xlsx">Excel ↓</a>`:""}
			</div><div id="d-out"></div></div>`;const d=t.querySelector("#d-out");t.querySelector("#d-validate")?.addEventListener("click",async()=>{d.innerHTML='<p class="muted">Validiere…</p>';try{const r=await v.validate(a.id);d.innerHTML=r.formatErrors.length+r.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...r.formatErrors,...r.businessErrors].map(u=>`<li class="error">${i(u)}</li>`).join("")}</ul>`}catch(r){d.innerHTML=`<p class="error">${i(r.message)}</p>`}}),t.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const r=await v.issue(a.id);location.hash=`#/invoices/${r.id}`,location.reload()}catch(r){d.innerHTML=`<p class="error">${i(r.message)}</p>`}})}catch(a){t.innerHTML=`<div class="card error">${i(a.message)}</div>`}}async function O(t){try{const e=await v.health();t.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${i(e.version)} · Schema: ${i(String(e.schemaVersion))}</p>
			<pre class="dump">${i(JSON.stringify(e.counts,null,2))}</pre></div>`}catch(e){t.innerHTML=`<div class="card error">API nicht erreichbar: ${i(e.message)}</div>`}}const R=["title","meta","parties","positions","totals"],L=["payment","notes"];async function H(t){t.innerHTML='<div class="card">Lade Vorlagen…</div>';let e=[],a=null,d="";async function r(){e=await u(),f()}async function u(){const n=await fetch("/api/templates");if(!n.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await n.json()}function c(n){const s=n.definition,l=(o,p,m)=>`<label><input type="checkbox" data-f="blocks.${o}" ${s.blocks[o]?"checked":""} ${m?"disabled":""} style="width:auto" /> ${p}${m?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${i(n.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${i(s.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${i(s.colors.text)}" /></label>
		</div>
		${R.map(o=>l(o,`Block ${o}`,!0)).join("")}
		${L.map(o=>l(o,`Block ${o}`,!1)).join("")}
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
				${["right","left","center"].map(o=>`<option ${s.logo?.position===o?"selected":""}>${o}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${s.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${s.logo?`<p class="muted">Aktuell: ${i(s.logo.path)}</p>`:""}`}function f(){t.innerHTML=`
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
		${a?`<div class="card"><h3>${i(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${c(a)}
			${d?`<p class="error">${i(d)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#t-new")?.addEventListener("click",async()=>{const l=(await(await fetch("/api/templates")).json())[0];if(!l){d="Keine Basisvorlage vorhanden",f();return}a={...structuredClone(l),id:"neu",name:"Neu",version:1,isDefault:!1},d="",f()}),t.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{const s=e.find(l=>l.id===n.dataset.edit);s&&(a=structuredClone(s),d="",f())})),t.querySelectorAll("[data-prev]").forEach(n=>n.addEventListener("click",async()=>{const s=e.find(p=>p.id===n.dataset.prev);if(!s)return;const l=await fetch("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!l.ok){d="Vorschau fehlgeschlagen",f();return}const o=await l.blob();window.open(URL.createObjectURL(o),"_blank")})),t.querySelectorAll("[data-def]").forEach(n=>n.addEventListener("click",async()=>{await fetch(`/api/templates/${n.dataset.def}/default`,{method:"POST"}),a=null,await r()})),t.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{const s=await fetch(`/api/templates/${n.dataset.del}`,{method:"DELETE"});if(!s.ok){d=(await s.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",f();return}await r()})),t.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,d="",f()}),t.querySelector("#t-save")?.addEventListener("click",()=>{h()})}async function h(){if(!a)return;const n=structuredClone(a.definition);n.name=(t.querySelector("#t-name")?.value??n.name).trim(),n.colors.primary=t.querySelector("#t-c1")?.value??n.colors.primary,n.colors.text=t.querySelector("#t-c2")?.value??n.colors.text;for(const s of L)n.blocks[s]=t.querySelector(`[data-f="blocks.${s}"]`)?.checked??n.blocks[s];for(const s of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])n[s]=t.querySelector(`[data-f="${s}"]`)?.checked??!1;n.footerText=t.querySelector("#t-footer")?.value??"",n.introText=t.querySelector("#t-intro")?.value??"",n.closingText=t.querySelector("#t-closing")?.value??"",n.signatureName=t.querySelector("#t-sign")?.value??"",n.headerExtra=t.querySelector("#t-hextra")?.value??"",n.logo&&(n.logo.position=t.querySelector("#t-lpos")?.value??"right",n.logo.widthMm=Number(t.querySelector("#t-lw")?.value??30));try{let s=a.id;if(s==="neu"){const o=await fetch("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:n.name,definition:n})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");s=(await o.json()).id}else{const o=await fetch(`/api/templates/${s}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:n.name,definition:n})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const l=t.querySelector("#t-logo")?.files?.[0];if(l){const o=await new Promise((m,y)=>{const b=new FileReader;b.onload=()=>m(String(b.result).split(",")[1]),b.onerror=()=>y(new Error("Datei nicht lesbar")),b.readAsDataURL(l)}),p=await fetch(`/api/templates/${s}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:l.name,mime:l.type,dataBase64:o})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,d="",await r()}catch(s){d=s.message,f()}}try{await r()}catch(n){t.innerHTML=`<div class="card error">${i(n.message)}</div>`}}const T=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),k=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),w="einv-wizard-v1";function q(){return new Date().toISOString().slice(0,10)}function E(){return{step:0,seller:T(),buyer:T(),lines:[k()],issueDate:q(),deliveryDate:q(),dueDate:"",documentTitle:"Rechnung",notes:"",draftId:null,error:"",savedAt:new Date().toISOString()}}function x(t){return t.seller.name.trim()!==""||t.buyer.name.trim()!==""||t.lines.some(e=>e.description.trim()!==""||e.unitPriceNet!==0)}function U(){try{const t=localStorage.getItem(w);if(!t)return null;const e=JSON.parse(t);return!e||!Array.isArray(e.lines)||!e.seller||!e.buyer?null:{...E(),...e,error:"",step:Math.min(Number(e.step)||0,3)}}catch{return null}}function N(t,e,a){return`
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
		<label>IBAN<input data-p="${t}" data-f="iban" value="${i(e.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${t}" data-f="customerNumber" value="${i(e.customerNumber)}" /></label>`}`}const B=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function z(t){let e=E();const a=U();if(a&&x(a)&&!a.draftId){t.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${i(a.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,t.querySelector("#w-resume")?.addEventListener("click",()=>{e=a,c()}),t.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(w),c()});return}a&&x(a)&&(e=a);function d(){try{localStorage.setItem(w,JSON.stringify({...e,error:"",savedAt:new Date().toISOString()}))}catch{}}function r(){t.querySelectorAll("input[data-p]").forEach(s=>{const l=s.dataset.p==="seller"?e.seller:e.buyer;l[s.dataset.f]=s.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(s=>{const[l,o]=s.dataset.l.split("."),p=e.lines[Number(l)];p&&(o==="quantity"||o==="unitPriceNet"||o==="vatRate"?p[o]=Number(s.value):p[o]=s.value)});const n=s=>t.querySelector(`#${s}`)?.value??"";e.issueDate=n("w-issue")||e.issueDate,e.deliveryDate=n("w-delivery")||e.deliveryDate,e.dueDate=n("w-due"),e.documentTitle=n("w-title")||"Rechnung",e.notes=t.querySelector("#w-notes")?.value??"",d()}function u(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((s,l)=>`<span class="${l===e.step?"on":""}">${l+1}. ${s}</span>`).join("")}</div>`}function c(){r();let n="";if(e.step===0&&(n=`<div class="card"><h3>Verkäufer</h3>${N("seller",e.seller,!0)}</div>`),e.step===1&&(n=`<div class="card"><h3>Käufer</h3>${N("buyer",e.buyer,!1)}</div>`),e.step===2&&(n=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${B.map(s=>`<option ${s===e.documentTitle?"selected":""}>${s}</option>`).join("")}
				</select></label>
				${e.lines.map((s,l)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${l}.description" value="${i(s.description)}" /></label>
						<label>Art.Nr.<input data-l="${l}.sku" value="${i(s.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${l}.details" rows="1">${i(s.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${l}.quantity" type="number" min="0" step="any" value="${s.quantity}" /></label>
						<label>Einheit<input data-l="${l}.unit" value="${i(s.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${l}.unitPriceNet" type="number" min="0" step="0.01" value="${s.unitPriceNet}" /></label>
						<label>USt %<select data-l="${l}.vatRate">
							${[19,7,0].map(o=>`<option ${o===s.vatRate?"selected":""}>${o}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${l}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${i(e.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${i(e.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${i(e.dueDate)}" /></label>
				<label>Notizen<textarea id="w-notes">${i(e.notes)}</textarea></label>
			</div>`),e.step===3){const s=e.lines.reduce((o,p)=>o+p.quantity*p.unitPriceNet,0),l=e.lines.reduce((o,p)=>o+p.quantity*p.unitPriceNet*p.vatRate/100,0);n=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${i(e.documentTitle)}</strong> · ${i(e.seller.name||"—")} → ${i(e.buyer.name||"—")} · ${e.lines.length} Positionen</p>
				<p><strong>ca. ${$(Math.round((s+l)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}t.innerHTML=`${u()}${n}
			${e.error?`<div class="card error">${i(e.error)}</div>`:""}
			<div class="row">
				${e.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${e.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,t.querySelector("#w-back")?.addEventListener("click",()=>{e.step--,c()}),t.querySelector("#w-next")?.addEventListener("click",()=>{e.step++,c()}),t.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(w),e=E(),c())}),t.querySelector("#w-add")?.addEventListener("click",()=>{r(),e.lines.push(k()),c()}),t.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",()=>{r(),e.lines.splice(Number(s.dataset.del),1),e.lines.length===0&&e.lines.push(k()),c()})),t.querySelector("#w-save")?.addEventListener("click",()=>{f(!1)}),t.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&f(!0)})}async function f(n){r(),e.error="";const s={seller:e.seller,buyer:e.buyer,lines:e.lines,issueDate:e.issueDate,deliveryDate:e.deliveryDate,dueDate:e.dueDate||void 0,currency:"EUR",documentTitle:e.documentTitle,notes:e.notes||void 0};try{let l;e.draftId?l=await v.update(e.draftId,s):(l=await v.create(s),e.draftId=l.id,d()),n&&(l=await v.issue(l.id),localStorage.removeItem(w)),location.hash=`#/invoices/${l.id}`}catch(l){e.error=l.message,c()}}t.addEventListener("input",()=>{try{h()}catch{}});function h(){t.querySelectorAll("input[data-p]").forEach(p=>{const m=p.dataset.p==="seller"?e.seller:e.buyer;m[p.dataset.f]=p.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(p=>{const[m,y]=p.dataset.l.split("."),b=e.lines[Number(m)];b&&(y==="quantity"||y==="unitPriceNet"||y==="vatRate"?b[y]=Number(p.value):b[y]=p.value)});const n=p=>t.querySelector(`#${p}`)?.value??"",s=n("w-issue"),l=n("w-delivery");s&&(e.issueDate=s),l&&(e.deliveryDate=l),e.dueDate=n("w-due");const o=n("w-title");o&&(e.documentTitle=o),e.notes=t.querySelector("#w-notes")?.value??e.notes,d()}c()}const I=document.querySelector("#app");function V(t){const e=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/backup","Backup"],["#/status","Status"]];I.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${e.map(([a,d])=>`<a href="${a}" class="${t===a||a==="#/"&&t.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function D(){const t=location.hash||"#/";V(t);const e=document.querySelector("#view");t==="#/"||t==="#"?await j(e):t==="#/new"?z(e):t.startsWith("#/invoices/")?await M(e,decodeURIComponent(t.slice(11))):t==="#/templates"?await H(e):t==="#/backup"?await P(e):t==="#/status"?await O(e):e.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{D()});D();
