(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const h of document.querySelectorAll('link[rel="modulepreload"]'))a(h);new MutationObserver(h=>{for(const d of h)if(d.type==="childList")for(const f of d.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&a(f)}).observe(document,{childList:!0,subtree:!0});function t(h){const d={};return h.integrity&&(d.integrity=h.integrity),h.referrerPolicy&&(d.referrerPolicy=h.referrerPolicy),h.crossOrigin==="use-credentials"?d.credentials="include":h.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function a(h){if(h.ep)return;h.ep=!0;const d=t(h);fetch(h.href,d)}})();const V="einv-token";function G(){try{return localStorage.getItem(V)}catch{return null}}function J(e){try{e?localStorage.setItem(V,e):localStorage.removeItem(V)}catch{}}async function L(e,n){const t=await D(e,{headers:{"content-type":"application/json"},...n});if(!t.ok){const a=await t.json().catch(()=>({}));throw new Error(a.error??`HTTP ${t.status}`)}return await t.json()}async function D(e,n){const t={...n?.headers??{}},a=G();a&&(t.authorization=`Bearer ${a}`);const h=await fetch(e,{...n,headers:t});if(h.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return h}async function j(e,n){const t=await D(e);if(!t.ok){const f=await t.json().catch(()=>({}));throw new Error(f.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const a=await t.blob(),h=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),d=document.createElement("a");d.href=URL.createObjectURL(a),d.download=h?.[1]??n,document.body.appendChild(d),d.click(),d.remove(),window.setTimeout(()=>URL.revokeObjectURL(d.href),1e4)}async function fe(e){const n=await D(e);if(!n.ok){const h=await n.json().catch(()=>({}));throw new Error(h.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const t=await n.blob(),a=URL.createObjectURL(t);window.open(a,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(a),6e4)}const y={health:()=>L("/api/health"),settings:()=>L("/api/settings"),list:(e={})=>{const n=new URLSearchParams(e).toString();return L(`/api/invoices${n?`?${n}`:""}`)},get:e=>L(`/api/invoices/${e}`),create:e=>L("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>L(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>L(`/api/invoices/${e}/issue`,{method:"POST"}),issueBatch:e=>L("/api/invoices/issue-batch",{method:"POST",body:JSON.stringify({ids:e})}),deleteDraft:e=>L(`/api/invoices/${e}`,{method:"DELETE"}),markSent:(e,n)=>L(`/api/invoices/${e}/sent`,{method:"POST",body:JSON.stringify({channel:n})}),paymentCheck:(e,n)=>L(`/api/invoices/${e}/payment-check`,{method:"POST",body:JSON.stringify({outcome:n})}),reminders:()=>L("/api/reminders"),reminded:e=>L(`/api/invoices/${e}/reminded`,{method:"POST"}),invoiceTemplates:{list:()=>L("/api/invoice-templates"),create:(e,n)=>L("/api/invoice-templates",{method:"POST",body:JSON.stringify({name:e,body:n})}),update:(e,n)=>L(`/api/invoice-templates/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/invoice-templates/${e}`,{method:"DELETE"})},setPaid:(e,n,t)=>L(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:t})}),storno:(e,n)=>L(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>L(`/api/invoices/${e}/validate`,{method:"POST"}),asTemplate:(e,n)=>L(`/api/invoices/${e}/as-template`,{method:"POST",body:JSON.stringify({name:n})}),rerender:(e,n)=>L(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:n})}),renders:e=>L(`/api/invoices/${e}/renders`),validationReports:e=>L(`/api/invoices/${e}/validation`),validationReportUrl:(e,n)=>`/api/invoices/${e}/validation/${n}.json`,pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>L("/api/company-profiles"),getDefault:()=>L("/api/company-profiles/default"),create:(e,n)=>L("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>L(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:e=>L(`/api/customers${e?`?q=${encodeURIComponent(e)}`:""}`),create:(e,n)=>L("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>L(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>L("/api/customers/number-assign",{method:"POST"})},products:{list:()=>L("/api/products"),create:e=>L("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>L(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${n?`?${n}`:""}`},csvUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.csv${n?`?${n}`:""}`},datevUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.datev${n?`?${n}`:""}`},restorePreview:(e,n)=>L("/api/restore/preview",{method:"POST",body:JSON.stringify({filename:e,dataBase64:n})})};function s(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function q(e){return`${Number(e).toFixed(2)} EUR`}function U(e){return e.split("/").pop()??e}async function _(e){let n;try{n=await y.restorePreview(e.filename,e.dataBase64)}catch(a){return alert(`Backup kann nicht gelesen werden: ${a.message}`),!1}const t=n.overwritten.length;return window.confirm([`Vorschau für ${e.filename?U(e.filename):"der hochgeladenen Datei"}:`,"",`  Im Backup:   ${n.invoices} Rechnungen (davon ${n.issued} ausgestellt)`,`  Aktuell:     ${n.currentInvoices} Rechnungen`,`  Dateien:     ${n.filesWritten}`,`  Neu dazu:    ${n.added.length} Nummern`,`  Überschrieben: ${t} Nummern ${t?`(${n.overwritten.slice(0,5).join(", ")}${n.overwritten.length>5?" …":""})`:""}`,"",t>0?"ACHTUNG: Rechnungen, die nur hier existieren, gehen unwiederbringlich verloren.":"Die aktuelle Datenbank wird durch das Backup ersetzt.","","Trotzdem wiederherstellen?"].join(`
`))}async function be(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],t="",a=!1;async function h(){const f=await D("/api/backups");if(!f.ok)throw new Error("Backups konnten nicht geladen werden");n=await f.json(),d()}function d(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(f=>`<div class="row" style="margin-top:8px">
				<strong>${s(U(f.filename))}</strong>
				<span class="muted">${s(f.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(f.size/1024)} KB</span>
				<button class="secondary" data-dl="${s(f.filename)}">Download</button>
				<button class="secondary" data-restore="${s(f.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const f=await D("/api/backups",{method:"POST"});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const g=await f.json();t=`Gesichert: ${U(g.filename)}`,a=!1,await h()}catch(f){t=f.message,a=!0,d()}}),e.querySelectorAll("[data-dl]").forEach(f=>f.addEventListener("click",async()=>{const g=f.dataset.dl??"";try{await j(`/api/backups/file/${U(g)}`,U(g))}catch(b){t=b.message,a=!0,d()}})),e.querySelectorAll("[data-restore]").forEach(f=>f.addEventListener("click",async()=>{const g=f.dataset.restore??"";if(await _({filename:g}))try{const b=await D("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:g})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const w=await b.json();t=`Wiederhergestellt: ${w.invoices} Rechnungen, ${w.templates} Vorlagen${w.fileErrors.length>0?` (${w.fileErrors.length} Dateifehler)`:""}`,a=!1,await h()}catch(b){t=b.message,a=!0,d()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const f=e.querySelector("#b-file")?.files?.[0];if(!f){t="Bitte zuerst eine ZIP-Datei wählen",a=!0,d();return}let g;try{g=await new Promise((b,w)=>{const S=new FileReader;S.onload=()=>b(String(S.result).split(",")[1]),S.onerror=()=>w(new Error("Datei nicht lesbar")),S.readAsDataURL(f)})}catch(b){t=b.message,a=!0,d();return}if(await _({dataBase64:g}))try{const b=await D("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:g})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const w=await b.json();t=`Wiederhergestellt: ${w.invoices} Rechnungen, ${w.templates} Vorlagen`,a=!1,await h()}catch(b){t=b.message,a=!0,d()}})}try{await h()}catch(f){e.innerHTML=`<div class="card error">${s(f.message)}</div>`}}const X=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,n,t){const a=e[n],h=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(h)}" /></label>`}async function ye(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,t="",a=!1;try{n=await y.company.getDefault(),n||(n=(await y.company.list())[0]??null)}catch(d){e.innerHTML=`<div class="card error">${s(d.message)}</div>`;return}function h(){const d=n?.profile??X();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${s(n?.name??"Meine Firma")}" /></label>
			${x(d,"name","Firmenname")}
			${x(d,"street","Straße")}
			<div class="grid2">${x(d,"zip","PLZ")}${x(d,"city","Ort")}</div>
			<div class="grid2">${x(d,"country","Land")}${x(d,"email","E-Mail")}</div>
			<div class="grid2">${x(d,"phone","Telefon")}${x(d,"website","Webseite")}</div>
			<div class="grid2">${x(d,"vatId","USt-IdNr.")}${x(d,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${x(d,"bankName","Bankname")}${x(d,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${s(d.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(f=>`<div class="grid2"><label>Box ${f+1}<textarea data-fbox="${f}" rows="3">${s((d.footerBoxes??[])[f]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${f}">
					${["left","center","right"].map(g=>`<option value="${g}" ${(d.footerAlign??[])[f]===g||!(d.footerAlign??[])[f]&&g==="left"?"selected":""}>${g==="left"?"Links":g==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const f={...X()};e.querySelectorAll("input[data-f]").forEach(w=>{f[w.dataset.f]=w.value});const g=[0,1,2,3].map(w=>e.querySelector(`textarea[data-fbox="${w}"]`)?.value??"");g.some(w=>w.trim()!=="")?(f.footerBoxes=g,f.footerAlign=[0,1,2,3].map(w=>{const S=e.querySelector(`select[data-falign="${w}"]`)?.value;return S==="center"||S==="right"?S:"left"})):(delete f.footerBoxes,delete f.footerAlign);const b=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await y.company.update(n.id,{name:b,profile:f}):n=await y.company.create(b,f),t="Gespeichert.",a=!1,h()}catch(w){t=w.message,a=!0,h()}})}h()}const Y=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),ge=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function $e(e,n){const t=Number(e.replace(/\D+/g,"")),a=Number(n.replace(/\D+/g,"")),h=/\d/.test(e)&&Number.isFinite(t),d=/\d/.test(n)&&Number.isFinite(a);return h&&d&&t!==a?t-a:e.localeCompare(n,"de")}function we(e,n){const t=n.endsWith("desc")?-1:1,a=[...e];return a.sort((h,d)=>n.startsWith("number")?$e(h.profile.customerNumber?.trim()??"",d.profile.customerNumber?.trim()??"")*t:h.name.localeCompare(d.name,"de")*t),a}function B(e,n,t){const a=e[n],h=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(h)}" /></label>`}async function ke(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],t=null,a=!1,h="",d=!1,f="name-asc",g="";async function b(){n=await y.customers.list(g||void 0),S()}function w(c,r){return`
		<label>Name (Anzeige)<input id="k-name" value="${s(r)}" /></label>
		${B(c,"name","Firmenname")}
		${B(c,"street","Straße")}
		<div class="grid2">${B(c,"zip","PLZ")}${B(c,"city","Ort")}</div>
		<div class="grid2">${B(c,"country","Land")}${B(c,"email","E-Mail")}</div>
		<div class="grid2">${B(c,"phone","Telefon")}${B(c,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${s(c.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function S(){const c=n.filter(p=>!p.profile.customerNumber?.trim()).length,r=we(n,f);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<input id="k-q" placeholder="Suche (Name, Nummer, Ort)…" value="${s(g)}" style="max-width:240px" />
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${ge.map(p=>`<option value="${p.value}" ${p.value===f?"selected":""}>${p.label}</option>`).join("")}
			</select></label>
			${c>0?`<button class="secondary" id="k-number">${c} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${r.map(p=>`<div class="row" style="margin-top:8px">
				<strong>${s(p.name)}</strong>
				${p.profile.customerNumber?.trim()?`<span class="badge">${s(p.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${s(p.profile.city||"")}</span>
				<button class="secondary" data-edit="${p.id}">Bearbeiten</button>
				<button class="danger" data-del="${p.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${r.length} Kunden</p>
		</div>
		${t||a?`<div class="card"><h3>${a?"Neuer Kunde":s(t?.name??"")}</h3>
			${w(t?.profile??Y(),t?.name??"")}
			${h?`<p class="${d?"error":""}">${s(h)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",p=>{f=p.target.value,S()});let o;e.querySelector("#k-q")?.addEventListener("input",p=>{g=p.target.value,o!==void 0&&clearTimeout(o),o=setTimeout(()=>{b()},250)}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{h=`${await y.customers.assignNumbers()} Kundennummer(n) vergeben.`,d=!1,await b()}catch(p){h=p.message,d=!0,S()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,a=!0,h="",S()}),e.querySelectorAll("[data-edit]").forEach(p=>p.addEventListener("click",()=>{t=n.find(T=>T.id===p.dataset.edit)??null,a=!1,h="",S()})),e.querySelectorAll("[data-del]").forEach(p=>p.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await y.customers.remove(p.dataset.del??""),await b()}catch(T){h=T.message,d=!0,S()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,a=!1,h="",S()}),e.querySelector("#k-save")?.addEventListener("click",()=>{l()})}async function l(){const c={...Y()};e.querySelectorAll("input[data-f]").forEach(o=>{c[o.dataset.f]=o.value});const r=e.querySelector("#k-name")?.value.trim()||c.name.trim()||"Kunde";try{a?await y.customers.create(r,c):t&&await y.customers.update(t.id,{name:r,profile:c}),t=null,a=!1,h="",await b()}catch(o){h=o.message,d=!0,S()}}try{await b()}catch(c){e.innerHTML=`<div class="card error">${s(c.message)}</div>`}}function Se(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function Te(e){return`<span class="badge ${e}">${e}</span>`}async function Ee(e){e.innerHTML=`
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
		<div id="list"></div>`;const n=e.querySelector("#f-status"),t=e.querySelector("#f-q"),a=e.querySelector("#f-sort"),h=e.querySelector("#f-order"),d=e.querySelector("#f-sent"),f=e.querySelector("#reminders");let g="desc",b=[];const w=e.querySelector("#list"),S=e.querySelector("#list-err");let l=0;function c(i){S.innerHTML=`<div class="card error">${s(i.message)}</div>`}async function r(i){const v=i.dataset.paid??"",u=i.checked;i.disabled=!0;try{await y.setPaid(v,u),S.innerHTML=`<div class="card muted">${u?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await o()}catch($){i.checked=!u,c($)}finally{i.disabled=!1}}async function o(){const i=++l,v={sort:a.value,order:g};n.value&&(v.status=n.value),t.value.trim()&&(v.q=t.value.trim()),d.value&&(v.sent=d.value);try{const u=await y.list(v);if(i!==l)return;b=u.filter(m=>m.status==="draft").map(m=>m.id);const $=e.querySelector("#f-issue-all");$.hidden=b.length===0,$.textContent=`Ausstellen (${b.length})`,w.innerHTML=u.map(m=>`<div class="card"><div class="row">
					${m.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${m.paid?`Ausgeglichen am ${s((m.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${s(m.id)}" ${m.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${s(m.number??"(Entwurf)")}</strong>${Te(m.status)}
					<span>${s(m.buyer.name||"—")}</span>
					<span>${q(m.totals.grossTotal)}</span>
					${m.skontoPercent>0&&!m.paid?`<span class="muted">${q(m.totals.grossTotal-Se(m))} bei ${s(m.skontoPercent)} % Skonto</span>`:""}
					${m.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					${m.status==="issued"?m.sentAt?`<span class="badge issued" title="Über ${s(m.sendChannel??"E-Mail")} versendet am ${s(m.sentAt.slice(0,10))}">versendet</span>`:`<button class="secondary" data-sent="${s(m.id)}" title="Als versendet markieren">nicht versendet</button>`:""}
					<a href="#/invoices/${s(m.id)}">Ansehen</a>
					${m.status==="draft"?`<a href="#/edit/${s(m.id)}">Bearbeiten</a>`:""}
					${m.status==="draft"?`<button class="secondary" data-del="${s(m.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',w.querySelectorAll("[data-paid]").forEach(m=>m.addEventListener("change",()=>{r(m)})),w.querySelectorAll("[data-sent]").forEach(m=>m.addEventListener("click",async()=>{try{await y.markSent(m.dataset.sent??"","E-Mail"),await o()}catch(k){c(k)}})),w.querySelectorAll("[data-del]").forEach(m=>m.addEventListener("click",async()=>{if(window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen."))try{await y.deleteDraft(m.dataset.del??""),S.innerHTML='<div class="card muted">Entwurf gelöscht.</div>',await o()}catch(k){c(k)}}))}catch(u){if(i!==l)return;w.innerHTML=`<div class="card error">${s(u.message)}</div>`}}n.onchange=()=>{o()},a.onchange=()=>{o()},d.onchange=()=>{o()},h.onclick=()=>{g=g==="desc"?"asc":"desc",h.textContent=g==="desc"?"↓ absteigend":"↑ aufsteigend",o()};let p;t.oninput=()=>{p!==void 0&&clearTimeout(p),p=setTimeout(()=>{o()},250)},e.querySelector("#f-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${b.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`))try{const i=await y.issueBatch(b);S.innerHTML=`<div class="card ${i.failed.length?"error":"muted"}">${i.issued.length} ausgestellt${i.failed.length?`, ${i.failed.length} fehlgeschlagen: ${s(i.failed[0].error??"")}`:""}.</div>`,await o()}catch(i){c(i)}});const T=()=>{const i={};return n.value&&(i.status=n.value),t.value.trim()&&(i.q=t.value.trim()),i};e.querySelector("#f-export")?.addEventListener("click",async()=>{try{await j(y.exportUrl(T()),"export.xlsx")}catch(i){c(i)}}),e.querySelector("#f-csv")?.addEventListener("click",async()=>{try{await j(y.csvUrl(T()),"rechnungen.csv")}catch(i){c(i)}}),e.querySelector("#f-datev")?.addEventListener("click",async()=>{try{await j(y.datevUrl(T()),"rechnungen.datev")}catch(i){c(i)}});async function P(){try{const i=await y.reminders();if(!i.length){f.innerHTML="";return}f.innerHTML=`<div class="card"><div class="row">
				<strong>Überfällig: ${i.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${i.map(v=>`<div class="card" style="flex:1">
						<strong>${s(v.invoice.number??"")}</strong> ${s(v.invoice.buyer.name)}
						<br /><span class="muted">${v.overdueDays} Tage überfällig · Stufe ${v.level}${v.skontoActive?` · Skonto ${s(v.invoice.skontoPercent)} % noch möglich bis ${s(v.invoice.skontoDueDate??"")}`:""}</span>
						<br /><a href="#/invoices/${s(v.invoice.id)}">Ansehen</a>
					</div>`).join("")}</div></div>`}catch{}}await o(),await P()}function I(e){return Math.round((e+Number.EPSILON)*100)/100}function Le(e){const n=(e??"").trim(),[t,a]=n.split(".."),h=d=>/^\d{4}-\d{2}-\d{2}$/.test(d??"")?`${d.slice(8,10)}.${d.slice(5,7)}.${d.slice(0,4)}`:d??"";return a?`${h(t)} – ${h(a)}`:h(t)}async function Pe(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let a=await y.get(n);const d=(Array.isArray(a.lines)?a.lines:[]).map(r=>{const o=Math.min(Math.max(Number(r.discountPercent)||0,0),100),p=Number(r.quantity)||0,T=Number(r.unitPriceNet)||0;return{line:r,discount:o,gross:I(p*T),net:I(p*T*(1-o/100))}}),f=d.some(r=>r.discount>0);e.innerHTML=`
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
				${f?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${d.map((r,o)=>`<tr>
					<td>${o+1}</td><td>${s(r.line.description)}${r.line.sku?` (${s(r.line.sku)})`:""}</td>
					<td class="r">${s(r.line.quantity)} ${s(r.line.unit)}</td>
					<td class="r">${q(Number(r.line.unitPriceNet))}</td>
					${f?`<td class="r">${r.discount>0?`${s(r.discount)} %`:"–"}</td><td class="r">${r.discount>0?q(I(r.gross-r.net)):"–"}</td>`:""}
					<td class="r">${s(r.line.vatRate)} %</td><td class="r"><strong>${q(r.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${q(a.totals.grossTotal)}</strong> <span class="muted">(netto ${q(a.totals.netTotal)} + USt ${q(a.totals.taxTotal)})</span></p>
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
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div><div id="d-reports"></div></div>`;const g=e.querySelector("#d-out"),b=r=>{g.innerHTML=`<p class="error">${s(r.message)}</p>`},w=e.querySelector("#d-history"),S=async()=>{if(a.status!=="draft")try{const r=await y.renders(a.id);if(!r.length){w.innerHTML="";return}w.innerHTML=`<details><summary>Neu gerendert (${r.length})</summary><ul>${r.map(o=>`<li>${s(o.createdAt.slice(0,16).replace("T"," "))} – ${s(o.artifact.toUpperCase())}${o.reason?` – ${s(o.reason)}`:""}${o.previousPath?` – Original: <code>${s(o.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await S();const l=e.querySelector("#d-reports"),c=async()=>{try{const r=await y.validationReports(a.id);if(!r.length){l.innerHTML="";return}l.innerHTML=`<details><summary>Validierungsberichte (${r.length})</summary><ul>${r.map(o=>`<li>${s(o.createdAt.slice(0,16).replace("T"," "))} – Bericht ${o.seq}: ${o.formatErrors+o.businessErrors===0?'<span style="color:var(--ok)">keine Fehler</span>':`${o.formatErrors} Format-, ${o.businessErrors} Fachfehler`} – <a href="#" data-report="${o.seq}">herunterladen</a></li>`).join("")}</ul></details>`,l.querySelectorAll("[data-report]").forEach(o=>o.addEventListener("click",async p=>{p.preventDefault();const T=Number(o.dataset.report);try{await j(y.validationReportUrl(a.id,T),`validation-${T}.json`)}catch(P){b(P)}}))}catch{}};await c(),e.querySelectorAll("[data-dl]").forEach(r=>r.addEventListener("click",async()=>{const o=r.dataset.dl,p=o==="pdf"?y.pdfUrl(a.id):o==="xml"?y.xmlUrl(a.id):y.xlsxUrl(a.id);try{await j(p,`${a.number??"rechnung"}.${o}`)}catch(T){b(T)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await fe(y.pdfUrl(a.id))}catch(r){b(r)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{g.innerHTML='<p class="muted">Validiere…</p>';try{const r=await y.validate(a.id),o=r.report,p=[...r.formatErrors,...r.businessErrors],T=o?`<p class="muted">Bericht gespeichert: <code>${s(o.path.split("/").pop()??"")}</code> – <a href="#" id="d-report-last">herunterladen</a></p>`:'<p class="muted">Hinweis: der Bericht konnte nicht gespeichert werden (Adapter-Log).</p>';g.innerHTML=(p.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${p.map(P=>`<li class="error">${s(P)}</li>`).join("")}</ul>`)+T,o&&g.querySelector("#d-report-last")?.addEventListener("click",async P=>{P.preventDefault();try{await j(y.validationReportUrl(a.id,o.seq),`validation-${o.seq}.json`)}catch(i){b(i)}}),await c()}catch(r){g.innerHTML=`<p class="error">${s(r.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async r=>{const o=r.target,p=o.checked;o.disabled=!0;try{a=await y.setPaid(a.id,p),g.innerHTML=`<p style="color:var(--ok)">${p?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(T){o.checked=!p,g.innerHTML=`<p class="error">${s(T.message)}</p>`}finally{o.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const r=(a.buyer.email??"").trim(),o=`${a.documentTitle??"Rechnung"} ${a.number??""}`.trim(),p=`Guten Tag ${a.buyer.name||""},

anbei erhalten Sie ${o} vom ${a.issueDate}.
Gesamtbetrag: ${q(a.totals.grossTotal)}.
${a.dueDate?`Bitte überweisen bis ${a.dueDate}.
`:""}
Mit freundlichen Grüßen
${a.seller.name}
`;try{await j(y.pdfUrl(a.id),`${a.number??"rechnung"}.pdf`)}catch(P){b(P);return}const T=`mailto:${r}?subject=${encodeURIComponent(o)}&body=${encodeURIComponent(p)}`;window.location.href=T,g.innerHTML=r?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${s(r)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-sent")?.addEventListener("click",async()=>{try{a=await y.markSent(a.id,"E-Mail"),g.innerHTML=`<p style="color:var(--ok)">Als versendet markiert${a.sentAt?` (${s(a.sentAt.slice(0,10))})`:""}.</p>`,e.querySelector("#d-sent")?.remove()}catch(r){b(r)}}),e.querySelector("#d-as-tpl")?.addEventListener("click",async()=>{const r=`${a.buyer.name||"Rechnung"} ${new Date().getFullYear()}`,o=window.prompt("Name der Vorlage:",r);if(!(!o||!o.trim()))try{const p=await y.asTemplate(a.id,o.trim());g.innerHTML=`<p style="color:var(--ok)">Vorlage „${s(p.name)}" angelegt –
					<a href="#/invoice-templates">jetzt bearbeiten</a>.</p>`}catch(p){b(p)}}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const r=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(r!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?")){g.innerHTML='<p class="muted">Rendere neu…</p>';try{const o=await y.rerender(a.id,r.trim()||void 0);a=o.invoice,g.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${o.archivedPath?` Das Original liegt als <code>${s(o.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await S();const p=e.querySelector("#d-duty");if(a.status!=="draft"&&!a.paid)try{const{duty:T,checked:P}=await y.paymentCheck(a.id);T.required&&!P?(p.innerHTML=`<p class="error">${s(T.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`,e.querySelector("#d-duty-ok")?.addEventListener("click",async()=>{try{await y.paymentCheck(a.id,"geprüft"),p.innerHTML='<p style="color:var(--ok)">Zahlungsweise geprüft.</p>'}catch(i){b(i)}})):P&&(p.innerHTML=`<p class="muted">Zahlungsweise geprüft${a.paymentCheckedAt?` am ${s(a.paymentCheckedAt.slice(0,10))}`:""}.</p>`)}catch{}}catch(o){g.innerHTML=`<p class="error">${s(o.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const r=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(r!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:o}=await y.storno(a.id,r.trim()||void 0);location.hash=`#/edit/${o.id}`,location.reload()}catch(o){g.innerHTML=`<p class="error">${s(o.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const r=await y.issue(a.id);location.hash=`#/invoices/${r.id}`,location.reload()}catch(r){g.innerHTML=`<p class="error">${s(r.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${s(t.message)}</div>`}}function Q(e){return{lines:(Array.isArray(e.lines)?e.lines:[]).filter(t=>t&&typeof t.description=="string"&&t.description.trim()!==""),paymentTerms:typeof e.paymentTerms=="string"?e.paymentTerms:"",skontoPercent:Number(e.skontoPercent)||0,notes:typeof e.notes=="string"?e.notes:""}}function ee(e){return e.reduce((n,t)=>{const a=Math.min(Math.max(Number(t.discountPercent)||0,0),100),h=(Number(t.quantity)||0)*(Number(t.unitPriceNet)||0);return n+h*(1-a/100)},0)}function Ne(e,n,t){return`<div class="card line" style="background:var(--bg)">
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
	</div>`}const qe=[19,7,0];async function De(e){e.innerHTML='<div class="card">Lade Rechnungsvorlagen…</div>';let n=[],t=[],a=null,h=!1,d=[],f="",g=0,b="",w="",S=!1;async function l(){n=await y.invoiceTemplates.list(),T()}async function c(){try{t=await y.products.list(),h&&T()}catch{t=[]}}function r(P){a=P,h=!0;const i=Q(P?.body??{});d=i.lines.length?i.lines.map(v=>({...v})):[o()],f=i.paymentTerms,g=i.skontoPercent,b=i.notes,w="",S=!1,T()}function o(){return{description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}}function p(){return d.map((P,i)=>{const v=(u,$)=>{const m=e.querySelector(`[data-tpl-line="${i}.${u}"]`);return m?m.value:$};return{description:String(v("description",P.description)),sku:String(v("sku","")),quantity:Number(v("quantity",P.quantity))||0,unit:String(v("unit",P.unit)),unitPriceNet:Number(v("unitPriceNet",P.unitPriceNet))||0,vatRate:Number(v("vatRate",P.vatRate))||0}})}function T(){const P=ee(p());e.innerHTML=`
		<div class="card"><div class="row"><strong>Rechnungsvorlagen</strong>
			<button id="t-new">+ Neue Vorlage</button>
			${w?`<span class="${S?"error":"muted"}">${s(w)}</span>`:""}</div>
			<p class="muted">Wiederkehrende Rechnungen (Wartung, Honorar, Abo) einmal anlegen und im Assistenten
				übernehmen. Käufer und Datum werden bewusst nicht gespeichert.</p>
			${n.map(i=>{const v=Q(i.body);return`<div class="row" style="margin-top:8px">
						<strong>${s(i.name)}</strong>
						<span class="muted">${v.lines.length} Position(en) · ${q(ee(v.lines))}${v.skontoPercent?` · ${v.skontoPercent} % Skonto`:""}</span>
						<button class="secondary" data-tpl-edit="${s(i.id)}">Bearbeiten</button>
						<button class="danger" data-tpl-del="${s(i.id)}">Löschen</button>
					</div>`}).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${h?`<div class="card"><h3>${a?s(a.name):"Neue Vorlage"}</h3>
					<label>Name<input id="t-name" value="${s(a?.name??"")}" placeholder="z. B. Monatliche Wartung" /></label>
					<label>Zahlungsbedingungen<input id="t-terms" value="${s(f)}" placeholder="Zahlbar innerhalb von 14 Tagen" /></label>
					<div class="grid2">
						<label>Skonto %<input id="t-skonto" type="number" min="0" max="20" step="0.5" value="${s(g)}" /></label>
						<label>&nbsp;</label>
					</div>
					<label>Notiz<textarea id="t-notes" rows="2">${s(b)}</textarea></label>
					<p class="muted">Summe netto: <strong>${q(P)}</strong></p>
					${t.length>0?`<div class="row">
								<label style="flex:1">Aus dem Positionskatalog übernehmen<select id="t-catalog">
									<option value="">– Position wählen –</option>
									${t.map(i=>`<option value="${s(i.id)}">${s(i.sku?`${i.sku} · `:"")}${s(i.name)} · ${q(i.unitPriceNet)}</option>`).join("")}
								</select></label>
								<button class="secondary" id="t-take" style="align-self:end">Position hinzufügen</button>
							</div>`:'<p class="muted">Unter <a href="#/products">Positionen</a> kannst du den Katalog pflegen.</p>'}
					${d.map((i,v)=>Ne(i,v,qe)).join("")}
					<button class="secondary" id="t-add-line">+ Leere Position</button>
					<p><button id="t-save">Speichern</button>
					<button class="secondary" id="t-cancel">Abbrechen</button></p>
				</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",()=>r(null)),e.querySelectorAll("[data-tpl-edit]").forEach(i=>i.addEventListener("click",()=>{const v=n.find(u=>u.id===i.dataset.tplEdit);v&&r(v)})),e.querySelectorAll("[data-tpl-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Vorlage löschen? Bereits ausgestellte Rechnungen bleiben unverändert."))try{await y.invoiceTemplates.remove(i.dataset.tplDel??""),w="Vorlage gelöscht.",S=!1,await l()}catch(v){w=v.message,S=!0,T()}})),e.querySelectorAll("[data-tpl-del-line]").forEach(i=>i.addEventListener("click",()=>{const v=Number(i.dataset.tplDelLine);d.splice(v,1),d.length===0&&d.push(o()),T()})),e.querySelector("#t-take")?.addEventListener("click",()=>{d=p();const i=e.querySelector("#t-catalog")?.value??"",v=t.find(u=>u.id===i);v&&(d.push({description:v.name,sku:v.sku||void 0,details:v.details||void 0,quantity:1,unit:v.unit,unitPriceNet:v.unitPriceNet,vatRate:v.vatRate}),T())}),e.querySelector("#t-add-line")?.addEventListener("click",()=>{d=p(),d.push(o()),T()}),e.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,h=!1,T()}),e.querySelector("#t-save")?.addEventListener("click",async()=>{const i=e.querySelector("#t-name")?.value.trim()??"";if(!i){w="Bitte einen Namen vergeben.",S=!0,T();return}const v=p().filter($=>$.description.trim()!=="");if(v.length===0){w="Mindestens eine Position mit Bezeichnung nötig.",S=!0,T();return}const u={lines:v,paymentTerms:e.querySelector("#t-terms")?.value??"",skontoPercent:Number(e.querySelector("#t-skonto")?.value)||0,notes:e.querySelector("#t-notes")?.value??""};try{a?.id?await y.invoiceTemplates.update(a.id,{name:i,body:u}):await y.invoiceTemplates.create(i,u),w=`Gespeichert: ${i}`,S=!1,a=null,h=!1,await l()}catch($){w=$.message,S=!0,T()}})}try{await l(),c()}catch(P){e.innerHTML=`<div class="card error">${s(P.message)}</div>`}}function Ae(e){const n=G();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${s(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";J(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{J(null),location.hash="#/login",location.reload()})}function xe(){J(null),location.hash="#/login"}async function Re(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],t=null,a=!1,h="",d=!1;async function f(){n=await y.products.list(),b()}function g(l){const c=r=>s(r??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${c(l.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${c(l.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${c(l.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${c(l.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${l.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(r=>`<option ${r===(l.vatRate??19)?"selected":""}>${r}</option>`).join("")}
		</select></label>`}function b(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${n.map(l=>`<div class="row" style="margin-top:8px">
				<strong>${s(l.sku?`${l.sku} · `:"")}${s(l.name)}</strong>
				<span class="muted">${s(l.unit)} · ${Number(l.unitPriceNet).toFixed(2)} EUR · ${l.vatRate} %</span>
				<button class="secondary" data-edit="${l.id}">Bearbeiten</button>
				<button class="danger" data-del="${l.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||a?`<div class="card"><h3>${a?"Neue Position":s(t?.name??"")}</h3>
			${g(t??{})}
			${h?`<p class="${d?"error":""}">${s(h)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,a=!0,h="",b()}),e.querySelectorAll("[data-edit]").forEach(l=>l.addEventListener("click",()=>{t=n.find(c=>c.id===l.dataset.edit)??null,a=!1,h="",b()})),e.querySelectorAll("[data-del]").forEach(l=>l.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await y.products.remove(l.dataset.del??""),await f()}catch(c){h=c.message,d=!0,b()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,a=!1,h="",b()}),e.querySelector("#p-save")?.addEventListener("click",()=>{S()})}function w(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function S(){const l=w();try{a?await y.products.create(l):t&&await y.products.update(t.id,l),t=null,a=!1,h="",await f()}catch(c){h=c.message,d=!0,b()}}try{await f()}catch(l){e.innerHTML=`<div class="card error">${s(l.message)}</div>`}}async function Me(e){try{const n=await y.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(n.version)} · Schema: ${s(String(n.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(n.message)}</div>`}}const Oe=["title","meta","parties","positions","totals"],te=["payment","notes"],Be=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function je(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],t=null,a="",h=[];try{const l=await D("/api/company-profiles");l.ok&&(h=await l.json())}catch{}async function d(){n=await f(),b()}async function f(){const l=await D("/api/templates");if(!l.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await l.json()}function g(l){const c=l.definition,r=(o,p,T)=>`<label><input type="checkbox" data-f="blocks.${o}" ${c.blocks[o]?"checked":""} ${T?"disabled":""} style="width:auto" /> ${p}${T?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(l.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${h.map(o=>`<option value="${s(o.id)}" ${l.definition.companyId===o.id?"selected":""}>${s(o.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${s(c.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${s(c.colors.text)}" /></label>
		</div>
		<label class="pay" title="Aus: das Dokument bleibt schwarz/weiß, die Primärfarbe wird nirgends verwendet">
			<input type="checkbox" data-f="usePrimaryColor" ${c.usePrimaryColor!==!1?"checked":""} /><span>Primärfarbe verwenden</span>
		</label>
		<label class="pay" title="Ohne Haken: der Titel wird in der Textfarbe gesetzt">
			<input type="checkbox" data-f="titleAccent" ${c.titleAccent!==!1?"checked":""} /><span>Rechnungstitel in Akzentfarbe</span>
		</label>
		<label class="pay" title="Ohne Haken: nur die linke Hälfte der Kopfzeile ist eingefärbt, die rechte bleibt grau">
			<input type="checkbox" data-f="tableHeaderAccent" ${c.tableHeaderAccent===!0?"checked":""} /><span>Tabellenkopf komplett in Akzentfarbe</span>
		</label>
		${Oe.map(o=>r(o,`Block ${o}`,!0)).join("")}
		${te.map(o=>r(o,`Block ${o}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${c.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${c.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${c.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${c.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${c.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${c.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${c.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${s(c.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${s(c.closingText??"")}</textarea></label>
		<div class="grid2">
			<label title="Leer lassen: es wird kein Name gedruckt">Unterschrift (Name, optional)<input id="t-sign" value="${s(c.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${s(c.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${s(c.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${Be.map(o=>`<option value="${o.value}" ${c.logo?.position===o.value?"selected":""}>${o.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${c.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${c.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${c.logo?`<p class="muted">Aktuell: ${s(c.logo.path)}</p>`:""}`}function b(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Druckvorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			<p class="muted">Aussehen der PDF-Rechnung: Logo, Farben, Kopf- und Fußzeilen. Die inhaltlichen
				Positionen legst du unter <a href="#/invoice-templates">Rechnungsvorlagen</a> oder
				<a href="#/products">Positionen</a> fest.</p>
			${n.map(l=>`<div class="row" style="margin-top:8px">
				<strong>${s(l.name)}</strong><span class="muted">v${l.version}</span>
				${l.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${l.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${l.id}">Vorschau</button>
				${l.isDefault?"":`<button class="secondary" data-def="${l.id}">Standard</button>`}
				${l.isDefault?"":`<button class="danger" data-del="${l.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${s(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${g(t)}
			${a?`<p class="error">${s(a)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const r=(await(await D("/api/templates")).json())[0];if(!r){a="Keine Basisvorlage vorhanden",b();return}t={...structuredClone(r),id:"neu",name:"Neu",version:1,isDefault:!1},a="",b()}catch(l){a=l.message,b()}}),e.querySelectorAll("[data-edit]").forEach(l=>l.addEventListener("click",()=>{const c=n.find(r=>r.id===l.dataset.edit);c&&(t=structuredClone(c),a="",b())})),e.querySelectorAll("[data-prev]").forEach(l=>l.addEventListener("click",async()=>{const c=n.find(r=>r.id===l.dataset.prev);if(c)try{const r=await D("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:c.definition})});if(!r.ok){const p=await r.json().catch(()=>({}));throw new Error(p.error??"Vorschau fehlgeschlagen")}const o=await r.blob();window.open(URL.createObjectURL(o),"_blank")}catch(r){a=r.message,b()}})),e.querySelectorAll("[data-def]").forEach(l=>l.addEventListener("click",async()=>{try{if(!(await D(`/api/templates/${l.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await d()}catch(c){a=c.message,b()}})),e.querySelectorAll("[data-del]").forEach(l=>l.addEventListener("click",async()=>{const c=await D(`/api/templates/${l.dataset.del}`,{method:"DELETE"});if(!c.ok){a=(await c.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",b();return}await d()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,a="",b()}),e.querySelector("#t-save")?.addEventListener("click",()=>{S()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const l=w();if(l)try{const c=await D("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:l.definition})});if(!c.ok){const r=await c.json().catch(()=>({}));throw new Error(r.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await c.blob()),"_blank")}catch(c){a=c.message,b()}})}function w(){if(!t)return null;const l=structuredClone(t.definition);l.name=(e.querySelector("#t-name")?.value??l.name).trim(),l.colors.primary=e.querySelector("#t-c1")?.value??l.colors.primary,l.colors.text=e.querySelector("#t-c2")?.value??l.colors.text;for(const r of te)l.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??l.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])l[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;for(const r of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const o=e.querySelector(`[data-f="${r}"]`);o&&(l[r]=o.checked)}l.footerText=e.querySelector("#t-footer")?.value??"";const c=e.querySelector("#t-company")?.value??"";return c?l.companyId=c:delete l.companyId,l.introText=e.querySelector("#t-intro")?.value??"",l.closingText=e.querySelector("#t-closing")?.value??"",l.signatureName=e.querySelector("#t-sign")?.value??"",l.headerExtra=e.querySelector("#t-hextra")?.value??"",l.logo&&(l.logo.position=e.querySelector("#t-lpos")?.value??"right",l.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),l.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:l.name,definition:l}}async function S(){const l=w();if(!l)return;const c=l.definition;try{let r=t.id;if(r==="neu"){const p=await D("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:c.name,definition:c})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await p.json()).id}else{const p=await D(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:c.name,definition:c})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const o=e.querySelector("#t-logo")?.files?.[0];if(o){const p=await new Promise((P,i)=>{const v=new FileReader;v.onload=()=>P(String(v.result).split(",")[1]),v.onerror=()=>i(new Error("Datei nicht lesbar")),v.readAsDataURL(o)}),T=await D(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:o.name,mime:o.type,dataBase64:p})});if(!T.ok)throw new Error((await T.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,a="",await d()}catch(r){a=r.message,b()}}try{await d()}catch(l){e.innerHTML=`<div class="card error">${s(l.message)}</div>`}}const ne=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),F=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:C.defaultVatRate});let C={defaultVatRate:19,defaultPaymentTerms:""};const W=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],ae="__own__";function ce(e,n){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+n),t.toISOString().slice(0,10)}function de(e){return!!e&&!ue(e)}function ue(e){return!!e&&W.some(n=>n.text===e)}function me(e){return W.find(n=>n.text===e)?.days??null}function se(e){if(!e.dueAuto)return;const n=me(e.paymentTerms);n!==null&&(e.dueDate=ce(e.issueDate,n))}function O(e){return Math.round((e+Number.EPSILON)*100)/100}function ie(e){const n=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,a=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return O(n*t*(1-a/100))}function He(e){return(e??"").trim().split("..")[0]??""}function ze(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const H="einv-wizard-v1",pe="einv-employee";function he(){try{return localStorage.getItem(pe)??""}catch{return""}}function re(){return new Date().toISOString().slice(0,10)}function Z(){return{step:0,seller:ne(),buyer:ne(),lines:[F()],issueDate:re(),deliveryDate:re(),dueDate:"",employee:he(),documentTitle:"Rechnung",notes:"",paymentTerms:C.defaultPaymentTerms,termsCustom:de(C.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function K(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function Ue(){try{const e=localStorage.getItem(H);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{...Z(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function le(e,n,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${s(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Fe=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Ce={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function oe(e,n){let t=Z();const a=!!n;let h=[],d=[],f=[],g=[],b=!1,w=!1;if(y.settings().then(i=>{C={defaultVatRate:Number(i.defaultVatRate)||19,defaultPaymentTerms:i.defaultPaymentTerms??""}}).catch(()=>{}),n){e.innerHTML='<div class="card">Lade Entwurf…</div>',y.get(n).then(i=>{if(i.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${s(i.status)}).</div>`;return}t={...Z(),seller:i.seller,buyer:i.buyer,lines:i.lines.length>0?i.lines:[F()],issueDate:i.issueDate,deliveryDate:i.deliveryDate,dueDate:i.dueDate??"",employee:i.employeeCode??he(),documentTitle:i.documentTitle,notes:i.notes??"",paymentTerms:i.paymentTerms??C.defaultPaymentTerms,termsCustom:de(i.paymentTerms),skontoPercent:i.skontoPercent??0,skontoDueDate:i.skontoDueDate??"",draftId:i.id},l(),p()}).catch(i=>{e.innerHTML=`<div class="card error">${s(i.message)}</div>`});return}const S=Ue();if(S&&K(S)&&!S.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${s(S.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=S,l(),p()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(H),l(),p()});return}S&&K(S)&&(t=S),l(),K(t)||y.company.getDefault().then(i=>{i&&!t.seller.name.trim()&&i.profile.name.trim()&&(t.seller={...t.seller,...i.profile},t.selectedCompany=i.id,p(!0))}).catch(()=>{});function l(){if(w)return;w=!0;const i=(v,u)=>{u(),e.querySelector(v)||p(!0)};y.company.list().then(v=>i("#w-company",()=>h=v)).catch(()=>{}),y.customers.list().then(v=>i("#w-customer",()=>d=v)).catch(()=>{}),y.products.list().then(v=>i("#w-catalog",()=>f=v)).catch(()=>{}),y.invoiceTemplates.list().then(v=>i("#w-inv-tpl",()=>g=v)).catch(()=>{})}function c(){try{if(a)return;if(!t.dirty){localStorage.removeItem(H);return}localStorage.setItem(H,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function r(){e.querySelectorAll("input[data-p]").forEach(m=>{const k=m.dataset.p==="seller"?t.seller:t.buyer;k[m.dataset.f]=m.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(m=>{const[k,N]=m.dataset.l.split("."),A=t.lines[Number(k)];if(A)if(N==="quantity"||N==="unitPriceNet"||N==="vatRate"||N==="discountPercent"){const M=Number(m.value),z=Number.isFinite(M)?M:0;A[N]=N==="discountPercent"?Math.min(Math.max(z,0),100):z}else A[N]=m.value});const i=m=>e.querySelector(`#${m}`)?.value??"",v=()=>{const m=i("w-delivery");if(!m)return;const k=i("w-delivery-to");t.deliveryDate=k&&k!==m?`${m}..${k}`:m};t.issueDate=i("w-issue")||t.issueDate,v(),e.querySelector("#w-due")&&(t.dueDate=i("w-due")),se(t),e.querySelector("#w-employee")&&(t.employee=i("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=i("w-title")||t.documentTitle);const u=e.querySelector("#w-notes");u&&(t.notes=u.value);const $=e.querySelector("#w-terms");if($&&(t.paymentTerms=$.value),e.querySelector("#w-skonto")){const m=Number(i("w-skonto"));t.skontoPercent=Number.isFinite(m)?Math.min(Math.max(m,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=i("w-skonto-due")),c()}function o(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((v,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${v}</span>`).join("")}</div>`}function p(i=!1){i||r();let v="";if(t.step===0&&(v=`<div class="card"><h3>Verkäufer</h3>
				${h.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${h.map(u=>`<option value="${s(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${s(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${le("seller",t.seller,!0)}</div>`),t.step===1&&(v=`<div class="card"><h3>Käufer</h3>
				${d.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${d.map(u=>`<option value="${s(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${s(u.name)}${u.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${le("buyer",t.buyer,!1)}</div>`),t.step===2&&(v=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Fe.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${g.length>0?`<label>Wiederkehrende Rechnung<select id="w-inv-tpl">
							<option value="">– eigene Positionen –</option>
							${g.map(u=>`<option value="${s(u.id)}">${s(u.name)}</option>`).join("")}
						</select></label>
						<p class="muted">Übernimmt Positionen, Termine, Zahlungsbedingungen und Skonto. Käufer und Datum bleiben deine Angaben.</p>`:'<p class="muted">Tipp: Unter <a href="#/invoice-templates">Rechnungsvorlagen</a> eine Vorlage anlegen, um wiederkehrende Rechnungen nicht jedes Mal neu einzutippen.</p>'}
				${f.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${f.map(u=>`<option value="${s(u.id)}">${s(u.sku?`${u.sku} · `:"")}${s(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,$)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${$+1}</span><strong>Position ${$+1}</strong>
						<span class="line-sum">${q(ie(u))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${$}.description" value="${s(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${$}.sku" value="${s(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${$}.details" rows="1">${s(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${$}.quantity" type="number" min="0" step="any" value="${s(u.quantity)}" /></label>
						<label>Einheit<input data-l="${$}.unit" value="${s(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${$}.unitPriceNet" type="number" min="0" step="0.01" value="${s(u.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${$}.discountPercent" type="number" min="0" max="100" step="0.1" value="${s(u.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${$}.vatRate">
							${[19,7,0].map(m=>`<option ${m===Number(u.vatRate)?"selected":""}>${m}</option>`).join("")}
						</select></label>
						${Number(u.vatRate)===0?`<label>Steuerbefreiung<select data-l="${$}.exemptionCategory">
								${["E","AE","K","G","O"].map(m=>`<option ${(u.exemptionCategory??"E")===m?"selected":""} value="${m}">${m} — ${Ce[m]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${$}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${s(u.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${$}">Position entfernen</button>
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
					${W.map(u=>`<option value="${s(u.text)}" ${!t.termsCustom&&t.paymentTerms===u.text?"selected":""}>${s(u.text)}</option>`).join("")}
					<option value="${ae}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${s(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const u=t.lines.map(E=>{const R=Math.min(Math.max(Number(E.discountPercent)||0,0),100);return{...E,discount:R,gross:O((Number(E.quantity)||0)*(Number(E.unitPriceNet)||0)),net:ie(E)}}).filter(E=>E.description.trim()!==""||E.gross>0),$=new Map;for(const E of u)$.set(Number(E.vatRate)||0,O(($.get(Number(E.vatRate)||0)??0)+E.net));const m=[...$.entries()].sort(([E],[R])=>E-R).map(([E,R])=>({rate:E,net:R,tax:O(R*E/100)})),k=O(m.reduce((E,R)=>E+R.net,0)),N=O(m.reduce((E,R)=>E+R.tax,0)),A=O(k+N),M=O(A*(Number(t.skontoPercent)||0)/100),z=u.some(E=>E.discount>0);v=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${s(t.documentTitle)}</strong> · ${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${z?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(E=>`<tr>
							<td>${s(E.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${s(E.quantity)} ${s(E.unit)}</td>
							<td class="r">${q(E.unitPriceNet)}</td>
							${z?`<td class="r">${E.discount>0?`${s(E.discount)} %`:"–"}</td><td class="r">${E.discount>0?q(O(E.gross-E.net)):"–"}</td>`:""}
							<td class="r">${s(E.vatRate)} %</td><td class="r"><strong>${q(E.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${q(k)}</td></tr>
						${m.map(E=>`<tr class="sub"><td class="lbl">USt ${s(E.rate)} % auf ${q(E.net)}</td><td class="r">${q(E.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${q(A)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${s(t.skontoPercent)} % Skonto bis ${s(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${q(M)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${q(A-M)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${o()}${v}
			${t.error?`<div class="card error">${s(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,p()}),e.querySelector("#w-terms-select")?.addEventListener("change",u=>{const $=u.target.value;if($===ae)t.termsCustom=!0,ue(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=$;const m=me($);m!==null?(t.dueAuto=!0,t.dueDate=ce(t.issueDate,m)):t.dueAuto=!1}p()}),e.querySelector("#w-due")?.addEventListener("change",()=>{r(),t.dueAuto=!1,p()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",$=h.find(m=>m.id===u);$?(t.seller={...t.seller,...$.profile},t.selectedCompany=$.id,p(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",$=d.find(m=>m.id===u);$?(t.buyer={...t.buyer,...$.profile},t.selectedCustomer=$.id,p(!0)):t.selectedCustomer=null}),e.querySelector("#w-inv-tpl")?.addEventListener("change",u=>{const $=u.target.value,m=g.find(N=>N.id===$);if(!m||t.lines.length>0&&!window.confirm(`Positionen durch "${m.name}" ersetzen?`))return;const k=m.body;Array.isArray(k.lines)&&k.lines.length>0&&(t.lines=k.lines.map(N=>({...F(),...N}))),typeof k.paymentTerms=="string"&&(t.paymentTerms=k.paymentTerms),typeof k.notes=="string"&&(t.notes=k.notes),typeof k.documentTitle=="string"&&k.documentTitle&&(t.documentTitle=k.documentTitle),typeof k.skontoPercent=="number"&&k.skontoPercent>0&&(t.skontoPercent=k.skontoPercent),typeof k.dueDate=="string"&&(t.dueDate=k.dueDate),typeof k.deliveryDate=="string"&&(t.deliveryDate=k.deliveryDate),p(!0)}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,p()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(H),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.push(F()),p()}),e.querySelector("#w-take")?.addEventListener("click",()=>{r();const u=e.querySelector("#w-catalog")?.value??"",$=f.find(m=>m.id===u);if($){const m={description:$.name,sku:$.sku||void 0,details:$.details||void 0,quantity:1,unit:$.unit,unitPriceNet:$.unitPriceNet,vatRate:$.vatRate},k=t.lines.findIndex(N=>!N.description.trim()&&!(N.sku??"").trim()&&!(N.details??"").trim()&&N.unitPriceNet===0);k>=0?t.lines[k]=m:t.lines.push(m),t.dirty=!0}p(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(F()),p(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{T(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&T(!0)})}async function T(i){if(!b){b=!0;try{r(),t.error="";const v={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(pe,t.employee.trim())}catch{}let u;t.draftId?u=await y.update(t.draftId,v):(u=await y.create(v),t.draftId=u.id),i&&(u=await y.issue(u.id));try{localStorage.removeItem(H)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,p()}}finally{b=!1}}}e.addEventListener("input",()=>{try{P()}catch{}});function P(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const N=k.dataset.p==="seller"?t.seller:t.buyer;N[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[N,A]=k.dataset.l.split("."),M=t.lines[Number(N)];M&&(A==="quantity"||A==="unitPriceNet"||A==="vatRate"||A==="discountPercent"?M[A]=Number(k.value):M[A]=k.value)});const i=k=>e.querySelector(`#${k}`)?.value??"",v=i("w-issue"),u=i("w-delivery"),$=i("w-delivery-to");v&&(t.issueDate=v),u&&(t.deliveryDate=$&&$!==u?`${u}..${$}`:u),e.querySelector("#w-due")&&(t.dueDate=i("w-due")),se(t),e.querySelector("#w-employee")&&(t.employee=i("w-employee"));const m=i("w-title");if(m&&(t.documentTitle=m),e.querySelector("#w-skonto")){const k=Number(i("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=i("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,c()}p()}const Ie=document.querySelector("#app");function Ke(e){const n=!!G(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Druckvorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/invoice-templates","Rechnungsvorlagen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];Ie.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([a,h])=>`<a href="${a}" class="${e===a||a==="#/"&&e.startsWith("#/invoices")?"active":""}">${h}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function ve(){const e=location.hash||"#/";Ke(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await Ee(n):e==="#/new"?oe(n):e.startsWith("#/edit/")?oe(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Pe(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await je(n):e==="#/company"?await ye(n):e==="#/customers"?await ke(n):e==="#/products"?await Re(n):e==="#/invoice-templates"?await De(n):e==="#/backup"?await be(n):e==="#/login"?Ae(n):e==="#/logout"?xe():e==="#/status"?await Me(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{ve()});ve();
