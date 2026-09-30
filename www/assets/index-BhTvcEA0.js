(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const m of document.querySelectorAll('link[rel="modulepreload"]'))a(m);new MutationObserver(m=>{for(const c of m)if(c.type==="childList")for(const g of c.addedNodes)g.tagName==="LINK"&&g.rel==="modulepreload"&&a(g)}).observe(document,{childList:!0,subtree:!0});function t(m){const c={};return m.integrity&&(c.integrity=m.integrity),m.referrerPolicy&&(c.referrerPolicy=m.referrerPolicy),m.crossOrigin==="use-credentials"?c.credentials="include":m.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function a(m){if(m.ep)return;m.ep=!0;const c=t(m);fetch(m.href,c)}})();const Z="einv-token";function X(){try{return localStorage.getItem(Z)}catch{return null}}function W(e){try{e?localStorage.setItem(Z,e):localStorage.removeItem(Z)}catch{}}async function E(e,n){const t=await D(e,{headers:{"content-type":"application/json"},...n});if(!t.ok){const a=await t.json().catch(()=>({}));throw new Error(a.error??`HTTP ${t.status}`)}return await t.json()}async function D(e,n){const t={...n?.headers??{}},a=X();a&&(t.authorization=`Bearer ${a}`);const m=await fetch(e,{...n,headers:t});if(m.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return m}async function B(e,n){const t=await D(e);if(!t.ok){const g=await t.json().catch(()=>({}));throw new Error(g.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const a=await t.blob(),m=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),c=document.createElement("a");c.href=URL.createObjectURL(a),c.download=m?.[1]??n,document.body.appendChild(c),c.click(),c.remove(),window.setTimeout(()=>URL.revokeObjectURL(c.href),1e4)}async function we(e){const n=await D(e);if(!n.ok){const m=await n.json().catch(()=>({}));throw new Error(m.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const t=await n.blob(),a=URL.createObjectURL(t);window.open(a,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(a),6e4)}const y={health:()=>E("/api/health"),settings:()=>E("/api/settings"),list:(e={})=>{const n=new URLSearchParams(e).toString();return E(`/api/invoices${n?`?${n}`:""}`)},get:e=>E(`/api/invoices/${e}`),create:e=>E("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>E(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>E(`/api/invoices/${e}/issue`,{method:"POST"}),issueBatch:e=>E("/api/invoices/issue-batch",{method:"POST",body:JSON.stringify({ids:e})}),deleteDraft:e=>E(`/api/invoices/${e}`,{method:"DELETE"}),markSent:(e,n)=>E(`/api/invoices/${e}/sent`,{method:"POST",body:JSON.stringify({channel:n})}),paymentCheck:(e,n)=>E(`/api/invoices/${e}/payment-check`,{method:"POST",body:JSON.stringify({outcome:n})}),reminders:()=>E("/api/reminders"),reminded:e=>E(`/api/invoices/${e}/reminded`,{method:"POST"}),invoiceTemplates:{list:()=>E("/api/invoice-templates"),create:(e,n)=>E("/api/invoice-templates",{method:"POST",body:JSON.stringify({name:e,body:n})}),update:(e,n)=>E(`/api/invoice-templates/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>E(`/api/invoice-templates/${e}`,{method:"DELETE"})},setPaid:(e,n,t)=>E(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:t})}),storno:(e,n)=>E(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>E(`/api/invoices/${e}/validate`,{method:"POST"}),asTemplate:(e,n)=>E(`/api/invoices/${e}/as-template`,{method:"POST",body:JSON.stringify({name:n})}),rerender:(e,n)=>E(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:n})}),renders:e=>E(`/api/invoices/${e}/renders`),validationReports:e=>E(`/api/invoices/${e}/validation`),validationReportUrl:(e,n)=>`/api/invoices/${e}/validation/${n}.json`,attachments:{list:e=>E(`/api/invoices/${e}/attachments`),add:(e,n)=>E(`/api/invoices/${e}/attachments`,{method:"POST",body:JSON.stringify(n)}),remove:(e,n)=>E(`/api/invoices/${e}/attachments/${n}`,{method:"DELETE"}),url:(e,n)=>`/api/invoices/${e}/attachments/${n}`},pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>E("/api/company-profiles"),getDefault:()=>E("/api/company-profiles/default"),create:(e,n)=>E("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>E(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:e=>E(`/api/customers${e?`?q=${encodeURIComponent(e)}`:""}`),create:(e,n)=>E("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>E(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>E(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>E("/api/customers/number-assign",{method:"POST"})},products:{list:()=>E("/api/products"),create:e=>E("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>E(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>E(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${n?`?${n}`:""}`},csvUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.csv${n?`?${n}`:""}`},datevUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.datev${n?`?${n}`:""}`},restorePreview:(e,n)=>E("/api/restore/preview",{method:"POST",body:JSON.stringify({filename:e,dataBase64:n})})};function s(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function q(e){return`${Number(e).toFixed(2)} EUR`}function C(e){return e.split("/").pop()??e}async function ee(e){let n;try{n=await y.restorePreview(e.filename,e.dataBase64)}catch(a){return alert(`Backup kann nicht gelesen werden: ${a.message}`),!1}const t=n.overwritten.length;return window.confirm([`Vorschau für ${e.filename?C(e.filename):"der hochgeladenen Datei"}:`,"",`  Im Backup:   ${n.invoices} Rechnungen (davon ${n.issued} ausgestellt)`,`  Aktuell:     ${n.currentInvoices} Rechnungen`,`  Dateien:     ${n.filesWritten}`,`  Neu dazu:    ${n.added.length} Nummern`,`  Überschrieben: ${t} Nummern ${t?`(${n.overwritten.slice(0,5).join(", ")}${n.overwritten.length>5?" …":""})`:""}`,"",t>0?"ACHTUNG: Rechnungen, die nur hier existieren, gehen unwiederbringlich verloren.":"Die aktuelle Datenbank wird durch das Backup ersetzt.","","Trotzdem wiederherstellen?"].join(`
`))}async function ke(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],t="",a=!1;async function m(){const g=await D("/api/backups");if(!g.ok)throw new Error("Backups konnten nicht geladen werden");n=await g.json(),c()}function c(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(g=>`<div class="row" style="margin-top:8px">
				<strong>${s(C(g.filename))}</strong>
				<span class="muted">${s(g.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(g.size/1024)} KB</span>
				<button class="secondary" data-dl="${s(g.filename)}">Download</button>
				<button class="secondary" data-restore="${s(g.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const g=await D("/api/backups",{method:"POST"});if(!g.ok)throw new Error((await g.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const w=await g.json();t=`Gesichert: ${C(w.filename)}`,a=!1,await m()}catch(g){t=g.message,a=!0,c()}}),e.querySelectorAll("[data-dl]").forEach(g=>g.addEventListener("click",async()=>{const w=g.dataset.dl??"";try{await B(`/api/backups/file/${C(w)}`,C(w))}catch(b){t=b.message,a=!0,c()}})),e.querySelectorAll("[data-restore]").forEach(g=>g.addEventListener("click",async()=>{const w=g.dataset.restore??"";if(await ee({filename:w}))try{const b=await D("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:w})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const f=await b.json();t=`Wiederhergestellt: ${f.invoices} Rechnungen, ${f.templates} Vorlagen${f.fileErrors.length>0?` (${f.fileErrors.length} Dateifehler)`:""}`,a=!1,await m()}catch(b){t=b.message,a=!0,c()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const g=e.querySelector("#b-file")?.files?.[0];if(!g){t="Bitte zuerst eine ZIP-Datei wählen",a=!0,c();return}let w;try{w=await new Promise((b,f)=>{const $=new FileReader;$.onload=()=>b(String($.result).split(",")[1]),$.onerror=()=>f(new Error("Datei nicht lesbar")),$.readAsDataURL(g)})}catch(b){t=b.message,a=!0,c();return}if(await ee({dataBase64:w}))try{const b=await D("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:w})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const f=await b.json();t=`Wiederhergestellt: ${f.invoices} Rechnungen, ${f.templates} Vorlagen`,a=!1,await m()}catch(b){t=b.message,a=!0,c()}})}try{await m()}catch(g){e.innerHTML=`<div class="card error">${s(g.message)}</div>`}}const te=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,n,t){const a=e[n],m=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(m)}" /></label>`}async function Se(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,t="",a=!1;try{n=await y.company.getDefault(),n||(n=(await y.company.list())[0]??null)}catch(c){e.innerHTML=`<div class="card error">${s(c.message)}</div>`;return}function m(){const c=n?.profile??te();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${s(n?.name??"Meine Firma")}" /></label>
			${x(c,"name","Firmenname")}
			${x(c,"street","Straße")}
			<div class="grid2">${x(c,"zip","PLZ")}${x(c,"city","Ort")}</div>
			<div class="grid2">${x(c,"country","Land")}${x(c,"email","E-Mail")}</div>
			<div class="grid2">${x(c,"phone","Telefon")}${x(c,"website","Webseite")}</div>
			<div class="grid2">${x(c,"vatId","USt-IdNr.")}${x(c,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${x(c,"bankName","Bankname")}${x(c,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${s(c.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(g=>`<div class="grid2"><label>Box ${g+1}<textarea data-fbox="${g}" rows="3">${s((c.footerBoxes??[])[g]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${g}">
					${["left","center","right"].map(w=>`<option value="${w}" ${(c.footerAlign??[])[g]===w||!(c.footerAlign??[])[g]&&w==="left"?"selected":""}>${w==="left"?"Links":w==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const g={...te()};e.querySelectorAll("input[data-f]").forEach(f=>{g[f.dataset.f]=f.value});const w=[0,1,2,3].map(f=>e.querySelector(`textarea[data-fbox="${f}"]`)?.value??"");w.some(f=>f.trim()!=="")?(g.footerBoxes=w,g.footerAlign=[0,1,2,3].map(f=>{const $=e.querySelector(`select[data-falign="${f}"]`)?.value;return $==="center"||$==="right"?$:"left"})):(delete g.footerBoxes,delete g.footerAlign);const b=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await y.company.update(n.id,{name:b,profile:g}):n=await y.company.create(b,g),t="Gespeichert.",a=!1,m()}catch(f){t=f.message,a=!0,m()}})}m()}const ne=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),Te=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function Ee(e,n){const t=Number(e.replace(/\D+/g,"")),a=Number(n.replace(/\D+/g,"")),m=/\d/.test(e)&&Number.isFinite(t),c=/\d/.test(n)&&Number.isFinite(a);return m&&c&&t!==a?t-a:e.localeCompare(n,"de")}function Le(e,n){const t=n.endsWith("desc")?-1:1,a=[...e];return a.sort((m,c)=>n.startsWith("number")?Ee(m.profile.customerNumber?.trim()??"",c.profile.customerNumber?.trim()??"")*t:m.name.localeCompare(c.name,"de")*t),a}function j(e,n,t){const a=e[n],m=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(m)}" /></label>`}async function Ne(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],t=null,a=!1,m="",c=!1,g="name-asc",w="";async function b(){n=await y.customers.list(w||void 0),$()}function f(d,r){return`
		<label>Name (Anzeige)<input id="k-name" value="${s(r)}" /></label>
		${j(d,"name","Firmenname")}
		${j(d,"street","Straße")}
		<div class="grid2">${j(d,"zip","PLZ")}${j(d,"city","Ort")}</div>
		<div class="grid2">${j(d,"country","Land")}${j(d,"email","E-Mail")}</div>
		<div class="grid2">${j(d,"phone","Telefon")}${j(d,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${s(d.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function $(){const d=n.filter(p=>!p.profile.customerNumber?.trim()).length,r=Le(n,g);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<input id="k-q" placeholder="Suche (Name, Nummer, Ort)…" value="${s(w)}" style="max-width:240px" />
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${Te.map(p=>`<option value="${p.value}" ${p.value===g?"selected":""}>${p.label}</option>`).join("")}
			</select></label>
			${d>0?`<button class="secondary" id="k-number">${d} ohne Nummer: automatisch vergeben</button>`:""}
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
			${f(t?.profile??ne(),t?.name??"")}
			${m?`<p class="${c?"error":""}">${s(m)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",p=>{g=p.target.value,$()});let o;e.querySelector("#k-q")?.addEventListener("input",p=>{w=p.target.value,o!==void 0&&clearTimeout(o),o=setTimeout(()=>{b()},250)}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{m=`${await y.customers.assignNumbers()} Kundennummer(n) vergeben.`,c=!1,await b()}catch(p){m=p.message,c=!0,$()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,a=!0,m="",$()}),e.querySelectorAll("[data-edit]").forEach(p=>p.addEventListener("click",()=>{t=n.find(S=>S.id===p.dataset.edit)??null,a=!1,m="",$()})),e.querySelectorAll("[data-del]").forEach(p=>p.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await y.customers.remove(p.dataset.del??""),await b()}catch(S){m=S.message,c=!0,$()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,a=!1,m="",$()}),e.querySelector("#k-save")?.addEventListener("click",()=>{l()})}async function l(){const d={...ne()};e.querySelectorAll("input[data-f]").forEach(o=>{d[o.dataset.f]=o.value});const r=e.querySelector("#k-name")?.value.trim()||d.name.trim()||"Kunde";try{a?await y.customers.create(r,d):t&&await y.customers.update(t.id,{name:r,profile:d}),t=null,a=!1,m="",await b()}catch(o){m=o.message,c=!0,$()}}try{await b()}catch(d){e.innerHTML=`<div class="card error">${s(d.message)}</div>`}}function Pe(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function qe(e){return`<span class="badge ${e}">${e}</span>`}async function Ae(e){e.innerHTML=`
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
		<div id="list"></div>`;const n=e.querySelector("#f-status"),t=e.querySelector("#f-q"),a=e.querySelector("#f-sort"),m=e.querySelector("#f-order"),c=e.querySelector("#f-sent"),g=e.querySelector("#reminders");let w="desc",b=[];const f=e.querySelector("#list"),$=e.querySelector("#list-err");let l=0;function d(i){$.innerHTML=`<div class="card error">${s(i.message)}</div>`}async function r(i){const h=i.dataset.paid??"",T=i.checked;i.disabled=!0;try{await y.setPaid(h,T),$.innerHTML=`<div class="card muted">${T?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await o()}catch(v){i.checked=!T,d(v)}finally{i.disabled=!1}}async function o(){const i=++l,h={sort:a.value,order:w};n.value&&(h.status=n.value),t.value.trim()&&(h.q=t.value.trim()),c.value&&(h.sent=c.value);try{const T=await y.list(h);if(i!==l)return;b=T.filter(u=>u.status==="draft").map(u=>u.id);const v=e.querySelector("#f-issue-all");v.hidden=b.length===0,v.textContent=`Ausstellen (${b.length})`,f.innerHTML=T.map(u=>`<div class="card"><div class="row">
					${u.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${u.paid?`Ausgeglichen am ${s((u.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${s(u.id)}" ${u.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${s(u.number??"(Entwurf)")}</strong>${qe(u.status)}
					<span>${s(u.buyer.name||"—")}</span>
					<span>${q(u.totals.grossTotal)}</span>
					${u.skontoPercent>0&&!u.paid?`<span class="muted">${q(u.totals.grossTotal-Pe(u))} bei ${s(u.skontoPercent)} % Skonto</span>`:""}
					${u.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					${u.status==="issued"?u.sentAt?`<span class="badge issued" title="Über ${s(u.sendChannel??"E-Mail")} versendet am ${s(u.sentAt.slice(0,10))}">versendet</span>`:`<button class="secondary" data-sent="${s(u.id)}" title="Als versendet markieren">nicht versendet</button>`:""}
					<a href="#/invoices/${s(u.id)}">Ansehen</a>
					${u.status==="draft"?`<a href="#/edit/${s(u.id)}">Bearbeiten</a>`:""}
					${u.status==="draft"?`<button class="secondary" data-del="${s(u.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',f.querySelectorAll("[data-paid]").forEach(u=>u.addEventListener("change",()=>{r(u)})),f.querySelectorAll("[data-sent]").forEach(u=>u.addEventListener("click",async()=>{try{await y.markSent(u.dataset.sent??"","E-Mail"),await o()}catch(k){d(k)}})),f.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",async()=>{if(window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen."))try{await y.deleteDraft(u.dataset.del??""),$.innerHTML='<div class="card muted">Entwurf gelöscht.</div>',await o()}catch(k){d(k)}}))}catch(T){if(i!==l)return;f.innerHTML=`<div class="card error">${s(T.message)}</div>`}}n.onchange=()=>{o()},a.onchange=()=>{o()},c.onchange=()=>{o()},m.onclick=()=>{w=w==="desc"?"asc":"desc",m.textContent=w==="desc"?"↓ absteigend":"↑ aufsteigend",o()};let p;t.oninput=()=>{p!==void 0&&clearTimeout(p),p=setTimeout(()=>{o()},250)},e.querySelector("#f-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${b.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`))try{const i=await y.issueBatch(b);$.innerHTML=`<div class="card ${i.failed.length?"error":"muted"}">${i.issued.length} ausgestellt${i.failed.length?`, ${i.failed.length} fehlgeschlagen: ${s(i.failed[0].error??"")}`:""}.</div>`,await o()}catch(i){d(i)}});const S=()=>{const i={};return n.value&&(i.status=n.value),t.value.trim()&&(i.q=t.value.trim()),i};e.querySelector("#f-export")?.addEventListener("click",async()=>{try{await B(y.exportUrl(S()),"export.xlsx")}catch(i){d(i)}}),e.querySelector("#f-csv")?.addEventListener("click",async()=>{try{await B(y.csvUrl(S()),"rechnungen.csv")}catch(i){d(i)}}),e.querySelector("#f-datev")?.addEventListener("click",async()=>{try{await B(y.datevUrl(S()),"rechnungen.datev")}catch(i){d(i)}});async function P(){try{const i=await y.reminders();if(!i.length){g.innerHTML="";return}g.innerHTML=`<div class="card"><div class="row">
				<strong>Überfällig: ${i.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${i.map(h=>`<div class="card" style="flex:1">
						<strong>${s(h.invoice.number??"")}</strong> ${s(h.invoice.buyer.name)}
						<br /><span class="muted">${h.overdueDays} Tage überfällig · Stufe ${h.level}${h.skontoActive?` · Skonto ${s(h.invoice.skontoPercent)} % noch möglich bis ${s(h.invoice.skontoDueDate??"")}`:""}</span>
						<br /><a href="#/invoices/${s(h.invoice.id)}">Ansehen</a>
					</div>`).join("")}</div></div>`}catch{}}await o(),await P()}const K=5*1024*1024,I=10,De=["pdf","png","jpg","jpeg"];function V(e){return e>=1024*1024?`${(e/(1024*1024)).toFixed(1).replace(".",",")} MB`:`${Math.max(1,Math.round(e/1024))} kB`}function xe(e){return e==="application/pdf"?"PDF":e==="image/png"?"PNG":e==="image/jpeg"?"JPEG":e}function Me(e){const n=e.lastIndexOf(".");return n>0?e.slice(n+1).toLowerCase():""}function Re(e){const n=new Uint8Array(e);let t="";const a=32768;for(let m=0;m<n.length;m+=a)t+=String.fromCharCode(...n.subarray(m,m+a));return btoa(t)}function pe(e,n,t){let a=[];e.innerHTML=`
		<div class="card att">
			<div class="row"><h3 style="margin:0">Anlagen</h3><span class="muted" id="att-count"></span></div>
			<p class="muted">Belege zum Vorgang (Lieferschein, Nachweis, Bestellbestätigung) — PDF, PNG oder JPEG,
				höchstens ${I} Dateien mit je ${V(K)}. Beim Ausstellen
				werden sie in die Rechnung eingebettet (PDF/A-3, im XML als BG-24).</p>
			${t.readOnly?'<p class="muted">Diese Rechnung ist ausgestellt: die Anlagen bleiben abrufbar, lassen sich aber nicht mehr ändern (GoBD).</p>':`<div class="row att-upload">
						<input type="file" id="att-file" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" />
						<button id="att-add">Hochladen</button>
					</div>
					<progress id="att-progress" max="100" value="0" hidden></progress>`}
			<div id="att-list" class="muted">Lade …</div>
			<p id="att-out" class="muted"></p>
		</div>`;const m=e.querySelector("#att-list"),c=e.querySelector("#att-out"),g=e.querySelector("#att-count");function w(){if(g.textContent=a.length>0?`${a.length} von ${I}`:"",a.length===0){m.className="muted",m.textContent=t.readOnly?"Keine Anlagen an dieser Rechnung.":"Noch keine Anlagen.";return}m.className="",m.innerHTML=`<table class="ovw att-table"><thead><tr>
				<th>Datei</th><th>Typ</th><th class="r">Größe</th><th class="r">Aktion</th>
			</tr></thead><tbody>${a.map(f=>`<tr>
						<td>${s(f.filename)}</td>
						<td>${s(xe(f.mime))}</td>
						<td class="r">${s(V(f.size))}</td>
						<td class="r">
							<button class="secondary" data-download="${f.id}">Download</button>
							${t.readOnly?"":`<button class="danger" data-delete="${f.id}">Löschen</button>`}
						</td>
					</tr>`).join("")}</tbody></table>`,m.querySelectorAll("[data-download]").forEach(f=>f.addEventListener("click",()=>{const $=Number(f.dataset.download),l=a.find(d=>d.id===$);B(y.attachments.url(n,$),l?.filename??"anlage.pdf").catch(d=>{c.className="error",c.textContent=d.message})})),m.querySelectorAll("[data-delete]").forEach(f=>f.addEventListener("click",()=>{const $=Number(f.dataset.delete),l=a.find(d=>d.id===$);window.confirm(`Anlage „${l?.filename??$}" wirklich löschen?`)&&(async()=>{try{await y.attachments.remove(n,$),a=await y.attachments.list(n),w(),c.className="muted",c.textContent="Anlage gelöscht."}catch(d){c.className="error",c.textContent=d.message}})()}))}function b(f){return f.size===0?`${f.name}: leere Datei`:f.size>K?`${f.name}: größer als ${V(K)}`:De.includes(Me(f.name))?null:`${f.name}: nur PDF, PNG und JPEG`}e.querySelector("#att-add")?.addEventListener("click",()=>{const f=e.querySelector("#att-file"),$=e.querySelector("#att-progress"),l=[...f?.files??[]];(async()=>{if(c.className="muted",c.textContent="",l.length===0){c.className="error",c.textContent="Bitte zuerst eine Datei auswählen.";return}if(a.length+l.length>I){c.className="error",c.textContent=`Höchstens ${I} Anlagen je Rechnung (bisher ${a.length}).`;return}const d=l.map(b).filter(r=>r!==null);if(d.length>0){c.className="error",c.textContent=d.join(" · ");return}$&&($.hidden=!1,$.value=0);try{for(const[r,o]of l.entries()){const p=Re(await o.arrayBuffer());await y.attachments.add(n,{filename:o.name,mime:o.type,dataBase64:p}),$&&($.value=Math.round((r+1)/l.length*100))}a=await y.attachments.list(n),w(),f&&(f.value=""),c.className="muted",c.textContent=`${l.length} Anlage(n) gespeichert.`}catch(r){c.className="error",c.textContent=r.message}finally{$&&($.hidden=!0)}})()}),y.attachments.list(n).then(f=>{a=f,w()}).catch(f=>{m.className="error",m.textContent=f.message})}function G(e){return Math.round((e+Number.EPSILON)*100)/100}function Oe(e){const n=(e??"").trim(),[t,a]=n.split(".."),m=c=>/^\d{4}-\d{2}-\d{2}$/.test(c??"")?`${c.slice(8,10)}.${c.slice(5,7)}.${c.slice(0,4)}`:c??"";return a?`${m(t)} – ${m(a)}`:m(t)}async function Be(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let a=await y.get(n);const c=(Array.isArray(a.lines)?a.lines:[]).map(r=>{const o=Math.min(Math.max(Number(r.discountPercent)||0,0),100),p=Number(r.quantity)||0,S=Number(r.unitPriceNet)||0;return{line:r,discount:o,gross:G(p*S),net:G(p*S*(1-o/100))}}),g=c.some(r=>r.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${s(a.number??"(Entwurf)")}</strong>
				<span class="badge ${a.status}">${a.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${s(a.seller.name)}<br />${s(a.seller.street)}<br />${s(a.seller.zip)} ${s(a.seller.city)}</div>
				<div><strong>Käufer</strong><br />${s(a.buyer.name)}<br />${s(a.buyer.street)}<br />${s(a.buyer.zip)} ${s(a.buyer.city)}${a.buyer.email?`<br />${s(a.buyer.email)}`:""}</div>
			</div>
			<p>Ausgestellt: ${s(a.issueDate)} · Leistung: ${s(Oe(a.deliveryDate))}${a.dueDate?` · Fällig: ${s(a.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${g?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${c.map((r,o)=>`<tr>
					<td>${o+1}</td><td>${s(r.line.description)}${r.line.sku?` (${s(r.line.sku)})`:""}</td>
					<td class="r">${s(r.line.quantity)} ${s(r.line.unit)}</td>
					<td class="r">${q(Number(r.line.unitPriceNet))}</td>
					${g?`<td class="r">${r.discount>0?`${s(r.discount)} %`:"–"}</td><td class="r">${r.discount>0?q(G(r.gross-r.net)):"–"}</td>`:""}
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
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div><div id="d-reports"></div><div id="d-attachments"></div></div>`;const w=e.querySelector("#d-out"),b=r=>{w.innerHTML=`<p class="error">${s(r.message)}</p>`},f=e.querySelector("#d-history"),$=async()=>{if(a.status!=="draft")try{const r=await y.renders(a.id);if(!r.length){f.innerHTML="";return}f.innerHTML=`<details><summary>Neu gerendert (${r.length})</summary><ul>${r.map(o=>`<li>${s(o.createdAt.slice(0,16).replace("T"," "))} – ${s(o.artifact.toUpperCase())}${o.reason?` – ${s(o.reason)}`:""}${o.previousPath?` – Original: <code>${s(o.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await $();const l=e.querySelector("#d-reports"),d=async()=>{try{const r=await y.validationReports(a.id);if(!r.length){l.innerHTML="";return}l.innerHTML=`<details><summary>Validierungsberichte (${r.length})</summary><ul>${r.map(o=>`<li>${s(o.createdAt.slice(0,16).replace("T"," "))} – Bericht ${o.seq}: ${o.formatErrors+o.businessErrors===0?'<span style="color:var(--ok)">keine Fehler</span>':`${o.formatErrors} Format-, ${o.businessErrors} Fachfehler`} – <a href="#" data-report="${o.seq}">herunterladen</a></li>`).join("")}</ul></details>`,l.querySelectorAll("[data-report]").forEach(o=>o.addEventListener("click",async p=>{p.preventDefault();const S=Number(o.dataset.report);try{await B(y.validationReportUrl(a.id,S),`validation-${S}.json`)}catch(P){b(P)}}))}catch{}};await d(),pe(e.querySelector("#d-attachments"),a.id,{readOnly:a.status!=="draft"}),e.querySelectorAll("[data-dl]").forEach(r=>r.addEventListener("click",async()=>{const o=r.dataset.dl,p=o==="pdf"?y.pdfUrl(a.id):o==="xml"?y.xmlUrl(a.id):y.xlsxUrl(a.id);try{await B(p,`${a.number??"rechnung"}.${o}`)}catch(S){b(S)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await we(y.pdfUrl(a.id))}catch(r){b(r)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{w.innerHTML='<p class="muted">Validiere…</p>';try{const r=await y.validate(a.id),o=r.report,p=[...r.formatErrors,...r.businessErrors],S=o?`<p class="muted">Bericht gespeichert: <code>${s(o.path.split("/").pop()??"")}</code> – <a href="#" id="d-report-last">herunterladen</a></p>`:'<p class="muted">Hinweis: der Bericht konnte nicht gespeichert werden (Adapter-Log).</p>';w.innerHTML=(p.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${p.map(P=>`<li class="error">${s(P)}</li>`).join("")}</ul>`)+S,o&&w.querySelector("#d-report-last")?.addEventListener("click",async P=>{P.preventDefault();try{await B(y.validationReportUrl(a.id,o.seq),`validation-${o.seq}.json`)}catch(i){b(i)}}),await d()}catch(r){w.innerHTML=`<p class="error">${s(r.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async r=>{const o=r.target,p=o.checked;o.disabled=!0;try{a=await y.setPaid(a.id,p),w.innerHTML=`<p style="color:var(--ok)">${p?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(S){o.checked=!p,w.innerHTML=`<p class="error">${s(S.message)}</p>`}finally{o.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const r=(a.buyer.email??"").trim(),o=`${a.documentTitle??"Rechnung"} ${a.number??""}`.trim(),p=`Guten Tag ${a.buyer.name||""},

anbei erhalten Sie ${o} vom ${a.issueDate}.
Gesamtbetrag: ${q(a.totals.grossTotal)}.
${a.dueDate?`Bitte überweisen bis ${a.dueDate}.
`:""}
Mit freundlichen Grüßen
${a.seller.name}
`;try{await B(y.pdfUrl(a.id),`${a.number??"rechnung"}.pdf`)}catch(P){b(P);return}const S=`mailto:${r}?subject=${encodeURIComponent(o)}&body=${encodeURIComponent(p)}`;window.location.href=S,w.innerHTML=r?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${s(r)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-sent")?.addEventListener("click",async()=>{try{a=await y.markSent(a.id,"E-Mail"),w.innerHTML=`<p style="color:var(--ok)">Als versendet markiert${a.sentAt?` (${s(a.sentAt.slice(0,10))})`:""}.</p>`,e.querySelector("#d-sent")?.remove()}catch(r){b(r)}}),e.querySelector("#d-as-tpl")?.addEventListener("click",async()=>{const r=`${a.buyer.name||"Rechnung"} ${new Date().getFullYear()}`,o=window.prompt("Name der Vorlage:",r);if(!(!o||!o.trim()))try{const p=await y.asTemplate(a.id,o.trim());w.innerHTML=`<p style="color:var(--ok)">Vorlage „${s(p.name)}" angelegt –
					<a href="#/invoice-templates">jetzt bearbeiten</a>.</p>`}catch(p){b(p)}}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const r=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(r!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?")){w.innerHTML='<p class="muted">Rendere neu…</p>';try{const o=await y.rerender(a.id,r.trim()||void 0);a=o.invoice,w.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${o.archivedPath?` Das Original liegt als <code>${s(o.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await $();const p=e.querySelector("#d-duty");if(a.status!=="draft"&&!a.paid)try{const{duty:S,checked:P}=await y.paymentCheck(a.id);S.required&&!P?(p.innerHTML=`<p class="error">${s(S.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`,e.querySelector("#d-duty-ok")?.addEventListener("click",async()=>{try{await y.paymentCheck(a.id,"geprüft"),p.innerHTML='<p style="color:var(--ok)">Zahlungsweise geprüft.</p>'}catch(i){b(i)}})):P&&(p.innerHTML=`<p class="muted">Zahlungsweise geprüft${a.paymentCheckedAt?` am ${s(a.paymentCheckedAt.slice(0,10))}`:""}.</p>`)}catch{}}catch(o){w.innerHTML=`<p class="error">${s(o.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const r=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(r!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:o}=await y.storno(a.id,r.trim()||void 0);location.hash=`#/edit/${o.id}`,location.reload()}catch(o){w.innerHTML=`<p class="error">${s(o.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const r=await y.issue(a.id);location.hash=`#/invoices/${r.id}`,location.reload()}catch(r){w.innerHTML=`<p class="error">${s(r.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${s(t.message)}</div>`}}function ae(e){return{lines:(Array.isArray(e.lines)?e.lines:[]).filter(t=>t&&typeof t.description=="string"&&t.description.trim()!==""),paymentTerms:typeof e.paymentTerms=="string"?e.paymentTerms:"",skontoPercent:Number(e.skontoPercent)||0,notes:typeof e.notes=="string"?e.notes:""}}function se(e){return e.reduce((n,t)=>{const a=Math.min(Math.max(Number(t.discountPercent)||0,0),100),m=(Number(t.quantity)||0)*(Number(t.unitPriceNet)||0);return n+m*(1-a/100)},0)}function je(e,n,t){return`<div class="card line" style="background:var(--bg)">
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
	</div>`}const He=[19,7,0];async function ze(e){e.innerHTML='<div class="card">Lade Rechnungsvorlagen…</div>';let n=[],t=[],a=null,m=!1,c=[],g="",w=0,b="",f="",$=!1;async function l(){n=await y.invoiceTemplates.list(),S()}async function d(){try{t=await y.products.list(),m&&S()}catch{t=[]}}function r(P){a=P,m=!0;const i=ae(P?.body??{});c=i.lines.length?i.lines.map(h=>({...h})):[o()],g=i.paymentTerms,w=i.skontoPercent,b=i.notes,f="",$=!1,S()}function o(){return{description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}}function p(){return c.map((P,i)=>{const h=(T,v)=>{const u=e.querySelector(`[data-tpl-line="${i}.${T}"]`);return u?u.value:v};return{description:String(h("description",P.description)),sku:String(h("sku","")),quantity:Number(h("quantity",P.quantity))||0,unit:String(h("unit",P.unit)),unitPriceNet:Number(h("unitPriceNet",P.unitPriceNet))||0,vatRate:Number(h("vatRate",P.vatRate))||0}})}function S(){const P=se(p());e.innerHTML=`
		<div class="card"><div class="row"><strong>Rechnungsvorlagen</strong>
			<button id="t-new">+ Neue Vorlage</button>
			${f?`<span class="${$?"error":"muted"}">${s(f)}</span>`:""}</div>
			<p class="muted">Wiederkehrende Rechnungen (Wartung, Honorar, Abo) einmal anlegen und im Assistenten
				übernehmen. Käufer und Datum werden bewusst nicht gespeichert.</p>
			${n.map(i=>{const h=ae(i.body);return`<div class="row" style="margin-top:8px">
						<strong>${s(i.name)}</strong>
						<span class="muted">${h.lines.length} Position(en) · ${q(se(h.lines))}${h.skontoPercent?` · ${h.skontoPercent} % Skonto`:""}</span>
						<button class="secondary" data-tpl-edit="${s(i.id)}">Bearbeiten</button>
						<button class="danger" data-tpl-del="${s(i.id)}">Löschen</button>
					</div>`}).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${m?`<div class="card"><h3>${a?s(a.name):"Neue Vorlage"}</h3>
					<label>Name<input id="t-name" value="${s(a?.name??"")}" placeholder="z. B. Monatliche Wartung" /></label>
					<label>Zahlungsbedingungen<input id="t-terms" value="${s(g)}" placeholder="Zahlbar innerhalb von 14 Tagen" /></label>
					<div class="grid2">
						<label>Skonto %<input id="t-skonto" type="number" min="0" max="20" step="0.5" value="${s(w)}" /></label>
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
					${c.map((i,h)=>je(i,h,He)).join("")}
					<button class="secondary" id="t-add-line">+ Leere Position</button>
					<p><button id="t-save">Speichern</button>
					<button class="secondary" id="t-cancel">Abbrechen</button></p>
				</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",()=>r(null)),e.querySelectorAll("[data-tpl-edit]").forEach(i=>i.addEventListener("click",()=>{const h=n.find(T=>T.id===i.dataset.tplEdit);h&&r(h)})),e.querySelectorAll("[data-tpl-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Vorlage löschen? Bereits ausgestellte Rechnungen bleiben unverändert."))try{await y.invoiceTemplates.remove(i.dataset.tplDel??""),f="Vorlage gelöscht.",$=!1,await l()}catch(h){f=h.message,$=!0,S()}})),e.querySelectorAll("[data-tpl-del-line]").forEach(i=>i.addEventListener("click",()=>{const h=Number(i.dataset.tplDelLine);c.splice(h,1),c.length===0&&c.push(o()),S()})),e.querySelector("#t-take")?.addEventListener("click",()=>{c=p();const i=e.querySelector("#t-catalog")?.value??"",h=t.find(T=>T.id===i);h&&(c.push({description:h.name,sku:h.sku||void 0,details:h.details||void 0,quantity:1,unit:h.unit,unitPriceNet:h.unitPriceNet,vatRate:h.vatRate}),S())}),e.querySelector("#t-add-line")?.addEventListener("click",()=>{c=p(),c.push(o()),S()}),e.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,m=!1,S()}),e.querySelector("#t-save")?.addEventListener("click",async()=>{const i=e.querySelector("#t-name")?.value.trim()??"";if(!i){f="Bitte einen Namen vergeben.",$=!0,S();return}const h=p().filter(v=>v.description.trim()!=="");if(h.length===0){f="Mindestens eine Position mit Bezeichnung nötig.",$=!0,S();return}const T={lines:h,paymentTerms:e.querySelector("#t-terms")?.value??"",skontoPercent:Number(e.querySelector("#t-skonto")?.value)||0,notes:e.querySelector("#t-notes")?.value??""};try{a?.id?await y.invoiceTemplates.update(a.id,{name:i,body:T}):await y.invoiceTemplates.create(i,T),f=`Gespeichert: ${i}`,$=!1,a=null,m=!1,await l()}catch(v){f=v.message,$=!0,S()}})}try{await l(),d()}catch(P){e.innerHTML=`<div class="card error">${s(P.message)}</div>`}}function Ce(e){const n=X();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${s(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";W(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{W(null),location.hash="#/login",location.reload()})}function Ue(){W(null),location.hash="#/login"}async function Fe(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],t=null,a=!1,m="",c=!1;async function g(){n=await y.products.list(),b()}function w(l){const d=r=>s(r??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${d(l.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${d(l.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${d(l.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${d(l.unit||"Stk")}" /></label>
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
			${w(t??{})}
			${m?`<p class="${c?"error":""}">${s(m)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,a=!0,m="",b()}),e.querySelectorAll("[data-edit]").forEach(l=>l.addEventListener("click",()=>{t=n.find(d=>d.id===l.dataset.edit)??null,a=!1,m="",b()})),e.querySelectorAll("[data-del]").forEach(l=>l.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await y.products.remove(l.dataset.del??""),await g()}catch(d){m=d.message,c=!0,b()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,a=!1,m="",b()}),e.querySelector("#p-save")?.addEventListener("click",()=>{$()})}function f(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function $(){const l=f();try{a?await y.products.create(l):t&&await y.products.update(t.id,l),t=null,a=!1,m="",await g()}catch(d){m=d.message,c=!0,b()}}try{await g()}catch(l){e.innerHTML=`<div class="card error">${s(l.message)}</div>`}}async function Ie(e){try{const n=await y.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(n.version)} · Schema: ${s(String(n.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(n.message)}</div>`}}const Ke=["title","meta","parties","positions","totals"],ie=["payment","notes"],Ve=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function Ge(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],t=null,a="",m=[];try{const l=await D("/api/company-profiles");l.ok&&(m=await l.json())}catch{}async function c(){n=await g(),b()}async function g(){const l=await D("/api/templates");if(!l.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await l.json()}function w(l){const d=l.definition,r=(o,p,S)=>`<label><input type="checkbox" data-f="blocks.${o}" ${d.blocks[o]?"checked":""} ${S?"disabled":""} style="width:auto" /> ${p}${S?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(l.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${m.map(o=>`<option value="${s(o.id)}" ${l.definition.companyId===o.id?"selected":""}>${s(o.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${s(d.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${s(d.colors.text)}" /></label>
		</div>
		<label class="pay" title="Aus: das Dokument bleibt schwarz/weiß, die Primärfarbe wird nirgends verwendet">
			<input type="checkbox" data-f="usePrimaryColor" ${d.usePrimaryColor!==!1?"checked":""} /><span>Primärfarbe verwenden</span>
		</label>
		<label class="pay" title="Ohne Haken: der Titel wird in der Textfarbe gesetzt">
			<input type="checkbox" data-f="titleAccent" ${d.titleAccent!==!1?"checked":""} /><span>Rechnungstitel in Akzentfarbe</span>
		</label>
		<label class="pay" title="Ohne Haken: nur die linke Hälfte der Kopfzeile ist eingefärbt, die rechte bleibt grau">
			<input type="checkbox" data-f="tableHeaderAccent" ${d.tableHeaderAccent===!0?"checked":""} /><span>Tabellenkopf komplett in Akzentfarbe</span>
		</label>
		${Ke.map(o=>r(o,`Block ${o}`,!0)).join("")}
		${ie.map(o=>r(o,`Block ${o}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${d.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${d.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${d.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${d.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${d.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${d.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${d.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${s(d.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${s(d.closingText??"")}</textarea></label>
		<div class="grid2">
			<label title="Leer lassen: es wird kein Name gedruckt">Unterschrift (Name, optional)<input id="t-sign" value="${s(d.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${s(d.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${s(d.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${Ve.map(o=>`<option value="${o.value}" ${d.logo?.position===o.value?"selected":""}>${o.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${d.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${d.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${d.logo?`<p class="muted">Aktuell: ${s(d.logo.path)}</p>`:""}`}function b(){e.innerHTML=`
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
		${t?`<div class="card"><h3>${s(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${w(t)}
			${a?`<p class="error">${s(a)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const r=(await(await D("/api/templates")).json())[0];if(!r){a="Keine Basisvorlage vorhanden",b();return}t={...structuredClone(r),id:"neu",name:"Neu",version:1,isDefault:!1},a="",b()}catch(l){a=l.message,b()}}),e.querySelectorAll("[data-edit]").forEach(l=>l.addEventListener("click",()=>{const d=n.find(r=>r.id===l.dataset.edit);d&&(t=structuredClone(d),a="",b())})),e.querySelectorAll("[data-prev]").forEach(l=>l.addEventListener("click",async()=>{const d=n.find(r=>r.id===l.dataset.prev);if(d)try{const r=await D("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:d.definition})});if(!r.ok){const p=await r.json().catch(()=>({}));throw new Error(p.error??"Vorschau fehlgeschlagen")}const o=await r.blob();window.open(URL.createObjectURL(o),"_blank")}catch(r){a=r.message,b()}})),e.querySelectorAll("[data-def]").forEach(l=>l.addEventListener("click",async()=>{try{if(!(await D(`/api/templates/${l.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await c()}catch(d){a=d.message,b()}})),e.querySelectorAll("[data-del]").forEach(l=>l.addEventListener("click",async()=>{const d=await D(`/api/templates/${l.dataset.del}`,{method:"DELETE"});if(!d.ok){a=(await d.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",b();return}await c()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,a="",b()}),e.querySelector("#t-save")?.addEventListener("click",()=>{$()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const l=f();if(l)try{const d=await D("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:l.definition})});if(!d.ok){const r=await d.json().catch(()=>({}));throw new Error(r.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await d.blob()),"_blank")}catch(d){a=d.message,b()}})}function f(){if(!t)return null;const l=structuredClone(t.definition);l.name=(e.querySelector("#t-name")?.value??l.name).trim(),l.colors.primary=e.querySelector("#t-c1")?.value??l.colors.primary,l.colors.text=e.querySelector("#t-c2")?.value??l.colors.text;for(const r of ie)l.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??l.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])l[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;for(const r of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const o=e.querySelector(`[data-f="${r}"]`);o&&(l[r]=o.checked)}l.footerText=e.querySelector("#t-footer")?.value??"";const d=e.querySelector("#t-company")?.value??"";return d?l.companyId=d:delete l.companyId,l.introText=e.querySelector("#t-intro")?.value??"",l.closingText=e.querySelector("#t-closing")?.value??"",l.signatureName=e.querySelector("#t-sign")?.value??"",l.headerExtra=e.querySelector("#t-hextra")?.value??"",l.logo&&(l.logo.position=e.querySelector("#t-lpos")?.value??"right",l.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),l.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:l.name,definition:l}}async function $(){const l=f();if(!l)return;const d=l.definition;try{let r=t.id;if(r==="neu"){const p=await D("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:d.name,definition:d})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await p.json()).id}else{const p=await D(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:d.name,definition:d})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const o=e.querySelector("#t-logo")?.files?.[0];if(o){const p=await new Promise((P,i)=>{const h=new FileReader;h.onload=()=>P(String(h.result).split(",")[1]),h.onerror=()=>i(new Error("Datei nicht lesbar")),h.readAsDataURL(o)}),S=await D(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:o.name,mime:o.type,dataBase64:p})});if(!S.ok)throw new Error((await S.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,a="",await c()}catch(r){a=r.message,b()}}try{await c()}catch(l){e.innerHTML=`<div class="card error">${s(l.message)}</div>`}}const re=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),U=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:F.defaultVatRate});let F={defaultVatRate:19,defaultPaymentTerms:""};const Y=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],le="__own__";function he(e,n){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+n),t.toISOString().slice(0,10)}function fe(e){return!!e&&!ve(e)}function ve(e){return!!e&&Y.some(n=>n.text===e)}function ge(e){return Y.find(n=>n.text===e)?.days??null}function ce(e){if(!e.dueAuto)return;const n=ge(e.paymentTerms);n!==null&&(e.dueDate=he(e.issueDate,n))}function O(e){return Math.round((e+Number.EPSILON)*100)/100}function oe(e){const n=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,a=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return O(n*t*(1-a/100))}function Je(e){return(e??"").trim().split("..")[0]??""}function Ze(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const H="einv-wizard-v1",be="einv-employee";function ye(){try{return localStorage.getItem(be)??""}catch{return""}}function de(){return new Date().toISOString().slice(0,10)}function _(){return{step:0,seller:re(),buyer:re(),lines:[U()],issueDate:de(),deliveryDate:de(),dueDate:"",employee:ye(),documentTitle:"Rechnung",notes:"",paymentTerms:F.defaultPaymentTerms,termsCustom:fe(F.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function J(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function We(){try{const e=localStorage.getItem(H);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{..._(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function ue(e,n,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${s(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const _e=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Xe={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function me(e,n){let t=_();const a=!!n;let m=[],c=[],g=[],w=[],b=!1,f=!1;if(y.settings().then(i=>{F={defaultVatRate:Number(i.defaultVatRate)||19,defaultPaymentTerms:i.defaultPaymentTerms??""}}).catch(()=>{}),n){e.innerHTML='<div class="card">Lade Entwurf…</div>',y.get(n).then(i=>{if(i.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${s(i.status)}).</div>`;return}t={..._(),seller:i.seller,buyer:i.buyer,lines:i.lines.length>0?i.lines:[U()],issueDate:i.issueDate,deliveryDate:i.deliveryDate,dueDate:i.dueDate??"",employee:i.employeeCode??ye(),documentTitle:i.documentTitle,notes:i.notes??"",paymentTerms:i.paymentTerms??F.defaultPaymentTerms,termsCustom:fe(i.paymentTerms),skontoPercent:i.skontoPercent??0,skontoDueDate:i.skontoDueDate??"",draftId:i.id},l(),p()}).catch(i=>{e.innerHTML=`<div class="card error">${s(i.message)}</div>`});return}const $=We();if($&&J($)&&!$.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${s($.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=$,l(),p()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(H),l(),p()});return}$&&J($)&&(t=$),l(),J(t)||y.company.getDefault().then(i=>{i&&!t.seller.name.trim()&&i.profile.name.trim()&&(t.seller={...t.seller,...i.profile},t.selectedCompany=i.id,p(!0))}).catch(()=>{});function l(){if(f)return;f=!0;const i=(h,T)=>{T(),e.querySelector(h)||p(!0)};y.company.list().then(h=>i("#w-company",()=>m=h)).catch(()=>{}),y.customers.list().then(h=>i("#w-customer",()=>c=h)).catch(()=>{}),y.products.list().then(h=>i("#w-catalog",()=>g=h)).catch(()=>{}),y.invoiceTemplates.list().then(h=>i("#w-inv-tpl",()=>w=h)).catch(()=>{})}function d(){try{if(a)return;if(!t.dirty){localStorage.removeItem(H);return}localStorage.setItem(H,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function r(){e.querySelectorAll("input[data-p]").forEach(u=>{const k=u.dataset.p==="seller"?t.seller:t.buyer;k[u.dataset.f]=u.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(u=>{const[k,N]=u.dataset.l.split("."),A=t.lines[Number(k)];if(A)if(N==="quantity"||N==="unitPriceNet"||N==="vatRate"||N==="discountPercent"){const M=Number(u.value),z=Number.isFinite(M)?M:0;A[N]=N==="discountPercent"?Math.min(Math.max(z,0),100):z}else A[N]=u.value});const i=u=>e.querySelector(`#${u}`)?.value??"",h=()=>{const u=i("w-delivery");if(!u)return;const k=i("w-delivery-to");t.deliveryDate=k&&k!==u?`${u}..${k}`:u};t.issueDate=i("w-issue")||t.issueDate,h(),e.querySelector("#w-due")&&(t.dueDate=i("w-due")),ce(t),e.querySelector("#w-employee")&&(t.employee=i("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=i("w-title")||t.documentTitle);const T=e.querySelector("#w-notes");T&&(t.notes=T.value);const v=e.querySelector("#w-terms");if(v&&(t.paymentTerms=v.value),e.querySelector("#w-skonto")){const u=Number(i("w-skonto"));t.skontoPercent=Number.isFinite(u)?Math.min(Math.max(u,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=i("w-skonto-due")),d()}function o(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((h,T)=>`<span class="${T===t.step?"on":""}">${T+1}. ${h}</span>`).join("")}</div>`}function p(i=!1){i||r();let h="";if(t.step===0&&(h=`<div class="card"><h3>Verkäufer</h3>
				${m.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${m.map(v=>`<option value="${s(v.id)}" ${t.selectedCompany===v.id?"selected":""}>${s(v.name)}${v.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ue("seller",t.seller,!0)}</div>`),t.step===1&&(h=`<div class="card"><h3>Käufer</h3>
				${c.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${c.map(v=>`<option value="${s(v.id)}" ${t.selectedCustomer===v.id?"selected":""}>${s(v.name)}${v.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ue("buyer",t.buyer,!1)}</div>`),t.step===2&&(h=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${_e.map(v=>`<option ${v===t.documentTitle?"selected":""}>${v}</option>`).join("")}
				</select></label>
				${w.length>0?`<label>Wiederkehrende Rechnung<select id="w-inv-tpl">
							<option value="">– eigene Positionen –</option>
							${w.map(v=>`<option value="${s(v.id)}">${s(v.name)}</option>`).join("")}
						</select></label>
						<p class="muted">Übernimmt Positionen, Termine, Zahlungsbedingungen und Skonto. Käufer und Datum bleiben deine Angaben.</p>`:'<p class="muted">Tipp: Unter <a href="#/invoice-templates">Rechnungsvorlagen</a> eine Vorlage anlegen, um wiederkehrende Rechnungen nicht jedes Mal neu einzutippen.</p>'}
				${g.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${g.map(v=>`<option value="${s(v.id)}">${s(v.sku?`${v.sku} · `:"")}${s(v.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((v,u)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${u+1}</span><strong>Position ${u+1}</strong>
						<span class="line-sum">${q(oe(v))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${u}.description" value="${s(v.description)}" /></label>
						<label>Art.Nr.<input data-l="${u}.sku" value="${s(v.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${u}.details" rows="1">${s(v.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${u}.quantity" type="number" min="0" step="any" value="${s(v.quantity)}" /></label>
						<label>Einheit<input data-l="${u}.unit" value="${s(v.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${u}.unitPriceNet" type="number" min="0" step="0.01" value="${s(v.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${u}.discountPercent" type="number" min="0" max="100" step="0.1" value="${s(v.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${u}.vatRate">
							${[19,7,0].map(k=>`<option ${k===Number(v.vatRate)?"selected":""}>${k}</option>`).join("")}
						</select></label>
						${Number(v.vatRate)===0?`<label>Steuerbefreiung<select data-l="${u}.exemptionCategory">
								${["E","AE","K","G","O"].map(k=>`<option ${(v.exemptionCategory??"E")===k?"selected":""} value="${k}">${k} — ${Xe[k]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${u}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${s(v.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${u}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${s(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${s(t.dueDate)}" />${t.dueAuto?' <span class="muted">(aus Zahlungsbedingung)</span>':""}</label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${s(Je(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${s(Ze(t.deliveryDate))}" /></label>
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
					${Y.map(v=>`<option value="${s(v.text)}" ${!t.termsCustom&&t.paymentTerms===v.text?"selected":""}>${s(v.text)}</option>`).join("")}
					<option value="${le}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${s(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const v=t.lines.map(L=>{const R=Math.min(Math.max(Number(L.discountPercent)||0,0),100);return{...L,discount:R,gross:O((Number(L.quantity)||0)*(Number(L.unitPriceNet)||0)),net:oe(L)}}).filter(L=>L.description.trim()!==""||L.gross>0),u=new Map;for(const L of v)u.set(Number(L.vatRate)||0,O((u.get(Number(L.vatRate)||0)??0)+L.net));const k=[...u.entries()].sort(([L],[R])=>L-R).map(([L,R])=>({rate:L,net:R,tax:O(R*L/100)})),N=O(k.reduce((L,R)=>L+R.net,0)),A=O(k.reduce((L,R)=>L+R.tax,0)),M=O(N+A),z=O(M*(Number(t.skontoPercent)||0)/100),Q=v.some(L=>L.discount>0);h=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${s(t.documentTitle)}</strong> · ${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${v.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${Q?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${v.map(L=>`<tr>
							<td>${s(L.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${s(L.quantity)} ${s(L.unit)}</td>
							<td class="r">${q(L.unitPriceNet)}</td>
							${Q?`<td class="r">${L.discount>0?`${s(L.discount)} %`:"–"}</td><td class="r">${L.discount>0?q(O(L.gross-L.net)):"–"}</td>`:""}
							<td class="r">${s(L.vatRate)} %</td><td class="r"><strong>${q(L.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${q(N)}</td></tr>
						${k.map(L=>`<tr class="sub"><td class="lbl">USt ${s(L.rate)} % auf ${q(L.net)}</td><td class="r">${q(L.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${q(M)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${s(t.skontoPercent)} % Skonto bis ${s(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${q(z)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${q(M-z)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${o()}${h}
			${t.error?`<div class="card error">${s(t.error)}</div>`:""}
			${t.step===3?'<div id="w-attachments"></div>':""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`;const T=e.querySelector("#w-attachments");T&&(t.draftId?pe(T,t.draftId,{readOnly:!1}):T.innerHTML=`<div class="card"><h3 style="margin:0">Anlagen</h3>
					<p class="muted">Belege wie Lieferschein oder Nachweis lassen sich nach dem Speichern des
					Entwurfs anhängen: erst „Entwurf speichern“, dann hier hochladen. Beim Ausstellen wandern die
					Anlagen in PDF und XML.</p></div>`),e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,p()}),e.querySelector("#w-terms-select")?.addEventListener("change",v=>{const u=v.target.value;if(u===le)t.termsCustom=!0,ve(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=u;const k=ge(u);k!==null?(t.dueAuto=!0,t.dueDate=he(t.issueDate,k)):t.dueAuto=!1}p()}),e.querySelector("#w-due")?.addEventListener("change",()=>{r(),t.dueAuto=!1,p()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const v=e.querySelector("#w-company")?.value??"",u=m.find(k=>k.id===v);u?(t.seller={...t.seller,...u.profile},t.selectedCompany=u.id,p(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const v=e.querySelector("#w-customer")?.value??"",u=c.find(k=>k.id===v);u?(t.buyer={...t.buyer,...u.profile},t.selectedCustomer=u.id,p(!0)):t.selectedCustomer=null}),e.querySelector("#w-inv-tpl")?.addEventListener("change",v=>{const u=v.target.value,k=w.find(A=>A.id===u);if(!k||t.lines.length>0&&!window.confirm(`Positionen durch "${k.name}" ersetzen?`))return;const N=k.body;Array.isArray(N.lines)&&N.lines.length>0&&(t.lines=N.lines.map(A=>({...U(),...A}))),typeof N.paymentTerms=="string"&&(t.paymentTerms=N.paymentTerms),typeof N.notes=="string"&&(t.notes=N.notes),typeof N.documentTitle=="string"&&N.documentTitle&&(t.documentTitle=N.documentTitle),typeof N.skontoPercent=="number"&&N.skontoPercent>0&&(t.skontoPercent=N.skontoPercent),typeof N.dueDate=="string"&&(t.dueDate=N.dueDate),typeof N.deliveryDate=="string"&&(t.deliveryDate=N.deliveryDate),p(!0)}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,p()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(H),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.push(U()),p()}),e.querySelector("#w-take")?.addEventListener("click",()=>{r();const v=e.querySelector("#w-catalog")?.value??"",u=g.find(k=>k.id===v);if(u){const k={description:u.name,sku:u.sku||void 0,details:u.details||void 0,quantity:1,unit:u.unit,unitPriceNet:u.unitPriceNet,vatRate:u.vatRate},N=t.lines.findIndex(A=>!A.description.trim()&&!(A.sku??"").trim()&&!(A.details??"").trim()&&A.unitPriceNet===0);N>=0?t.lines[N]=k:t.lines.push(k),t.dirty=!0}p(!0)}),e.querySelectorAll("[data-del]").forEach(v=>v.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.splice(Number(v.dataset.del),1),t.lines.length===0&&t.lines.push(U()),p(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{S(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&S(!0)})}async function S(i){if(!b){b=!0;try{r(),t.error="";const h={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(be,t.employee.trim())}catch{}let T;t.draftId?T=await y.update(t.draftId,h):(T=await y.create(h),t.draftId=T.id),i&&(T=await y.issue(T.id));try{localStorage.removeItem(H)}catch{}location.hash=`#/invoices/${T.id}`}catch(T){t.error=T.message,p()}}finally{b=!1}}}e.addEventListener("input",()=>{try{P()}catch{}});function P(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const N=k.dataset.p==="seller"?t.seller:t.buyer;N[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[N,A]=k.dataset.l.split("."),M=t.lines[Number(N)];M&&(A==="quantity"||A==="unitPriceNet"||A==="vatRate"||A==="discountPercent"?M[A]=Number(k.value):M[A]=k.value)});const i=k=>e.querySelector(`#${k}`)?.value??"",h=i("w-issue"),T=i("w-delivery"),v=i("w-delivery-to");h&&(t.issueDate=h),T&&(t.deliveryDate=v&&v!==T?`${T}..${v}`:T),e.querySelector("#w-due")&&(t.dueDate=i("w-due")),ce(t),e.querySelector("#w-employee")&&(t.employee=i("w-employee"));const u=i("w-title");if(u&&(t.documentTitle=u),e.querySelector("#w-skonto")){const k=Number(i("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=i("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,d()}p()}const Ye=document.querySelector("#app");function Qe(e){const n=!!X(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Druckvorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/invoice-templates","Rechnungsvorlagen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];Ye.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([a,m])=>`<a href="${a}" class="${e===a||a==="#/"&&e.startsWith("#/invoices")?"active":""}">${m}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function $e(){const e=location.hash||"#/";Qe(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await Ae(n):e==="#/new"?me(n):e.startsWith("#/edit/")?me(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Be(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await Ge(n):e==="#/company"?await Se(n):e==="#/customers"?await Ne(n):e==="#/products"?await Fe(n):e==="#/invoice-templates"?await ze(n):e==="#/backup"?await ke(n):e==="#/login"?Ce(n):e==="#/logout"?Ue():e==="#/status"?await Ie(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{$e()});$e();
