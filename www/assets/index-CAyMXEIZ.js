(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const u of document.querySelectorAll('link[rel="modulepreload"]'))a(u);new MutationObserver(u=>{for(const o of u)if(o.type==="childList")for(const h of o.addedNodes)h.tagName==="LINK"&&h.rel==="modulepreload"&&a(h)}).observe(document,{childList:!0,subtree:!0});function t(u){const o={};return u.integrity&&(o.integrity=u.integrity),u.referrerPolicy&&(o.referrerPolicy=u.referrerPolicy),u.crossOrigin==="use-credentials"?o.credentials="include":u.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(u){if(u.ep)return;u.ep=!0;const o=t(u);fetch(u.href,o)}})();const V="einv-token";function G(){try{return localStorage.getItem(V)}catch{return null}}function J(e){try{e?localStorage.setItem(V,e):localStorage.removeItem(V)}catch{}}async function E(e,n){const t=await D(e,{headers:{"content-type":"application/json"},...n});if(!t.ok){const a=await t.json().catch(()=>({}));throw new Error(a.error??`HTTP ${t.status}`)}return await t.json()}async function D(e,n){const t={...n?.headers??{}},a=G();a&&(t.authorization=`Bearer ${a}`);const u=await fetch(e,{...n,headers:t});if(u.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return u}async function H(e,n){const t=await D(e);if(!t.ok){const h=await t.json().catch(()=>({}));throw new Error(h.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const a=await t.blob(),u=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(a),o.download=u?.[1]??n,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function fe(e){const n=await D(e);if(!n.ok){const u=await n.json().catch(()=>({}));throw new Error(u.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const t=await n.blob(),a=URL.createObjectURL(t);window.open(a,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(a),6e4)}const $={health:()=>E("/api/health"),settings:()=>E("/api/settings"),list:(e={})=>{const n=new URLSearchParams(e).toString();return E(`/api/invoices${n?`?${n}`:""}`)},get:e=>E(`/api/invoices/${e}`),create:e=>E("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>E(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>E(`/api/invoices/${e}/issue`,{method:"POST"}),issueBatch:e=>E("/api/invoices/issue-batch",{method:"POST",body:JSON.stringify({ids:e})}),deleteDraft:e=>E(`/api/invoices/${e}`,{method:"DELETE"}),markSent:(e,n)=>E(`/api/invoices/${e}/sent`,{method:"POST",body:JSON.stringify({channel:n})}),paymentCheck:(e,n)=>E(`/api/invoices/${e}/payment-check`,{method:"POST",body:JSON.stringify({outcome:n})}),reminders:()=>E("/api/reminders"),reminded:e=>E(`/api/invoices/${e}/reminded`,{method:"POST"}),invoiceTemplates:{list:()=>E("/api/invoice-templates"),create:(e,n)=>E("/api/invoice-templates",{method:"POST",body:JSON.stringify({name:e,body:n})}),update:(e,n)=>E(`/api/invoice-templates/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>E(`/api/invoice-templates/${e}`,{method:"DELETE"})},setPaid:(e,n,t)=>E(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:t})}),storno:(e,n)=>E(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>E(`/api/invoices/${e}/validate`,{method:"POST"}),asTemplate:(e,n)=>E(`/api/invoices/${e}/as-template`,{method:"POST",body:JSON.stringify({name:n})}),rerender:(e,n)=>E(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:n})}),renders:e=>E(`/api/invoices/${e}/renders`),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>E("/api/company-profiles"),getDefault:()=>E("/api/company-profiles/default"),create:(e,n)=>E("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>E(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:e=>E(`/api/customers${e?`?q=${encodeURIComponent(e)}`:""}`),create:(e,n)=>E("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>E(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>E(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>E("/api/customers/number-assign",{method:"POST"})},products:{list:()=>E("/api/products"),create:e=>E("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>E(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>E(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${n?`?${n}`:""}`},csvUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.csv${n?`?${n}`:""}`},datevUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.datev${n?`?${n}`:""}`},restorePreview:(e,n)=>E("/api/restore/preview",{method:"POST",body:JSON.stringify({filename:e,dataBase64:n})})};function s(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function N(e){return`${Number(e).toFixed(2)} EUR`}function U(e){return e.split("/").pop()??e}async function _(e){let n;try{n=await $.restorePreview(e.filename,e.dataBase64)}catch(a){return alert(`Backup kann nicht gelesen werden: ${a.message}`),!1}const t=n.overwritten.length;return window.confirm([`Vorschau für ${e.filename?U(e.filename):"der hochgeladenen Datei"}:`,"",`  Im Backup:   ${n.invoices} Rechnungen (davon ${n.issued} ausgestellt)`,`  Aktuell:     ${n.currentInvoices} Rechnungen`,`  Dateien:     ${n.filesWritten}`,`  Neu dazu:    ${n.added.length} Nummern`,`  Überschrieben: ${t} Nummern ${t?`(${n.overwritten.slice(0,5).join(", ")}${n.overwritten.length>5?" …":""})`:""}`,"",t>0?"ACHTUNG: Rechnungen, die nur hier existieren, gehen unwiederbringlich verloren.":"Die aktuelle Datenbank wird durch das Backup ersetzt.","","Trotzdem wiederherstellen?"].join(`
`))}async function be(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],t="",a=!1;async function u(){const h=await D("/api/backups");if(!h.ok)throw new Error("Backups konnten nicht geladen werden");n=await h.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(h=>`<div class="row" style="margin-top:8px">
				<strong>${s(U(h.filename))}</strong>
				<span class="muted">${s(h.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(h.size/1024)} KB</span>
				<button class="secondary" data-dl="${s(h.filename)}">Download</button>
				<button class="secondary" data-restore="${s(h.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const h=await D("/api/backups",{method:"POST"});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const g=await h.json();t=`Gesichert: ${U(g.filename)}`,a=!1,await u()}catch(h){t=h.message,a=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(h=>h.addEventListener("click",async()=>{const g=h.dataset.dl??"";try{await H(`/api/backups/file/${U(g)}`,U(g))}catch(f){t=f.message,a=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(h=>h.addEventListener("click",async()=>{const g=h.dataset.restore??"";if(await _({filename:g}))try{const f=await D("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:g})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const w=await f.json();t=`Wiederhergestellt: ${w.invoices} Rechnungen, ${w.templates} Vorlagen${w.fileErrors.length>0?` (${w.fileErrors.length} Dateifehler)`:""}`,a=!1,await u()}catch(f){t=f.message,a=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const h=e.querySelector("#b-file")?.files?.[0];if(!h){t="Bitte zuerst eine ZIP-Datei wählen",a=!0,o();return}let g;try{g=await new Promise((f,w)=>{const S=new FileReader;S.onload=()=>f(String(S.result).split(",")[1]),S.onerror=()=>w(new Error("Datei nicht lesbar")),S.readAsDataURL(h)})}catch(f){t=f.message,a=!0,o();return}if(await _({dataBase64:g}))try{const f=await D("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:g})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const w=await f.json();t=`Wiederhergestellt: ${w.invoices} Rechnungen, ${w.templates} Vorlagen`,a=!1,await u()}catch(f){t=f.message,a=!0,o()}})}try{await u()}catch(h){e.innerHTML=`<div class="card error">${s(h.message)}</div>`}}const X=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,n,t){const a=e[n],u=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(u)}" /></label>`}async function ye(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,t="",a=!1;try{n=await $.company.getDefault(),n||(n=(await $.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${s(o.message)}</div>`;return}function u(){const o=n?.profile??X();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${s(n?.name??"Meine Firma")}" /></label>
			${x(o,"name","Firmenname")}
			${x(o,"street","Straße")}
			<div class="grid2">${x(o,"zip","PLZ")}${x(o,"city","Ort")}</div>
			<div class="grid2">${x(o,"country","Land")}${x(o,"email","E-Mail")}</div>
			<div class="grid2">${x(o,"phone","Telefon")}${x(o,"website","Webseite")}</div>
			<div class="grid2">${x(o,"vatId","USt-IdNr.")}${x(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${x(o,"bankName","Bankname")}${x(o,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${s(o.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(h=>`<div class="grid2"><label>Box ${h+1}<textarea data-fbox="${h}" rows="3">${s((o.footerBoxes??[])[h]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${h}">
					${["left","center","right"].map(g=>`<option value="${g}" ${(o.footerAlign??[])[h]===g||!(o.footerAlign??[])[h]&&g==="left"?"selected":""}>${g==="left"?"Links":g==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const h={...X()};e.querySelectorAll("input[data-f]").forEach(w=>{h[w.dataset.f]=w.value});const g=[0,1,2,3].map(w=>e.querySelector(`textarea[data-fbox="${w}"]`)?.value??"");g.some(w=>w.trim()!=="")?(h.footerBoxes=g,h.footerAlign=[0,1,2,3].map(w=>{const S=e.querySelector(`select[data-falign="${w}"]`)?.value;return S==="center"||S==="right"?S:"left"})):(delete h.footerBoxes,delete h.footerAlign);const f=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await $.company.update(n.id,{name:f,profile:h}):n=await $.company.create(f,h),t="Gespeichert.",a=!1,u()}catch(w){t=w.message,a=!0,u()}})}u()}const Y=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),ge=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function $e(e,n){const t=Number(e.replace(/\D+/g,"")),a=Number(n.replace(/\D+/g,"")),u=/\d/.test(e)&&Number.isFinite(t),o=/\d/.test(n)&&Number.isFinite(a);return u&&o&&t!==a?t-a:e.localeCompare(n,"de")}function we(e,n){const t=n.endsWith("desc")?-1:1,a=[...e];return a.sort((u,o)=>n.startsWith("number")?$e(u.profile.customerNumber?.trim()??"",o.profile.customerNumber?.trim()??"")*t:u.name.localeCompare(o.name,"de")*t),a}function B(e,n,t){const a=e[n],u=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(u)}" /></label>`}async function ke(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],t=null,a=!1,u="",o=!1,h="name-asc",g="";async function f(){n=await $.customers.list(g||void 0),S()}function w(r,p){return`
		<label>Name (Anzeige)<input id="k-name" value="${s(p)}" /></label>
		${B(r,"name","Firmenname")}
		${B(r,"street","Straße")}
		<div class="grid2">${B(r,"zip","PLZ")}${B(r,"city","Ort")}</div>
		<div class="grid2">${B(r,"country","Land")}${B(r,"email","E-Mail")}</div>
		<div class="grid2">${B(r,"phone","Telefon")}${B(r,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${s(r.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function S(){const r=n.filter(v=>!v.profile.customerNumber?.trim()).length,p=we(n,h);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<input id="k-q" placeholder="Suche (Name, Nummer, Ort)…" value="${s(g)}" style="max-width:240px" />
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${ge.map(v=>`<option value="${v.value}" ${v.value===h?"selected":""}>${v.label}</option>`).join("")}
			</select></label>
			${r>0?`<button class="secondary" id="k-number">${r} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${p.map(v=>`<div class="row" style="margin-top:8px">
				<strong>${s(v.name)}</strong>
				${v.profile.customerNumber?.trim()?`<span class="badge">${s(v.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${s(v.profile.city||"")}</span>
				<button class="secondary" data-edit="${v.id}">Bearbeiten</button>
				<button class="danger" data-del="${v.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${p.length} Kunden</p>
		</div>
		${t||a?`<div class="card"><h3>${a?"Neuer Kunde":s(t?.name??"")}</h3>
			${w(t?.profile??Y(),t?.name??"")}
			${u?`<p class="${o?"error":""}">${s(u)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",v=>{h=v.target.value,S()});let b;e.querySelector("#k-q")?.addEventListener("input",v=>{g=v.target.value,b!==void 0&&clearTimeout(b),b=setTimeout(()=>{f()},250)}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{u=`${await $.customers.assignNumbers()} Kundennummer(n) vergeben.`,o=!1,await f()}catch(v){u=v.message,o=!0,S()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,a=!0,u="",S()}),e.querySelectorAll("[data-edit]").forEach(v=>v.addEventListener("click",()=>{t=n.find(L=>L.id===v.dataset.edit)??null,a=!1,u="",S()})),e.querySelectorAll("[data-del]").forEach(v=>v.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(v.dataset.del??""),await f()}catch(L){u=L.message,o=!0,S()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,a=!1,u="",S()}),e.querySelector("#k-save")?.addEventListener("click",()=>{i()})}async function i(){const r={...Y()};e.querySelectorAll("input[data-f]").forEach(b=>{r[b.dataset.f]=b.value});const p=e.querySelector("#k-name")?.value.trim()||r.name.trim()||"Kunde";try{a?await $.customers.create(p,r):t&&await $.customers.update(t.id,{name:p,profile:r}),t=null,a=!1,u="",await f()}catch(b){u=b.message,o=!0,S()}}try{await f()}catch(r){e.innerHTML=`<div class="card error">${s(r.message)}</div>`}}function Se(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function Te(e){return`<span class="badge ${e}">${e}</span>`}async function Ee(e){e.innerHTML=`
		<div class="card"><div class="row">
			<strong>Rechnungen</strong>
			<select id="f-status">
				<option value="">alle</option>
				<option value="draft">draft</option>
				<option value="issued">issued</option>
				<option value="cancelled">cancelled</option>
			</select>
			<input id="f-q" placeholder="Suche (Nr, Kunde, Position)…" style="max-width:260px" />
			<select id="f-sort" title="Sortierung">
				<option value="date">Datum</option>
				<option value="number">Nummer</option>
				<option value="amount">Betrag</option>
				<option value="customer">Kunde</option>
				<option value="due">Fällig</option>
			</select>
			<button class="btn secondary" id="f-order" title="Umschalten aufsteigend/absteigend">↓ absteigend</button>
			<select id="f-sent" title="Versandstatus">
				<option value="">alle</option>
				<option value="1">versendet</option>
				<option value="0">nicht versendet</option>
			</select>
			<a class="btn" href="#/new">+ Neu</a>
			<button class="btn secondary" id="f-export" title="Excel-Liste">Excel</button>
			<button class="btn secondary" id="f-csv" title="CSV für die Buchhaltung">CSV</button>
			<button class="btn secondary" id="f-datev" title="DATEV-Buchungssätze">DATEV</button>
			<button class="btn secondary" id="f-issue-all" title="Alle sichtbaren Entwürfe ausstellen" hidden>Ausstellen (0)</button>
		</div></div>
		<div id="reminders"></div>
		<div id="list-err"></div>
		<div id="list"></div>`;const n=e.querySelector("#f-status"),t=e.querySelector("#f-q"),a=e.querySelector("#f-sort"),u=e.querySelector("#f-order"),o=e.querySelector("#f-sent"),h=e.querySelector("#reminders");let g="desc",f=[];const w=e.querySelector("#list"),S=e.querySelector("#list-err");let i=0;function r(l){S.innerHTML=`<div class="card error">${s(l.message)}</div>`}async function p(l){const m=l.dataset.paid??"",c=l.checked;l.disabled=!0;try{await $.setPaid(m,c),S.innerHTML=`<div class="card muted">${c?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await b()}catch(y){l.checked=!c,r(y)}finally{l.disabled=!1}}async function b(){const l=++i,m={sort:a.value,order:g};n.value&&(m.status=n.value),t.value.trim()&&(m.q=t.value.trim()),o.value&&(m.sent=o.value);try{const c=await $.list(m);if(l!==i)return;f=c.filter(d=>d.status==="draft").map(d=>d.id);const y=e.querySelector("#f-issue-all");y.hidden=f.length===0,y.textContent=`Ausstellen (${f.length})`,w.innerHTML=c.map(d=>`<div class="card"><div class="row">
					${d.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${d.paid?`Ausgeglichen am ${s((d.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${s(d.id)}" ${d.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${s(d.number??"(Entwurf)")}</strong>${Te(d.status)}
					<span>${s(d.buyer.name||"—")}</span>
					<span>${N(d.totals.grossTotal)}</span>
					${d.skontoPercent>0&&!d.paid?`<span class="muted">${N(d.totals.grossTotal-Se(d))} bei ${s(d.skontoPercent)} % Skonto</span>`:""}
					${d.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					${d.status==="issued"?d.sentAt?`<span class="badge issued" title="Über ${s(d.sendChannel??"E-Mail")} versendet am ${s(d.sentAt.slice(0,10))}">versendet</span>`:`<button class="secondary" data-sent="${s(d.id)}" title="Als versendet markieren">nicht versendet</button>`:""}
					<a href="#/invoices/${s(d.id)}">Ansehen</a>
					${d.status==="draft"?`<a href="#/edit/${s(d.id)}">Bearbeiten</a>`:""}
					${d.status==="draft"?`<button class="secondary" data-del="${s(d.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',w.querySelectorAll("[data-paid]").forEach(d=>d.addEventListener("change",()=>{p(d)})),w.querySelectorAll("[data-sent]").forEach(d=>d.addEventListener("click",async()=>{try{await $.markSent(d.dataset.sent??"","E-Mail"),await b()}catch(k){r(k)}})),w.querySelectorAll("[data-del]").forEach(d=>d.addEventListener("click",async()=>{if(window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen."))try{await $.deleteDraft(d.dataset.del??""),S.innerHTML='<div class="card muted">Entwurf gelöscht.</div>',await b()}catch(k){r(k)}}))}catch(c){if(l!==i)return;w.innerHTML=`<div class="card error">${s(c.message)}</div>`}}n.onchange=()=>{b()},a.onchange=()=>{b()},o.onchange=()=>{b()},u.onclick=()=>{g=g==="desc"?"asc":"desc",u.textContent=g==="desc"?"↓ absteigend":"↑ aufsteigend",b()};let v;t.oninput=()=>{v!==void 0&&clearTimeout(v),v=setTimeout(()=>{b()},250)},e.querySelector("#f-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${f.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`))try{const l=await $.issueBatch(f);S.innerHTML=`<div class="card ${l.failed.length?"error":"muted"}">${l.issued.length} ausgestellt${l.failed.length?`, ${l.failed.length} fehlgeschlagen: ${s(l.failed[0].error??"")}`:""}.</div>`,await b()}catch(l){r(l)}});const L=()=>{const l={};return n.value&&(l.status=n.value),t.value.trim()&&(l.q=t.value.trim()),l};e.querySelector("#f-export")?.addEventListener("click",async()=>{try{await H($.exportUrl(L()),"export.xlsx")}catch(l){r(l)}}),e.querySelector("#f-csv")?.addEventListener("click",async()=>{try{await H($.csvUrl(L()),"rechnungen.csv")}catch(l){r(l)}}),e.querySelector("#f-datev")?.addEventListener("click",async()=>{try{await H($.datevUrl(L()),"rechnungen.datev")}catch(l){r(l)}});async function q(){try{const l=await $.reminders();if(!l.length){h.innerHTML="";return}h.innerHTML=`<div class="card"><div class="row">
				<strong>Überfällig: ${l.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${l.map(m=>`<div class="card" style="flex:1">
						<strong>${s(m.invoice.number??"")}</strong> ${s(m.invoice.buyer.name)}
						<br /><span class="muted">${m.overdueDays} Tage überfällig · Stufe ${m.level}${m.skontoActive?` · Skonto ${s(m.invoice.skontoPercent)} % noch möglich bis ${s(m.invoice.skontoDueDate??"")}`:""}</span>
						<br /><a href="#/invoices/${s(m.invoice.id)}">Ansehen</a>
					</div>`).join("")}</div></div>`}catch{}}await b(),await q()}function I(e){return Math.round((e+Number.EPSILON)*100)/100}function Le(e){const n=(e??"").trim(),[t,a]=n.split(".."),u=o=>/^\d{4}-\d{2}-\d{2}$/.test(o??"")?`${o.slice(8,10)}.${o.slice(5,7)}.${o.slice(0,4)}`:o??"";return a?`${u(t)} – ${u(a)}`:u(t)}async function Pe(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let a=await $.get(n);const o=(Array.isArray(a.lines)?a.lines:[]).map(i=>{const r=Math.min(Math.max(Number(i.discountPercent)||0,0),100),p=Number(i.quantity)||0,b=Number(i.unitPriceNet)||0;return{line:i,discount:r,gross:I(p*b),net:I(p*b*(1-r/100))}}),h=o.some(i=>i.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${s(a.number??"(Entwurf)")}</strong>
				<span class="badge ${a.status}">${a.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${s(a.seller.name)}<br />${s(a.seller.street)}<br />${s(a.seller.zip)} ${s(a.seller.city)}</div>
				<div><strong>Käufer</strong><br />${s(a.buyer.name)}<br />${s(a.buyer.street)}<br />${s(a.buyer.zip)} ${s(a.buyer.city)}${a.buyer.email?`<br />${s(a.buyer.email)}`:""}</div>
			</div>
			<p>Ausgestellt: ${s(a.issueDate)} · Leistung: ${s(Le(a.deliveryDate))}${a.dueDate?` · Fällig: ${s(a.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${h?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${o.map((i,r)=>`<tr>
					<td>${r+1}</td><td>${s(i.line.description)}${i.line.sku?` (${s(i.line.sku)})`:""}</td>
					<td class="r">${s(i.line.quantity)} ${s(i.line.unit)}</td>
					<td class="r">${N(Number(i.line.unitPriceNet))}</td>
					${h?`<td class="r">${i.discount>0?`${s(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?N(I(i.gross-i.net)):"–"}</td>`:""}
					<td class="r">${s(i.line.vatRate)} %</td><td class="r"><strong>${N(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${N(a.totals.grossTotal)}</strong> <span class="muted">(netto ${N(a.totals.netTotal)} + USt ${N(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${s(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?`<a class="btn" href="#/edit/${s(a.id)}">Bearbeiten</a>`:""}
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${a.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${a.paid?"checked":""} /><span>bezahlt${a.paid&&a.paidAt?` (${s(a.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${a.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				${a.status==="issued"?a.sentAt?`<span class="badge issued" title="${s(a.sendChannel??"E-Mail")} am ${s(a.sentAt.slice(0,10))}">versendet</span>`:'<button class="secondary" id="d-sent" title="Als versendet markieren">Als versendet markieren</button>':""}
				${a.status!=="draft"&&a.pdfPath?'<button class="secondary" id="d-rerender" title="Erzeugt die PDF neu, z. B. nach einer Layout-Korrektur. Der Inhalt der Rechnung bleibt unverändert, das Original wird archiviert.">Neu rendern</button>':""}
				<button class="secondary" id="d-as-tpl" title="Legt eine Rechnungsvorlage mit diesen Positionen, Terminen und Zahlungsbedingungen an. Käufer und Datum werden nicht übernommen.">Vorlage erstellen</button>
				<button class="secondary" id="d-validate">Validieren</button>
			${a.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
			${a.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
			${a.status==="issued"&&a.pdfPath?'<button class="secondary" id="d-mail">E-Mail (PDF)</button>':""}
			${a.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
			${a.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div></div>`;const g=e.querySelector("#d-out"),f=i=>{g.innerHTML=`<p class="error">${s(i.message)}</p>`},w=e.querySelector("#d-history"),S=async()=>{if(a.status!=="draft")try{const i=await $.renders(a.id);if(!i.length){w.innerHTML="";return}w.innerHTML=`<details><summary>Neu gerendert (${i.length})</summary><ul>${i.map(r=>`<li>${s(r.createdAt.slice(0,16).replace("T"," "))} – ${s(r.artifact.toUpperCase())}${r.reason?` – ${s(r.reason)}`:""}${r.previousPath?` – Original: <code>${s(r.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await S(),e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const r=i.dataset.dl,p=r==="pdf"?$.pdfUrl(a.id):r==="xml"?$.xmlUrl(a.id):$.xlsxUrl(a.id);try{await H(p,`${a.number??"rechnung"}.${r}`)}catch(b){f(b)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await fe($.pdfUrl(a.id))}catch(i){f(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{g.innerHTML='<p class="muted">Validiere…</p>';try{const i=await $.validate(a.id);g.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(r=>`<li class="error">${s(r)}</li>`).join("")}</ul>`}catch(i){g.innerHTML=`<p class="error">${s(i.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async i=>{const r=i.target,p=r.checked;r.disabled=!0;try{a=await $.setPaid(a.id,p),g.innerHTML=`<p style="color:var(--ok)">${p?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(b){r.checked=!p,g.innerHTML=`<p class="error">${s(b.message)}</p>`}finally{r.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const i=(a.buyer.email??"").trim(),r=`${a.documentTitle??"Rechnung"} ${a.number??""}`.trim(),p=`Guten Tag ${a.buyer.name||""},

anbei erhalten Sie ${r} vom ${a.issueDate}.
Gesamtbetrag: ${N(a.totals.grossTotal)}.
${a.dueDate?`Bitte überweisen bis ${a.dueDate}.
`:""}
Mit freundlichen Grüßen
${a.seller.name}
`;try{await H($.pdfUrl(a.id),`${a.number??"rechnung"}.pdf`)}catch(v){f(v);return}const b=`mailto:${i}?subject=${encodeURIComponent(r)}&body=${encodeURIComponent(p)}`;window.location.href=b,g.innerHTML=i?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${s(i)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-sent")?.addEventListener("click",async()=>{try{a=await $.markSent(a.id,"E-Mail"),g.innerHTML=`<p style="color:var(--ok)">Als versendet markiert${a.sentAt?` (${s(a.sentAt.slice(0,10))})`:""}.</p>`,e.querySelector("#d-sent")?.remove()}catch(i){f(i)}}),e.querySelector("#d-as-tpl")?.addEventListener("click",async()=>{const i=`${a.buyer.name||"Rechnung"} ${new Date().getFullYear()}`,r=window.prompt("Name der Vorlage:",i);if(!(!r||!r.trim()))try{const p=await $.asTemplate(a.id,r.trim());g.innerHTML=`<p style="color:var(--ok)">Vorlage „${s(p.name)}" angelegt –
					<a href="#/invoice-templates">jetzt bearbeiten</a>.</p>`}catch(p){f(p)}}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const i=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(i!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?")){g.innerHTML='<p class="muted">Rendere neu…</p>';try{const r=await $.rerender(a.id,i.trim()||void 0);a=r.invoice,g.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${r.archivedPath?` Das Original liegt als <code>${s(r.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await S();const p=e.querySelector("#d-duty");if(a.status!=="draft"&&!a.paid)try{const{duty:b,checked:v}=await $.paymentCheck(a.id);b.required&&!v?(p.innerHTML=`<p class="error">${s(b.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`,e.querySelector("#d-duty-ok")?.addEventListener("click",async()=>{try{await $.paymentCheck(a.id,"geprüft"),p.innerHTML='<p style="color:var(--ok)">Zahlungsweise geprüft.</p>'}catch(L){f(L)}})):v&&(p.innerHTML=`<p class="muted">Zahlungsweise geprüft${a.paymentCheckedAt?` am ${s(a.paymentCheckedAt.slice(0,10))}`:""}.</p>`)}catch{}}catch(r){g.innerHTML=`<p class="error">${s(r.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const i=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(i!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:r}=await $.storno(a.id,i.trim()||void 0);location.hash=`#/edit/${r.id}`,location.reload()}catch(r){g.innerHTML=`<p class="error">${s(r.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await $.issue(a.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){g.innerHTML=`<p class="error">${s(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${s(t.message)}</div>`}}function Q(e){return{lines:(Array.isArray(e.lines)?e.lines:[]).filter(t=>t&&typeof t.description=="string"&&t.description.trim()!==""),paymentTerms:typeof e.paymentTerms=="string"?e.paymentTerms:"",skontoPercent:Number(e.skontoPercent)||0,notes:typeof e.notes=="string"?e.notes:""}}function ee(e){return e.reduce((n,t)=>{const a=Math.min(Math.max(Number(t.discountPercent)||0,0),100),u=(Number(t.quantity)||0)*(Number(t.unitPriceNet)||0);return n+u*(1-a/100)},0)}function Ne(e,n,t){return`<div class="card line" style="background:var(--bg)">
		<div class="line-head"><span class="line-no">${n+1}</span><strong>Position ${n+1}</strong>
			<button class="secondary" data-tpl-del-line="${n}">Entfernen</button></div>
		<div class="grid2">
			<label>Bezeichnung<input data-tpl-line="${n}.description" value="${s(e.description)}" /></label>
			<label>Art.Nr.<input data-tpl-line="${n}.sku" value="${s(e.sku??"")}" /></label>
		</div>
		<div class="grid2">
			<label>Menge<input data-tpl-line="${n}.quantity" type="number" min="0" step="any" value="${s(e.quantity)}" /></label>
			<label>Einheit<input data-tpl-line="${n}.unit" value="${s(e.unit)}" /></label>
		</div>
		<div class="grid2">
			<label>Preis netto<input data-tpl-line="${n}.unitPriceNet" type="number" min="0" step="0.01" value="${s(e.unitPriceNet)}" /></label>
			<label>USt %<select data-tpl-line="${n}.vatRate">
				${t.map(a=>`<option ${Number(a)===Number(e.vatRate)?"selected":""}>${a}</option>`).join("")}
			</select></label>
		</div>
	</div>`}const qe=[19,7,0];async function De(e){e.innerHTML='<div class="card">Lade Rechnungsvorlagen…</div>';let n=[],t=[],a=null,u=!1,o=[],h="",g=0,f="",w="",S=!1;async function i(){n=await $.invoiceTemplates.list(),L()}async function r(){try{t=await $.products.list(),u&&L()}catch{t=[]}}function p(q){a=q,u=!0;const l=Q(q?.body??{});o=l.lines.length?l.lines.map(m=>({...m})):[b()],h=l.paymentTerms,g=l.skontoPercent,f=l.notes,w="",S=!1,L()}function b(){return{description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}}function v(){return o.map((q,l)=>{const m=(c,y)=>{const d=e.querySelector(`[data-tpl-line="${l}.${c}"]`);return d?d.value:y};return{description:String(m("description",q.description)),sku:String(m("sku","")),quantity:Number(m("quantity",q.quantity))||0,unit:String(m("unit",q.unit)),unitPriceNet:Number(m("unitPriceNet",q.unitPriceNet))||0,vatRate:Number(m("vatRate",q.vatRate))||0}})}function L(){const q=ee(v());e.innerHTML=`
		<div class="card"><div class="row"><strong>Rechnungsvorlagen</strong>
			<button id="t-new">+ Neue Vorlage</button>
			${w?`<span class="${S?"error":"muted"}">${s(w)}</span>`:""}</div>
			<p class="muted">Wiederkehrende Rechnungen (Wartung, Honorar, Abo) einmal anlegen und im Assistenten
				übernehmen. Käufer und Datum werden bewusst nicht gespeichert.</p>
			${n.map(l=>{const m=Q(l.body);return`<div class="row" style="margin-top:8px">
						<strong>${s(l.name)}</strong>
						<span class="muted">${m.lines.length} Position(en) · ${N(ee(m.lines))}${m.skontoPercent?` · ${m.skontoPercent} % Skonto`:""}</span>
						<button class="secondary" data-tpl-edit="${s(l.id)}">Bearbeiten</button>
						<button class="danger" data-tpl-del="${s(l.id)}">Löschen</button>
					</div>`}).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${u?`<div class="card"><h3>${a?s(a.name):"Neue Vorlage"}</h3>
					<label>Name<input id="t-name" value="${s(a?.name??"")}" placeholder="z. B. Monatliche Wartung" /></label>
					<label>Zahlungsbedingungen<input id="t-terms" value="${s(h)}" placeholder="Zahlbar innerhalb von 14 Tagen" /></label>
					<div class="grid2">
						<label>Skonto %<input id="t-skonto" type="number" min="0" max="20" step="0.5" value="${s(g)}" /></label>
						<label>&nbsp;</label>
					</div>
					<label>Notiz<textarea id="t-notes" rows="2">${s(f)}</textarea></label>
					<p class="muted">Summe netto: <strong>${N(q)}</strong></p>
					${t.length>0?`<div class="row">
								<label style="flex:1">Aus dem Positionskatalog übernehmen<select id="t-catalog">
									<option value="">– Position wählen –</option>
									${t.map(l=>`<option value="${s(l.id)}">${s(l.sku?`${l.sku} · `:"")}${s(l.name)} · ${N(l.unitPriceNet)}</option>`).join("")}
								</select></label>
								<button class="secondary" id="t-take" style="align-self:end">Position hinzufügen</button>
							</div>`:'<p class="muted">Unter <a href="#/products">Positionen</a> kannst du den Katalog pflegen.</p>'}
					${o.map((l,m)=>Ne(l,m,qe)).join("")}
					<button class="secondary" id="t-add-line">+ Leere Position</button>
					<p><button id="t-save">Speichern</button>
					<button class="secondary" id="t-cancel">Abbrechen</button></p>
				</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",()=>p(null)),e.querySelectorAll("[data-tpl-edit]").forEach(l=>l.addEventListener("click",()=>{const m=n.find(c=>c.id===l.dataset.tplEdit);m&&p(m)})),e.querySelectorAll("[data-tpl-del]").forEach(l=>l.addEventListener("click",async()=>{if(window.confirm("Vorlage löschen? Bereits ausgestellte Rechnungen bleiben unverändert."))try{await $.invoiceTemplates.remove(l.dataset.tplDel??""),w="Vorlage gelöscht.",S=!1,await i()}catch(m){w=m.message,S=!0,L()}})),e.querySelectorAll("[data-tpl-del-line]").forEach(l=>l.addEventListener("click",()=>{const m=Number(l.dataset.tplDelLine);o.splice(m,1),o.length===0&&o.push(b()),L()})),e.querySelector("#t-take")?.addEventListener("click",()=>{o=v();const l=e.querySelector("#t-catalog")?.value??"",m=t.find(c=>c.id===l);m&&(o.push({description:m.name,sku:m.sku||void 0,details:m.details||void 0,quantity:1,unit:m.unit,unitPriceNet:m.unitPriceNet,vatRate:m.vatRate}),L())}),e.querySelector("#t-add-line")?.addEventListener("click",()=>{o=v(),o.push(b()),L()}),e.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,u=!1,L()}),e.querySelector("#t-save")?.addEventListener("click",async()=>{const l=e.querySelector("#t-name")?.value.trim()??"";if(!l){w="Bitte einen Namen vergeben.",S=!0,L();return}const m=v().filter(y=>y.description.trim()!=="");if(m.length===0){w="Mindestens eine Position mit Bezeichnung nötig.",S=!0,L();return}const c={lines:m,paymentTerms:e.querySelector("#t-terms")?.value??"",skontoPercent:Number(e.querySelector("#t-skonto")?.value)||0,notes:e.querySelector("#t-notes")?.value??""};try{a?.id?await $.invoiceTemplates.update(a.id,{name:l,body:c}):await $.invoiceTemplates.create(l,c),w=`Gespeichert: ${l}`,S=!1,a=null,u=!1,await i()}catch(y){w=y.message,S=!0,L()}})}try{await i(),r()}catch(q){e.innerHTML=`<div class="card error">${s(q.message)}</div>`}}function Ae(e){const n=G();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${s(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";J(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{J(null),location.hash="#/login",location.reload()})}function xe(){J(null),location.hash="#/login"}async function Re(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],t=null,a=!1,u="",o=!1;async function h(){n=await $.products.list(),f()}function g(i){const r=p=>s(p??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${r(i.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${r(i.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${r(i.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${r(i.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${i.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(p=>`<option ${p===(i.vatRate??19)?"selected":""}>${p}</option>`).join("")}
		</select></label>`}function f(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${n.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${s(i.sku?`${i.sku} · `:"")}${s(i.name)}</strong>
				<span class="muted">${s(i.unit)} · ${Number(i.unitPriceNet).toFixed(2)} EUR · ${i.vatRate} %</span>
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="danger" data-del="${i.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||a?`<div class="card"><h3>${a?"Neue Position":s(t?.name??"")}</h3>
			${g(t??{})}
			${u?`<p class="${o?"error":""}">${s(u)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,a=!0,u="",f()}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{t=n.find(r=>r.id===i.dataset.edit)??null,a=!1,u="",f()})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(i.dataset.del??""),await h()}catch(r){u=r.message,o=!0,f()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,a=!1,u="",f()}),e.querySelector("#p-save")?.addEventListener("click",()=>{S()})}function w(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function S(){const i=w();try{a?await $.products.create(i):t&&await $.products.update(t.id,i),t=null,a=!1,u="",await h()}catch(r){u=r.message,o=!0,f()}}try{await h()}catch(i){e.innerHTML=`<div class="card error">${s(i.message)}</div>`}}async function Me(e){try{const n=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(n.version)} · Schema: ${s(String(n.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(n.message)}</div>`}}const Oe=["title","meta","parties","positions","totals"],te=["payment","notes"],Be=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function je(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],t=null,a="",u=[];try{const i=await D("/api/company-profiles");i.ok&&(u=await i.json())}catch{}async function o(){n=await h(),f()}async function h(){const i=await D("/api/templates");if(!i.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await i.json()}function g(i){const r=i.definition,p=(b,v,L)=>`<label><input type="checkbox" data-f="blocks.${b}" ${r.blocks[b]?"checked":""} ${L?"disabled":""} style="width:auto" /> ${v}${L?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(i.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${u.map(b=>`<option value="${s(b.id)}" ${i.definition.companyId===b.id?"selected":""}>${s(b.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${s(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${s(r.colors.text)}" /></label>
		</div>
		<label class="pay" title="Aus: das Dokument bleibt schwarz/weiß, die Primärfarbe wird nirgends verwendet">
			<input type="checkbox" data-f="usePrimaryColor" ${r.usePrimaryColor!==!1?"checked":""} /><span>Primärfarbe verwenden</span>
		</label>
		<label class="pay" title="Ohne Haken: der Titel wird in der Textfarbe gesetzt">
			<input type="checkbox" data-f="titleAccent" ${r.titleAccent!==!1?"checked":""} /><span>Rechnungstitel in Akzentfarbe</span>
		</label>
		<label class="pay" title="Ohne Haken: nur die linke Hälfte der Kopfzeile ist eingefärbt, die rechte bleibt grau">
			<input type="checkbox" data-f="tableHeaderAccent" ${r.tableHeaderAccent===!0?"checked":""} /><span>Tabellenkopf komplett in Akzentfarbe</span>
		</label>
		${Oe.map(b=>p(b,`Block ${b}`,!0)).join("")}
		${te.map(b=>p(b,`Block ${b}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${r.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${r.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${r.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${r.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${r.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${r.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${r.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${s(r.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${s(r.closingText??"")}</textarea></label>
		<div class="grid2">
			<label title="Leer lassen: es wird kein Name gedruckt">Unterschrift (Name, optional)<input id="t-sign" value="${s(r.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${s(r.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${s(r.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${Be.map(b=>`<option value="${b.value}" ${r.logo?.position===b.value?"selected":""}>${b.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${r.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${s(r.logo.path)}</p>`:""}`}function f(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Druckvorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			<p class="muted">Aussehen der PDF-Rechnung: Logo, Farben, Kopf- und Fußzeilen. Die inhaltlichen
				Positionen legst du unter <a href="#/invoice-templates">Rechnungsvorlagen</a> oder
				<a href="#/products">Positionen</a> fest.</p>
			${n.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${s(i.name)}</strong><span class="muted">v${i.version}</span>
				${i.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${i.id}">Vorschau</button>
				${i.isDefault?"":`<button class="secondary" data-def="${i.id}">Standard</button>`}
				${i.isDefault?"":`<button class="danger" data-del="${i.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${s(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${g(t)}
			${a?`<p class="error">${s(a)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const p=(await(await D("/api/templates")).json())[0];if(!p){a="Keine Basisvorlage vorhanden",f();return}t={...structuredClone(p),id:"neu",name:"Neu",version:1,isDefault:!1},a="",f()}catch(i){a=i.message,f()}}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{const r=n.find(p=>p.id===i.dataset.edit);r&&(t=structuredClone(r),a="",f())})),e.querySelectorAll("[data-prev]").forEach(i=>i.addEventListener("click",async()=>{const r=n.find(p=>p.id===i.dataset.prev);if(r)try{const p=await D("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!p.ok){const v=await p.json().catch(()=>({}));throw new Error(v.error??"Vorschau fehlgeschlagen")}const b=await p.blob();window.open(URL.createObjectURL(b),"_blank")}catch(p){a=p.message,f()}})),e.querySelectorAll("[data-def]").forEach(i=>i.addEventListener("click",async()=>{try{if(!(await D(`/api/templates/${i.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(r){a=r.message,f()}})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{const r=await D(`/api/templates/${i.dataset.del}`,{method:"DELETE"});if(!r.ok){a=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",f();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,a="",f()}),e.querySelector("#t-save")?.addEventListener("click",()=>{S()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const i=w();if(i)try{const r=await D("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!r.ok){const p=await r.json().catch(()=>({}));throw new Error(p.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){a=r.message,f()}})}function w(){if(!t)return null;const i=structuredClone(t.definition);i.name=(e.querySelector("#t-name")?.value??i.name).trim(),i.colors.primary=e.querySelector("#t-c1")?.value??i.colors.primary,i.colors.text=e.querySelector("#t-c2")?.value??i.colors.text;for(const p of te)i.blocks[p]=e.querySelector(`[data-f="blocks.${p}"]`)?.checked??i.blocks[p];for(const p of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])i[p]=e.querySelector(`[data-f="${p}"]`)?.checked??!1;for(const p of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const b=e.querySelector(`[data-f="${p}"]`);b&&(i[p]=b.checked)}i.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?i.companyId=r:delete i.companyId,i.introText=e.querySelector("#t-intro")?.value??"",i.closingText=e.querySelector("#t-closing")?.value??"",i.signatureName=e.querySelector("#t-sign")?.value??"",i.headerExtra=e.querySelector("#t-hextra")?.value??"",i.logo&&(i.logo.position=e.querySelector("#t-lpos")?.value??"right",i.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),i.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:i.name,definition:i}}async function S(){const i=w();if(!i)return;const r=i.definition;try{let p=t.id;if(p==="neu"){const v=await D("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");p=(await v.json()).id}else{const v=await D(`/api/templates/${p}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const b=e.querySelector("#t-logo")?.files?.[0];if(b){const v=await new Promise((q,l)=>{const m=new FileReader;m.onload=()=>q(String(m.result).split(",")[1]),m.onerror=()=>l(new Error("Datei nicht lesbar")),m.readAsDataURL(b)}),L=await D(`/api/templates/${p}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:b.name,mime:b.type,dataBase64:v})});if(!L.ok)throw new Error((await L.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,a="",await o()}catch(p){a=p.message,f()}}try{await o()}catch(i){e.innerHTML=`<div class="card error">${s(i.message)}</div>`}}const ne=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),C=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:F.defaultVatRate});let F={defaultVatRate:19,defaultPaymentTerms:""};const W=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],ae="__own__";function ce(e,n){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+n),t.toISOString().slice(0,10)}function de(e){return!!e&&!ue(e)}function ue(e){return!!e&&W.some(n=>n.text===e)}function me(e){return W.find(n=>n.text===e)?.days??null}function se(e){if(!e.dueAuto)return;const n=me(e.paymentTerms);n!==null&&(e.dueDate=ce(e.issueDate,n))}function O(e){return Math.round((e+Number.EPSILON)*100)/100}function ie(e){const n=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,a=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return O(n*t*(1-a/100))}function He(e){return(e??"").trim().split("..")[0]??""}function ze(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const j="einv-wizard-v1",pe="einv-employee";function he(){try{return localStorage.getItem(pe)??""}catch{return""}}function re(){return new Date().toISOString().slice(0,10)}function Z(){return{step:0,seller:ne(),buyer:ne(),lines:[C()],issueDate:re(),deliveryDate:re(),dueDate:"",employee:he(),documentTitle:"Rechnung",notes:"",paymentTerms:F.defaultPaymentTerms,termsCustom:de(F.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function K(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function Ue(){try{const e=localStorage.getItem(j);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{...Z(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function le(e,n,t){return`
		<label>Name<input data-p="${e}" data-f="name" value="${s(n.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${s(n.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${s(n.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${s(n.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${s(n.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${s(n.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${e}" data-f="phone" value="${s(n.phone)}" /></label>
			${t?`<label>Webseite<input data-p="${e}" data-f="website" value="${s(n.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${s(n.contactName)}" /></label>`}
		</div>
		${t?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${s(n.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${s(n.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${s(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Ce=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Fe={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function oe(e,n){let t=Z();const a=!!n;let u=[],o=[],h=[],g=[],f=!1,w=!1;if($.settings().then(l=>{F={defaultVatRate:Number(l.defaultVatRate)||19,defaultPaymentTerms:l.defaultPaymentTerms??""}}).catch(()=>{}),n){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(n).then(l=>{if(l.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${s(l.status)}).</div>`;return}t={...Z(),seller:l.seller,buyer:l.buyer,lines:l.lines.length>0?l.lines:[C()],issueDate:l.issueDate,deliveryDate:l.deliveryDate,dueDate:l.dueDate??"",employee:l.employeeCode??he(),documentTitle:l.documentTitle,notes:l.notes??"",paymentTerms:l.paymentTerms??F.defaultPaymentTerms,termsCustom:de(l.paymentTerms),skontoPercent:l.skontoPercent??0,skontoDueDate:l.skontoDueDate??"",draftId:l.id},i(),v()}).catch(l=>{e.innerHTML=`<div class="card error">${s(l.message)}</div>`});return}const S=Ue();if(S&&K(S)&&!S.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${s(S.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=S,i(),v()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(j),i(),v()});return}S&&K(S)&&(t=S),i(),K(t)||$.company.getDefault().then(l=>{l&&!t.seller.name.trim()&&l.profile.name.trim()&&(t.seller={...t.seller,...l.profile},t.selectedCompany=l.id,v(!0))}).catch(()=>{});function i(){if(w)return;w=!0;const l=(m,c)=>{c(),e.querySelector(m)||v(!0)};$.company.list().then(m=>l("#w-company",()=>u=m)).catch(()=>{}),$.customers.list().then(m=>l("#w-customer",()=>o=m)).catch(()=>{}),$.products.list().then(m=>l("#w-catalog",()=>h=m)).catch(()=>{}),$.invoiceTemplates.list().then(m=>l("#w-inv-tpl",()=>g=m)).catch(()=>{})}function r(){try{if(a)return;if(!t.dirty){localStorage.removeItem(j);return}localStorage.setItem(j,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function p(){e.querySelectorAll("input[data-p]").forEach(d=>{const k=d.dataset.p==="seller"?t.seller:t.buyer;k[d.dataset.f]=d.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(d=>{const[k,P]=d.dataset.l.split("."),A=t.lines[Number(k)];if(A)if(P==="quantity"||P==="unitPriceNet"||P==="vatRate"||P==="discountPercent"){const M=Number(d.value),z=Number.isFinite(M)?M:0;A[P]=P==="discountPercent"?Math.min(Math.max(z,0),100):z}else A[P]=d.value});const l=d=>e.querySelector(`#${d}`)?.value??"",m=()=>{const d=l("w-delivery");if(!d)return;const k=l("w-delivery-to");t.deliveryDate=k&&k!==d?`${d}..${k}`:d};t.issueDate=l("w-issue")||t.issueDate,m(),e.querySelector("#w-due")&&(t.dueDate=l("w-due")),se(t),e.querySelector("#w-employee")&&(t.employee=l("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=l("w-title")||t.documentTitle);const c=e.querySelector("#w-notes");c&&(t.notes=c.value);const y=e.querySelector("#w-terms");if(y&&(t.paymentTerms=y.value),e.querySelector("#w-skonto")){const d=Number(l("w-skonto"));t.skontoPercent=Number.isFinite(d)?Math.min(Math.max(d,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=l("w-skonto-due")),r()}function b(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((m,c)=>`<span class="${c===t.step?"on":""}">${c+1}. ${m}</span>`).join("")}</div>`}function v(l=!1){l||p();let m="";if(t.step===0&&(m=`<div class="card"><h3>Verkäufer</h3>
				${u.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${u.map(c=>`<option value="${s(c.id)}" ${t.selectedCompany===c.id?"selected":""}>${s(c.name)}${c.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${le("seller",t.seller,!0)}</div>`),t.step===1&&(m=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(c=>`<option value="${s(c.id)}" ${t.selectedCustomer===c.id?"selected":""}>${s(c.name)}${c.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${le("buyer",t.buyer,!1)}</div>`),t.step===2&&(m=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Ce.map(c=>`<option ${c===t.documentTitle?"selected":""}>${c}</option>`).join("")}
				</select></label>
				${g.length>0?`<label>Wiederkehrende Rechnung<select id="w-inv-tpl">
							<option value="">– eigene Positionen –</option>
							${g.map(c=>`<option value="${s(c.id)}">${s(c.name)}</option>`).join("")}
						</select></label>
						<p class="muted">Übernimmt Positionen, Termine, Zahlungsbedingungen und Skonto. Käufer und Datum bleiben deine Angaben.</p>`:'<p class="muted">Tipp: Unter <a href="#/invoice-templates">Rechnungsvorlagen</a> eine Vorlage anlegen, um wiederkehrende Rechnungen nicht jedes Mal neu einzutippen.</p>'}
				${h.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${h.map(c=>`<option value="${s(c.id)}">${s(c.sku?`${c.sku} · `:"")}${s(c.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((c,y)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${y+1}</span><strong>Position ${y+1}</strong>
						<span class="line-sum">${N(ie(c))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${y}.description" value="${s(c.description)}" /></label>
						<label>Art.Nr.<input data-l="${y}.sku" value="${s(c.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${y}.details" rows="1">${s(c.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${y}.quantity" type="number" min="0" step="any" value="${s(c.quantity)}" /></label>
						<label>Einheit<input data-l="${y}.unit" value="${s(c.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${y}.unitPriceNet" type="number" min="0" step="0.01" value="${s(c.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${y}.discountPercent" type="number" min="0" max="100" step="0.1" value="${s(c.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${y}.vatRate">
							${[19,7,0].map(d=>`<option ${d===Number(c.vatRate)?"selected":""}>${d}</option>`).join("")}
						</select></label>
						${Number(c.vatRate)===0?`<label>Steuerbefreiung<select data-l="${y}.exemptionCategory">
								${["E","AE","K","G","O"].map(d=>`<option ${(c.exemptionCategory??"E")===d?"selected":""} value="${d}">${d} — ${Fe[d]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${y}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${s(c.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${y}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${s(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${s(t.dueDate)}" />${t.dueAuto?' <span class="muted">(aus Zahlungsbedingung)</span>':""}</label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${s(He(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${s(ze(t.deliveryDate))}" /></label>
					</div>
					<p class="muted">Nur „von" angeben, wenn die Leistung an einem Tag erbracht wurde. Mit „bis" wird der Zeitraum als BT-74/BT-75 in die Rechnung geschrieben.</p>
				</fieldset>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${s(t.employee)}" /></label>
				<fieldset class="period">
					<legend>Skonto (Rabatt bei früher Zahlung)</legend>
					<div class="grid2">
						<label>Skonto %<input id="w-skonto" type="number" min="0" max="100" step="0.01" value="${s(t.skontoPercent)}" /></label>
						<label>Skonto bis<input id="w-skonto-due" type="date" value="${s(t.skontoDueDate)}" /></label>
					</div>
					<p class="muted">Bei 0 % kein Skonto. Ohne eigenes Datum gilt das Fälligkeitsdatum. Der Skonto mindert den Zahlbetrag (BT-9) und steht als Bedingung mit Subject-Code AAK im XML.</p>
				</fieldset>
				<label>Notizen<textarea id="w-notes">${s(t.notes)}</textarea></label>
				<label>Zahlungsbedingungen<select id="w-terms-select">
					<option value="" ${t.paymentTerms===""?"selected":""}>keine</option>
					${W.map(c=>`<option value="${s(c.text)}" ${!t.termsCustom&&t.paymentTerms===c.text?"selected":""}>${s(c.text)}</option>`).join("")}
					<option value="${ae}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${s(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const c=t.lines.map(T=>{const R=Math.min(Math.max(Number(T.discountPercent)||0,0),100);return{...T,discount:R,gross:O((Number(T.quantity)||0)*(Number(T.unitPriceNet)||0)),net:ie(T)}}).filter(T=>T.description.trim()!==""||T.gross>0),y=new Map;for(const T of c)y.set(Number(T.vatRate)||0,O((y.get(Number(T.vatRate)||0)??0)+T.net));const d=[...y.entries()].sort(([T],[R])=>T-R).map(([T,R])=>({rate:T,net:R,tax:O(R*T/100)})),k=O(d.reduce((T,R)=>T+R.net,0)),P=O(d.reduce((T,R)=>T+R.tax,0)),A=O(k+P),M=O(A*(Number(t.skontoPercent)||0)/100),z=c.some(T=>T.discount>0);m=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${s(t.documentTitle)}</strong> · ${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${c.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${z?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${c.map(T=>`<tr>
							<td>${s(T.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${s(T.quantity)} ${s(T.unit)}</td>
							<td class="r">${N(T.unitPriceNet)}</td>
							${z?`<td class="r">${T.discount>0?`${s(T.discount)} %`:"–"}</td><td class="r">${T.discount>0?N(O(T.gross-T.net)):"–"}</td>`:""}
							<td class="r">${s(T.vatRate)} %</td><td class="r"><strong>${N(T.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${N(k)}</td></tr>
						${d.map(T=>`<tr class="sub"><td class="lbl">USt ${s(T.rate)} % auf ${N(T.net)}</td><td class="r">${N(T.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${N(A)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${s(t.skontoPercent)} % Skonto bis ${s(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${N(M)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${N(A-M)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${b()}${m}
			${t.error?`<div class="card error">${s(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,v()}),e.querySelector("#w-terms-select")?.addEventListener("change",c=>{const y=c.target.value;if(y===ae)t.termsCustom=!0,ue(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=y;const d=me(y);d!==null?(t.dueAuto=!0,t.dueDate=ce(t.issueDate,d)):t.dueAuto=!1}v()}),e.querySelector("#w-due")?.addEventListener("change",()=>{p(),t.dueAuto=!1,v()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const c=e.querySelector("#w-company")?.value??"",y=u.find(d=>d.id===c);y?(t.seller={...t.seller,...y.profile},t.selectedCompany=y.id,v(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const c=e.querySelector("#w-customer")?.value??"",y=o.find(d=>d.id===c);y?(t.buyer={...t.buyer,...y.profile},t.selectedCustomer=y.id,v(!0)):t.selectedCustomer=null}),e.querySelector("#w-inv-tpl")?.addEventListener("change",c=>{const y=c.target.value,d=g.find(P=>P.id===y);if(!d||t.lines.length>0&&!window.confirm(`Positionen durch "${d.name}" ersetzen?`))return;const k=d.body;Array.isArray(k.lines)&&k.lines.length>0&&(t.lines=k.lines.map(P=>({...C(),...P}))),typeof k.paymentTerms=="string"&&(t.paymentTerms=k.paymentTerms),typeof k.notes=="string"&&(t.notes=k.notes),typeof k.documentTitle=="string"&&k.documentTitle&&(t.documentTitle=k.documentTitle),typeof k.skontoPercent=="number"&&k.skontoPercent>0&&(t.skontoPercent=k.skontoPercent),typeof k.dueDate=="string"&&(t.dueDate=k.dueDate),typeof k.deliveryDate=="string"&&(t.deliveryDate=k.deliveryDate),v(!0)}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,v()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(j),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{p(),t.dirty=!0,t.lines.push(C()),v()}),e.querySelector("#w-take")?.addEventListener("click",()=>{p();const c=e.querySelector("#w-catalog")?.value??"",y=h.find(d=>d.id===c);if(y){const d={description:y.name,sku:y.sku||void 0,details:y.details||void 0,quantity:1,unit:y.unit,unitPriceNet:y.unitPriceNet,vatRate:y.vatRate},k=t.lines.findIndex(P=>!P.description.trim()&&!(P.sku??"").trim()&&!(P.details??"").trim()&&P.unitPriceNet===0);k>=0?t.lines[k]=d:t.lines.push(d),t.dirty=!0}v(!0)}),e.querySelectorAll("[data-del]").forEach(c=>c.addEventListener("click",()=>{p(),t.dirty=!0,t.lines.splice(Number(c.dataset.del),1),t.lines.length===0&&t.lines.push(C()),v(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{L(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&L(!0)})}async function L(l){if(!f){f=!0;try{p(),t.error="";const m={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(pe,t.employee.trim())}catch{}let c;t.draftId?c=await $.update(t.draftId,m):(c=await $.create(m),t.draftId=c.id),l&&(c=await $.issue(c.id));try{localStorage.removeItem(j)}catch{}location.hash=`#/invoices/${c.id}`}catch(c){t.error=c.message,v()}}finally{f=!1}}}e.addEventListener("input",()=>{try{q()}catch{}});function q(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const P=k.dataset.p==="seller"?t.seller:t.buyer;P[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[P,A]=k.dataset.l.split("."),M=t.lines[Number(P)];M&&(A==="quantity"||A==="unitPriceNet"||A==="vatRate"||A==="discountPercent"?M[A]=Number(k.value):M[A]=k.value)});const l=k=>e.querySelector(`#${k}`)?.value??"",m=l("w-issue"),c=l("w-delivery"),y=l("w-delivery-to");m&&(t.issueDate=m),c&&(t.deliveryDate=y&&y!==c?`${c}..${y}`:c),e.querySelector("#w-due")&&(t.dueDate=l("w-due")),se(t),e.querySelector("#w-employee")&&(t.employee=l("w-employee"));const d=l("w-title");if(d&&(t.documentTitle=d),e.querySelector("#w-skonto")){const k=Number(l("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=l("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,r()}v()}const Ie=document.querySelector("#app");function Ke(e){const n=!!G(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Druckvorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/invoice-templates","Rechnungsvorlagen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];Ie.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([a,u])=>`<a href="${a}" class="${e===a||a==="#/"&&e.startsWith("#/invoices")?"active":""}">${u}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function ve(){const e=location.hash||"#/";Ke(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await Ee(n):e==="#/new"?oe(n):e.startsWith("#/edit/")?oe(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Pe(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await je(n):e==="#/company"?await ye(n):e==="#/customers"?await ke(n):e==="#/products"?await Re(n):e==="#/invoice-templates"?await De(n):e==="#/backup"?await be(n):e==="#/login"?Ae(n):e==="#/logout"?xe():e==="#/status"?await Me(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{ve()});ve();
