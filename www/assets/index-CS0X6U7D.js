(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))d(i);new MutationObserver(i=>{for(const u of i)if(u.type==="childList")for(const r of u.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&d(r)}).observe(document,{childList:!0,subtree:!0});function a(i){const u={};return i.integrity&&(u.integrity=i.integrity),i.referrerPolicy&&(u.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?u.credentials="include":i.crossOrigin==="anonymous"?u.credentials="omit":u.credentials="same-origin",u}function d(i){if(i.ep)return;i.ep=!0;const u=a(i);fetch(i.href,u)}})();async function v(e,t){const a=await fetch(e,{headers:{"content-type":"application/json"},...t});if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`HTTP ${a.status}`)}return await a.json()}const f={health:()=>v("/api/health"),list:(e={})=>{const t=new URLSearchParams(e).toString();return v(`/api/invoices${t?`?${t}`:""}`)},get:e=>v(`/api/invoices/${e}`),create:e=>v("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,t)=>v(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(t)}),issue:e=>v(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>v(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,exportUrl:(e={})=>{const t=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${t?`?${t}`:""}`}};function s(e){return String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]??t)}function y(e){return`${Number(e).toFixed(2)} EUR`}function g(e){return e.split("/").pop()??e}async function P(e){e.innerHTML='<div class="card">Lade Backups…</div>';let t=[],a="",d=!1;async function i(){const r=await fetch("/api/backups");if(!r.ok)throw new Error("Backups konnten nicht geladen werden");t=await r.json(),u()}function u(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${d?"error":""}">${s(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${t.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${s(g(r.filename))}</strong>
				<span class="muted">${s(r.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(r.size/1024)} KB</span>
				<a class="btn secondary" href="/api/backups/file/${s(g(r.filename))}">Download</a>
				<button class="secondary" data-restore="${s(r.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const r=await fetch("/api/backups",{method:"POST"});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const c=await r.json();a=`Gesichert: ${g(c.filename)}`,d=!1,await i()}catch(r){a=r.message,d=!0,u()}}),e.querySelectorAll("[data-restore]").forEach(r=>r.addEventListener("click",async()=>{const c=r.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${g(c)}? Die aktuelle Datenbank wird ersetzt.`))try{const o=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:c})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const n=await o.json();a=`Wiederhergestellt: ${n.invoices} Rechnungen, ${n.templates} Vorlagen${n.fileErrors.length>0?` (${n.fileErrors.length} Dateifehler)`:""}`,d=!1,u()}catch(o){a=o.message,d=!0,u()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const r=e.querySelector("#b-file")?.files?.[0];if(!r){a="Bitte zuerst eine ZIP-Datei wählen",d=!0,u();return}if(window.confirm(`Wirklich wiederherstellen aus ${r.name}? Die aktuelle Datenbank wird ersetzt.`))try{const c=await new Promise((l,h)=>{const p=new FileReader;p.onload=()=>l(String(p.result).split(",")[1]),p.onerror=()=>h(new Error("Datei nicht lesbar")),p.readAsDataURL(r)}),o=await fetch("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:c})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const n=await o.json();a=`Wiederhergestellt: ${n.invoices} Rechnungen, ${n.templates} Vorlagen`,d=!1,await i()}catch(c){a=c.message,d=!0,u()}})}try{await i()}catch(r){e.innerHTML=`<div class="card error">${s(r.message)}</div>`}}function T(e){return`<span class="badge ${e}">${e}</span>`}async function N(e){e.innerHTML=`
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
		<div id="list"></div>`;const t=e.querySelector("#f-status"),a=e.querySelector("#f-q"),d=e.querySelector("#list");async function i(){const r={};t.value&&(r.status=t.value),a.value.trim()&&(r.q=a.value.trim());try{const c=await f.list(r);d.innerHTML=c.map(o=>`<div class="card"><div class="row">
					<strong>${s(o.number??"(Entwurf)")}</strong>${T(o.status)}
					<span>${s(o.buyer.name||"—")}</span>
					<span>${y(o.totals.grossTotal)}</span>
					<a href="#/invoices/${s(o.id)}">Ansehen</a>
					${o.pdfPath?`<a href="${f.pdfUrl(o.id)}" target="_blank">PDF</a>`:""}
					${o.xml?`<a href="${f.xmlUrl(o.id)}" target="_blank">XML</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>'}catch(c){d.innerHTML=`<div class="card error">${s(c.message)}</div>`}}t.onchange=()=>{u(),i()},a.oninput=()=>{u(),i()};function u(){const r={};t.value&&(r.status=t.value),a.value.trim()&&(r.q=a.value.trim()),e.querySelector("#f-export").href=f.exportUrl(r)}u(),await i()}async function x(e,t){e.innerHTML='<div class="card">Lade…</div>';try{const a=await f.get(t);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${s(a.number??"(Entwurf)")}</strong>
				<span class="badge ${a.status}">${a.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${s(a.seller.name)}<br />${s(a.seller.street)}<br />${s(a.seller.zip)} ${s(a.seller.city)}</div>
				<div><strong>Käufer</strong><br />${s(a.buyer.name)}<br />${s(a.buyer.street)}<br />${s(a.buyer.zip)} ${s(a.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${s(a.issueDate)} · Leistung: ${s(a.deliveryDate)}${a.dueDate?` · Fällig: ${s(a.dueDate)}`:""}</p>
			<table class="lines"><tr><th>#</th><th>Beschreibung</th><th>Menge</th><th>USt</th><th>Netto</th></tr>
			${a.lines.map((i,u)=>`<tr><td>${u+1}</td><td>${s(i.description)}</td><td>${i.quantity} ${s(i.unit)}</td><td>${i.vatRate} %</td><td>${y(i.quantity*i.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${y(a.totals.grossTotal)}</strong> <span class="muted">(netto ${y(a.totals.netTotal)} + USt ${y(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${s(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?`<a class="btn secondary" href="${f.pdfUrl(a.id)}" target="_blank">PDF</a>`:""}
				${a.xml?`<a class="btn secondary" href="${f.xmlUrl(a.id)}" target="_blank">XML</a>`:""}
				${a.xlsxPath?`<a class="btn secondary" href="${f.xlsxUrl(a.id)}" target="_blank">Excel</a>`:""}
			</div><div id="d-out"></div></div>`;const d=e.querySelector("#d-out");e.querySelector("#d-validate")?.addEventListener("click",async()=>{d.innerHTML='<p class="muted">Validiere…</p>';try{const i=await f.validate(a.id);d.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(u=>`<li class="error">${s(u)}</li>`).join("")}</ul>`}catch(i){d.innerHTML=`<p class="error">${s(i.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{try{const i=await f.issue(a.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){d.innerHTML=`<p class="error">${s(i.message)}</p>`}})}catch(a){e.innerHTML=`<div class="card error">${s(a.message)}</div>`}}async function D(e){try{const t=await f.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(t.version)} · Schema: ${s(String(t.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(t.counts,null,2))}</pre></div>`}catch(t){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(t.message)}</div>`}}const j=["title","meta","parties","positions","totals"],w=["payment","notes"];async function M(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let t=[],a=null,d="";async function i(){t=await u(),c()}async function u(){const n=await fetch("/api/templates");if(!n.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await n.json()}function r(n){const l=n.definition,h=(p,m,b)=>`<label><input type="checkbox" data-f="blocks.${p}" ${l.blocks[p]?"checked":""} ${b?"disabled":""} style="width:auto" /> ${m}${b?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(n.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${s(l.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${s(l.colors.text)}" /></label>
		</div>
		${j.map(p=>h(p,`Block ${p}`,!0)).join("")}
		${w.map(p=>h(p,`Block ${p}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${l.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${l.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${l.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${l.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label>Fußzeile<textarea id="t-footer">${s(l.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(p=>`<option ${l.logo?.position===p?"selected":""}>${p}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${l.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${l.logo?`<p class="muted">Aktuell: ${s(l.logo.path)}</p>`:""}`}function c(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${t.map(n=>`<div class="row" style="margin-top:8px">
				<strong>${s(n.name)}</strong><span class="muted">v${n.version}</span>
				${n.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${n.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${n.id}">Vorschau</button>
				${n.isDefault?"":`<button class="secondary" data-def="${n.id}">Standard</button>`}
				${n.isDefault?"":`<button class="danger" data-del="${n.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${a?`<div class="card"><h3>${s(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${r(a)}
			${d?`<p class="error">${s(d)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{const h=(await(await fetch("/api/templates")).json())[0];if(!h){d="Keine Basisvorlage vorhanden",c();return}a={...structuredClone(h),id:"neu",name:"Neu",version:1,isDefault:!1},d="",c()}),e.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{const l=t.find(h=>h.id===n.dataset.edit);l&&(a=structuredClone(l),d="",c())})),e.querySelectorAll("[data-prev]").forEach(n=>n.addEventListener("click",async()=>{const l=t.find(m=>m.id===n.dataset.prev);if(!l)return;const h=await fetch("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:l.definition})});if(!h.ok){d="Vorschau fehlgeschlagen",c();return}const p=await h.blob();window.open(URL.createObjectURL(p),"_blank")})),e.querySelectorAll("[data-def]").forEach(n=>n.addEventListener("click",async()=>{await fetch(`/api/templates/${n.dataset.def}/default`,{method:"POST"}),a=null,await i()})),e.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{const l=await fetch(`/api/templates/${n.dataset.del}`,{method:"DELETE"});if(!l.ok){d=(await l.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",c();return}await i()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,d="",c()}),e.querySelector("#t-save")?.addEventListener("click",()=>{o()})}async function o(){if(!a)return;const n=structuredClone(a.definition);n.name=(e.querySelector("#t-name")?.value??n.name).trim(),n.colors.primary=e.querySelector("#t-c1")?.value??n.colors.primary,n.colors.text=e.querySelector("#t-c2")?.value??n.colors.text;for(const l of w)n.blocks[l]=e.querySelector(`[data-f="blocks.${l}"]`)?.checked??n.blocks[l];for(const l of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers"])n[l]=e.querySelector(`[data-f="${l}"]`)?.checked??!1;n.footerText=e.querySelector("#t-footer")?.value??"",n.logo&&(n.logo.position=e.querySelector("#t-lpos")?.value??"right",n.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30));try{let l=a.id;if(l==="neu"){const p=await fetch("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:n.name,definition:n})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");l=(await p.json()).id}else{const p=await fetch(`/api/templates/${l}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:n.name,definition:n})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const h=e.querySelector("#t-logo")?.files?.[0];if(h){const p=await new Promise((b,q)=>{const $=new FileReader;$.onload=()=>b(String($.result).split(",")[1]),$.onerror=()=>q(new Error("Datei nicht lesbar")),$.readAsDataURL(h)}),m=await fetch(`/api/templates/${l}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:h.name,mime:h.type,dataBase64:p})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,d="",await i()}catch(l){d=l.message,c()}}try{await i()}catch(n){e.innerHTML=`<div class="card error">${s(n.message)}</div>`}}const S=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function k(){return new Date().toISOString().slice(0,10)}function L(e,t,a){return`
		<label>Name<input data-p="${e}" data-f="name" value="${s(t.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${s(t.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${s(t.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${s(t.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${s(t.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${s(t.email)}" /></label>
		</div>
		${a?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${s(t.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${s(t.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(t.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${s(t.customerNumber)}" /></label>`}`}function R(e){const t={step:0,seller:S(),buyer:S(),lines:[{description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}],issueDate:k(),deliveryDate:k(),dueDate:"",documentTitle:"Rechnung",notes:"",draftId:null,error:""};function a(){e.querySelectorAll("input[data-p]").forEach(c=>{const o=c.dataset.p==="seller"?t.seller:t.buyer;o[c.dataset.f]=c.value}),e.querySelectorAll("input[data-l],select[data-l]").forEach(c=>{const[o,n]=c.dataset.l.split("."),l=t.lines[Number(o)];n==="quantity"||n==="unitPriceNet"||n==="vatRate"?l[n]=Number(c.value):l[n]=c.value});const r=c=>e.querySelector(`#${c}`)?.value??"";t.issueDate=r("w-issue")||t.issueDate,t.deliveryDate=r("w-delivery")||t.deliveryDate,t.dueDate=r("w-due"),t.documentTitle=r("w-title")||"Rechnung",t.notes=e.querySelector("#w-notes")?.value??""}function d(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((c,o)=>`<span class="${o===t.step?"on":""}">${o+1}. ${c}</span>`).join("")}</div>`}function i(){a();let r="";if(t.step===0&&(r=`<div class="card"><h3>Verkäufer</h3>${L("seller",t.seller,!0)}</div>`),t.step===1&&(r=`<div class="card"><h3>Käufer</h3>${L("buyer",t.buyer,!1)}</div>`),t.step===2&&(r=`<div class="card"><h3>Positionen</h3>
				<table class="lines"><tr><th>Beschreibung</th><th>Menge</th><th>Einheit</th><th>Preis netto</th><th>USt %</th><th></th></tr>
				${t.lines.map((c,o)=>`<tr>
					<td><input data-l="${o}.description" value="${s(c.description)}" /></td>
					<td><input data-l="${o}.quantity" type="number" min="0" step="any" value="${c.quantity}" style="width:70px" /></td>
					<td><input data-l="${o}.unit" value="${s(c.unit)}" style="width:60px" /></td>
					<td><input data-l="${o}.unitPriceNet" type="number" min="0" step="0.01" value="${c.unitPriceNet}" style="width:90px" /></td>
					<td><select data-l="${o}.vatRate">
						${[19,7,0].map(n=>`<option ${n===c.vatRate?"selected":""}>${n}</option>`).join("")}
					</select></td>
					<td><button class="secondary" data-del="${o}">✕</button></td>
				</tr>`).join("")}</table>
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${s(t.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${s(t.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${s(t.dueDate)}" /></label>
				<label>Notizen<textarea id="w-notes">${s(t.notes)}</textarea></label>
			</div>`),t.step===3){const c=t.lines.reduce((n,l)=>n+l.quantity*l.unitPriceNet,0),o=t.lines.reduce((n,l)=>n+l.quantity*l.unitPriceNet*l.vatRate/100,0);r=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p>${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${t.lines.length} Positionen</p>
				<p><strong>ca. ${y(Math.round((c+o)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<div id="w-result"></div>
			</div>`}e.innerHTML=`${d()}${r}
			${t.error?`<div class="card error">${s(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,i()}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,i()}),e.querySelector("#w-add")?.addEventListener("click",()=>{a(),t.lines.push({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),i()}),e.querySelectorAll("[data-del]").forEach(c=>c.addEventListener("click",()=>{a(),t.lines.splice(Number(c.dataset.del),1),t.lines.length===0&&t.lines.push({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),i()})),e.querySelector("#w-save")?.addEventListener("click",()=>{u(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{u(!0)})}async function u(r){a(),t.error="";const c={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",documentTitle:t.documentTitle,notes:t.notes||void 0};try{let o;t.draftId?o=await f.update(t.draftId,c):(o=await f.create(c),t.draftId=o.id),r&&(o=await f.issue(o.id)),location.hash=`#/invoices/${o.id}`}catch(o){t.error=o.message,i()}}i()}const A=document.querySelector("#app");function H(e){const t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/backup","Backup"],["#/status","Status"]];A.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([a,d])=>`<a href="${a}" class="${e===a||a==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function E(){const e=location.hash||"#/";H(e);const t=document.querySelector("#view");e==="#/"||e==="#"?await N(t):e==="#/new"?R(t):e.startsWith("#/invoices/")?await x(t,decodeURIComponent(e.slice(11))):e==="#/templates"?await M(t):e==="#/backup"?await P(t):e==="#/status"?await D(t):t.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{E()});E();
