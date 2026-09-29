(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))a(d);new MutationObserver(d=>{for(const o of d)if(o.type==="childList")for(const h of o.addedNodes)h.tagName==="LINK"&&h.rel==="modulepreload"&&a(h)}).observe(document,{childList:!0,subtree:!0});function t(d){const o={};return d.integrity&&(o.integrity=d.integrity),d.referrerPolicy&&(o.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?o.credentials="include":d.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(d){if(d.ep)return;d.ep=!0;const o=t(d);fetch(d.href,o)}})();const K="einv-token";function G(){try{return localStorage.getItem(K)}catch{return null}}function V(e){try{e?localStorage.setItem(K,e):localStorage.removeItem(K)}catch{}}async function L(e,n){const t=await q(e,{headers:{"content-type":"application/json"},...n});if(!t.ok){const a=await t.json().catch(()=>({}));throw new Error(a.error??`HTTP ${t.status}`)}return await t.json()}async function q(e,n){const t={...n?.headers??{}},a=G();a&&(t.authorization=`Bearer ${a}`);const d=await fetch(e,{...n,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function j(e,n){const t=await q(e);if(!t.ok){const h=await t.json().catch(()=>({}));throw new Error(h.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const a=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(a),o.download=d?.[1]??n,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function ve(e){const n=await q(e);if(!n.ok){const d=await n.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const t=await n.blob(),a=URL.createObjectURL(t);window.open(a,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(a),6e4)}const w={health:()=>L("/api/health"),settings:()=>L("/api/settings"),list:(e={})=>{const n=new URLSearchParams(e).toString();return L(`/api/invoices${n?`?${n}`:""}`)},get:e=>L(`/api/invoices/${e}`),create:e=>L("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>L(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>L(`/api/invoices/${e}/issue`,{method:"POST"}),issueBatch:e=>L("/api/invoices/issue-batch",{method:"POST",body:JSON.stringify({ids:e})}),deleteDraft:e=>L(`/api/invoices/${e}`,{method:"DELETE"}),markSent:(e,n)=>L(`/api/invoices/${e}/sent`,{method:"POST",body:JSON.stringify({channel:n})}),paymentCheck:(e,n)=>L(`/api/invoices/${e}/payment-check`,{method:"POST",body:JSON.stringify({outcome:n})}),reminders:()=>L("/api/reminders"),reminded:e=>L(`/api/invoices/${e}/reminded`,{method:"POST"}),invoiceTemplates:{list:()=>L("/api/invoice-templates"),create:(e,n)=>L("/api/invoice-templates",{method:"POST",body:JSON.stringify({name:e,body:n})}),update:(e,n)=>L(`/api/invoice-templates/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/invoice-templates/${e}`,{method:"DELETE"})},setPaid:(e,n,t)=>L(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:t})}),storno:(e,n)=>L(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>L(`/api/invoices/${e}/validate`,{method:"POST"}),rerender:(e,n)=>L(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:n})}),renders:e=>L(`/api/invoices/${e}/renders`),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>L("/api/company-profiles"),getDefault:()=>L("/api/company-profiles/default"),create:(e,n)=>L("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>L(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:e=>L(`/api/customers${e?`?q=${encodeURIComponent(e)}`:""}`),create:(e,n)=>L("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>L(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>L("/api/customers/number-assign",{method:"POST"})},products:{list:()=>L("/api/products"),create:e=>L("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>L(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${n?`?${n}`:""}`},csvUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.csv${n?`?${n}`:""}`},datevUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.datev${n?`?${n}`:""}`},restorePreview:(e,n)=>L("/api/restore/preview",{method:"POST",body:JSON.stringify({filename:e,dataBase64:n})})};function s(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function P(e){return`${Number(e).toFixed(2)} EUR`}function z(e){return e.split("/").pop()??e}async function W(e){let n;try{n=await w.restorePreview(e.filename,e.dataBase64)}catch(a){return alert(`Backup kann nicht gelesen werden: ${a.message}`),!1}const t=n.overwritten.length;return window.confirm([`Vorschau für ${e.filename?z(e.filename):"der hochgeladenen Datei"}:`,"",`  Im Backup:   ${n.invoices} Rechnungen (davon ${n.issued} ausgestellt)`,`  Aktuell:     ${n.currentInvoices} Rechnungen`,`  Dateien:     ${n.filesWritten}`,`  Neu dazu:    ${n.added.length} Nummern`,`  Überschrieben: ${t} Nummern ${t?`(${n.overwritten.slice(0,5).join(", ")}${n.overwritten.length>5?" …":""})`:""}`,"",t>0?"ACHTUNG: Rechnungen, die nur hier existieren, gehen unwiederbringlich verloren.":"Die aktuelle Datenbank wird durch das Backup ersetzt.","","Trotzdem wiederherstellen?"].join(`
`))}async function fe(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],t="",a=!1;async function d(){const h=await q("/api/backups");if(!h.ok)throw new Error("Backups konnten nicht geladen werden");n=await h.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(h=>`<div class="row" style="margin-top:8px">
				<strong>${s(z(h.filename))}</strong>
				<span class="muted">${s(h.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(h.size/1024)} KB</span>
				<button class="secondary" data-dl="${s(h.filename)}">Download</button>
				<button class="secondary" data-restore="${s(h.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const h=await q("/api/backups",{method:"POST"});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const b=await h.json();t=`Gesichert: ${z(b.filename)}`,a=!1,await d()}catch(h){t=h.message,a=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(h=>h.addEventListener("click",async()=>{const b=h.dataset.dl??"";try{await j(`/api/backups/file/${z(b)}`,z(b))}catch(v){t=v.message,a=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(h=>h.addEventListener("click",async()=>{const b=h.dataset.restore??"";if(await W({filename:b}))try{const v=await q("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:b})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const k=await v.json();t=`Wiederhergestellt: ${k.invoices} Rechnungen, ${k.templates} Vorlagen${k.fileErrors.length>0?` (${k.fileErrors.length} Dateifehler)`:""}`,a=!1,await d()}catch(v){t=v.message,a=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const h=e.querySelector("#b-file")?.files?.[0];if(!h){t="Bitte zuerst eine ZIP-Datei wählen",a=!0,o();return}let b;try{b=await new Promise((v,k)=>{const E=new FileReader;E.onload=()=>v(String(E.result).split(",")[1]),E.onerror=()=>k(new Error("Datei nicht lesbar")),E.readAsDataURL(h)})}catch(v){t=v.message,a=!0,o();return}if(await W({dataBase64:b}))try{const v=await q("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:b})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const k=await v.json();t=`Wiederhergestellt: ${k.invoices} Rechnungen, ${k.templates} Vorlagen`,a=!1,await d()}catch(v){t=v.message,a=!0,o()}})}try{await d()}catch(h){e.innerHTML=`<div class="card error">${s(h.message)}</div>`}}const _=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function A(e,n,t){const a=e[n],d=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(d)}" /></label>`}async function be(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,t="",a=!1;try{n=await w.company.getDefault(),n||(n=(await w.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${s(o.message)}</div>`;return}function d(){const o=n?.profile??_();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${s(n?.name??"Meine Firma")}" /></label>
			${A(o,"name","Firmenname")}
			${A(o,"street","Straße")}
			<div class="grid2">${A(o,"zip","PLZ")}${A(o,"city","Ort")}</div>
			<div class="grid2">${A(o,"country","Land")}${A(o,"email","E-Mail")}</div>
			<div class="grid2">${A(o,"phone","Telefon")}${A(o,"website","Webseite")}</div>
			<div class="grid2">${A(o,"vatId","USt-IdNr.")}${A(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${A(o,"bankName","Bankname")}${A(o,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${s(o.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(h=>`<div class="grid2"><label>Box ${h+1}<textarea data-fbox="${h}" rows="3">${s((o.footerBoxes??[])[h]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${h}">
					${["left","center","right"].map(b=>`<option value="${b}" ${(o.footerAlign??[])[h]===b||!(o.footerAlign??[])[h]&&b==="left"?"selected":""}>${b==="left"?"Links":b==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${a?"error":""}">${s(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const h={..._()};e.querySelectorAll("input[data-f]").forEach(k=>{h[k.dataset.f]=k.value});const b=[0,1,2,3].map(k=>e.querySelector(`textarea[data-fbox="${k}"]`)?.value??"");b.some(k=>k.trim()!=="")?(h.footerBoxes=b,h.footerAlign=[0,1,2,3].map(k=>{const E=e.querySelector(`select[data-falign="${k}"]`)?.value;return E==="center"||E==="right"?E:"left"})):(delete h.footerBoxes,delete h.footerAlign);const v=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await w.company.update(n.id,{name:v,profile:h}):n=await w.company.create(v,h),t="Gespeichert.",a=!1,d()}catch(k){t=k.message,a=!0,d()}})}d()}const X=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),ye=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function ge(e,n){const t=Number(e.replace(/\D+/g,"")),a=Number(n.replace(/\D+/g,"")),d=/\d/.test(e)&&Number.isFinite(t),o=/\d/.test(n)&&Number.isFinite(a);return d&&o&&t!==a?t-a:e.localeCompare(n,"de")}function $e(e,n){const t=n.endsWith("desc")?-1:1,a=[...e];return a.sort((d,o)=>n.startsWith("number")?ge(d.profile.customerNumber?.trim()??"",o.profile.customerNumber?.trim()??"")*t:d.name.localeCompare(o.name,"de")*t),a}function O(e,n,t){const a=e[n],d=Array.isArray(a)?a.join(`
`):a??"";return`<label>${t}<input data-f="${n}" value="${s(d)}" /></label>`}async function we(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],t=null,a=!1,d="",o=!1,h="name-asc",b="";async function v(){n=await w.customers.list(b||void 0),E()}function k(r,p){return`
		<label>Name (Anzeige)<input id="k-name" value="${s(p)}" /></label>
		${O(r,"name","Firmenname")}
		${O(r,"street","Straße")}
		<div class="grid2">${O(r,"zip","PLZ")}${O(r,"city","Ort")}</div>
		<div class="grid2">${O(r,"country","Land")}${O(r,"email","E-Mail")}</div>
		<div class="grid2">${O(r,"phone","Telefon")}${O(r,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${s(r.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function E(){const r=n.filter(m=>!m.profile.customerNumber?.trim()).length,p=$e(n,h);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<input id="k-q" placeholder="Suche (Name, Nummer, Ort)…" value="${s(b)}" style="max-width:240px" />
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${ye.map(m=>`<option value="${m.value}" ${m.value===h?"selected":""}>${m.label}</option>`).join("")}
			</select></label>
			${r>0?`<button class="secondary" id="k-number">${r} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${p.map(m=>`<div class="row" style="margin-top:8px">
				<strong>${s(m.name)}</strong>
				${m.profile.customerNumber?.trim()?`<span class="badge">${s(m.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${s(m.profile.city||"")}</span>
				<button class="secondary" data-edit="${m.id}">Bearbeiten</button>
				<button class="danger" data-del="${m.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${p.length} Kunden</p>
		</div>
		${t||a?`<div class="card"><h3>${a?"Neuer Kunde":s(t?.name??"")}</h3>
			${k(t?.profile??X(),t?.name??"")}
			${d?`<p class="${o?"error":""}">${s(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",m=>{h=m.target.value,E()});let c;e.querySelector("#k-q")?.addEventListener("input",m=>{b=m.target.value,c!==void 0&&clearTimeout(c),c=setTimeout(()=>{v()},250)}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{d=`${await w.customers.assignNumbers()} Kundennummer(n) vergeben.`,o=!1,await v()}catch(m){d=m.message,o=!0,E()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,a=!0,d="",E()}),e.querySelectorAll("[data-edit]").forEach(m=>m.addEventListener("click",()=>{t=n.find(S=>S.id===m.dataset.edit)??null,a=!1,d="",E()})),e.querySelectorAll("[data-del]").forEach(m=>m.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await w.customers.remove(m.dataset.del??""),await v()}catch(S){d=S.message,o=!0,E()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,a=!1,d="",E()}),e.querySelector("#k-save")?.addEventListener("click",()=>{i()})}async function i(){const r={...X()};e.querySelectorAll("input[data-f]").forEach(c=>{r[c.dataset.f]=c.value});const p=e.querySelector("#k-name")?.value.trim()||r.name.trim()||"Kunde";try{a?await w.customers.create(p,r):t&&await w.customers.update(t.id,{name:p,profile:r}),t=null,a=!1,d="",await v()}catch(c){d=c.message,o=!0,E()}}try{await v()}catch(r){e.innerHTML=`<div class="card error">${s(r.message)}</div>`}}function ke(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function Se(e){return`<span class="badge ${e}">${e}</span>`}async function Te(e){e.innerHTML=`
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
		<div id="list"></div>`;const n=e.querySelector("#f-status"),t=e.querySelector("#f-q"),a=e.querySelector("#f-sort"),d=e.querySelector("#f-order"),o=e.querySelector("#f-sent"),h=e.querySelector("#reminders");let b="desc",v=[];const k=e.querySelector("#list"),E=e.querySelector("#list-err");let i=0;function r(y){E.innerHTML=`<div class="card error">${s(y.message)}</div>`}async function p(y){const l=y.dataset.paid??"",g=y.checked;y.disabled=!0;try{await w.setPaid(l,g),E.innerHTML=`<div class="card muted">${g?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await c()}catch($){y.checked=!g,r($)}finally{y.disabled=!1}}async function c(){const y=++i,l={sort:a.value,order:b};n.value&&(l.status=n.value),t.value.trim()&&(l.q=t.value.trim()),o.value&&(l.sent=o.value);try{const g=await w.list(l);if(y!==i)return;v=g.filter(u=>u.status==="draft").map(u=>u.id);const $=e.querySelector("#f-issue-all");$.hidden=v.length===0,$.textContent=`Ausstellen (${v.length})`,k.innerHTML=g.map(u=>`<div class="card"><div class="row">
					${u.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${u.paid?`Ausgeglichen am ${s((u.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${s(u.id)}" ${u.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${s(u.number??"(Entwurf)")}</strong>${Se(u.status)}
					<span>${s(u.buyer.name||"—")}</span>
					<span>${P(u.totals.grossTotal)}</span>
					${u.skontoPercent>0&&!u.paid?`<span class="muted">${P(u.totals.grossTotal-ke(u))} bei ${s(u.skontoPercent)} % Skonto</span>`:""}
					${u.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					${u.status==="issued"?u.sentAt?`<span class="badge issued" title="Über ${s(u.sendChannel??"E-Mail")} versendet am ${s(u.sentAt.slice(0,10))}">versendet</span>`:`<button class="secondary" data-sent="${s(u.id)}" title="Als versendet markieren">nicht versendet</button>`:""}
					<a href="#/invoices/${s(u.id)}">Ansehen</a>
					${u.status==="draft"?`<a href="#/edit/${s(u.id)}">Bearbeiten</a>`:""}
					${u.status==="draft"?`<button class="secondary" data-del="${s(u.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',k.querySelectorAll("[data-paid]").forEach(u=>u.addEventListener("change",()=>{p(u)})),k.querySelectorAll("[data-sent]").forEach(u=>u.addEventListener("click",async()=>{try{await w.markSent(u.dataset.sent??"","E-Mail"),await c()}catch(N){r(N)}})),k.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",async()=>{if(window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen."))try{await w.deleteDraft(u.dataset.del??""),E.innerHTML='<div class="card muted">Entwurf gelöscht.</div>',await c()}catch(N){r(N)}}))}catch(g){if(y!==i)return;k.innerHTML=`<div class="card error">${s(g.message)}</div>`}}n.onchange=()=>{c()},a.onchange=()=>{c()},o.onchange=()=>{c()},d.onclick=()=>{b=b==="desc"?"asc":"desc",d.textContent=b==="desc"?"↓ absteigend":"↑ aufsteigend",c()};let m;t.oninput=()=>{m!==void 0&&clearTimeout(m),m=setTimeout(()=>{c()},250)},e.querySelector("#f-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${v.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`))try{const y=await w.issueBatch(v);E.innerHTML=`<div class="card ${y.failed.length?"error":"muted"}">${y.issued.length} ausgestellt${y.failed.length?`, ${y.failed.length} fehlgeschlagen: ${s(y.failed[0].error??"")}`:""}.</div>`,await c()}catch(y){r(y)}});const S=()=>{const y={};return n.value&&(y.status=n.value),t.value.trim()&&(y.q=t.value.trim()),y};e.querySelector("#f-export")?.addEventListener("click",async()=>{try{await j(w.exportUrl(S()),"export.xlsx")}catch(y){r(y)}}),e.querySelector("#f-csv")?.addEventListener("click",async()=>{try{await j(w.csvUrl(S()),"rechnungen.csv")}catch(y){r(y)}}),e.querySelector("#f-datev")?.addEventListener("click",async()=>{try{await j(w.datevUrl(S()),"rechnungen.datev")}catch(y){r(y)}});async function f(){try{const y=await w.reminders();if(!y.length){h.innerHTML="";return}h.innerHTML=`<div class="card"><div class="row">
				<strong>Überfällig: ${y.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${y.map(l=>`<div class="card" style="flex:1">
						<strong>${s(l.invoice.number??"")}</strong> ${s(l.invoice.buyer.name)}
						<br /><span class="muted">${l.overdueDays} Tage überfällig · Stufe ${l.level}${l.skontoActive?` · Skonto ${s(l.invoice.skontoPercent)} % noch möglich bis ${s(l.invoice.skontoDueDate??"")}`:""}</span>
						<br /><a href="#/invoices/${s(l.invoice.id)}">Ansehen</a>
					</div>`).join("")}</div></div>`}catch{}}await c(),await f()}function F(e){return Math.round((e+Number.EPSILON)*100)/100}function Ee(e){const n=(e??"").trim(),[t,a]=n.split(".."),d=o=>/^\d{4}-\d{2}-\d{2}$/.test(o??"")?`${o.slice(8,10)}.${o.slice(5,7)}.${o.slice(0,4)}`:o??"";return a?`${d(t)} – ${d(a)}`:d(t)}async function Le(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let a=await w.get(n);const o=(Array.isArray(a.lines)?a.lines:[]).map(i=>{const r=Math.min(Math.max(Number(i.discountPercent)||0,0),100),p=Number(i.quantity)||0,c=Number(i.unitPriceNet)||0;return{line:i,discount:r,gross:F(p*c),net:F(p*c*(1-r/100))}}),h=o.some(i=>i.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${s(a.number??"(Entwurf)")}</strong>
				<span class="badge ${a.status}">${a.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${s(a.seller.name)}<br />${s(a.seller.street)}<br />${s(a.seller.zip)} ${s(a.seller.city)}</div>
				<div><strong>Käufer</strong><br />${s(a.buyer.name)}<br />${s(a.buyer.street)}<br />${s(a.buyer.zip)} ${s(a.buyer.city)}${a.buyer.email?`<br />${s(a.buyer.email)}`:""}</div>
			</div>
			<p>Ausgestellt: ${s(a.issueDate)} · Leistung: ${s(Ee(a.deliveryDate))}${a.dueDate?` · Fällig: ${s(a.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${h?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${o.map((i,r)=>`<tr>
					<td>${r+1}</td><td>${s(i.line.description)}${i.line.sku?` (${s(i.line.sku)})`:""}</td>
					<td class="r">${s(i.line.quantity)} ${s(i.line.unit)}</td>
					<td class="r">${P(Number(i.line.unitPriceNet))}</td>
					${h?`<td class="r">${i.discount>0?`${s(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?P(F(i.gross-i.net)):"–"}</td>`:""}
					<td class="r">${s(i.line.vatRate)} %</td><td class="r"><strong>${P(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${P(a.totals.grossTotal)}</strong> <span class="muted">(netto ${P(a.totals.netTotal)} + USt ${P(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${s(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?`<a class="btn" href="#/edit/${s(a.id)}">Bearbeiten</a>`:""}
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${a.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${a.paid?"checked":""} /><span>bezahlt${a.paid&&a.paidAt?` (${s(a.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${a.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				${a.status==="issued"?a.sentAt?`<span class="badge issued" title="${s(a.sendChannel??"E-Mail")} am ${s(a.sentAt.slice(0,10))}">versendet</span>`:'<button class="secondary" id="d-sent" title="Als versendet markieren">Als versendet markieren</button>':""}
				${a.status!=="draft"&&a.pdfPath?'<button class="secondary" id="d-rerender" title="Erzeugt die PDF neu, z. B. nach einer Layout-Korrektur. Der Inhalt der Rechnung bleibt unverändert, das Original wird archiviert.">Neu rendern</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
			${a.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
			${a.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
			${a.status==="issued"&&a.pdfPath?'<button class="secondary" id="d-mail">E-Mail (PDF)</button>':""}
			${a.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
			${a.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div></div>`;const b=e.querySelector("#d-out"),v=i=>{b.innerHTML=`<p class="error">${s(i.message)}</p>`},k=e.querySelector("#d-history"),E=async()=>{if(a.status!=="draft")try{const i=await w.renders(a.id);if(!i.length){k.innerHTML="";return}k.innerHTML=`<details><summary>Neu gerendert (${i.length})</summary><ul>${i.map(r=>`<li>${s(r.createdAt.slice(0,16).replace("T"," "))} – ${s(r.artifact.toUpperCase())}${r.reason?` – ${s(r.reason)}`:""}${r.previousPath?` – Original: <code>${s(r.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await E(),e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const r=i.dataset.dl,p=r==="pdf"?w.pdfUrl(a.id):r==="xml"?w.xmlUrl(a.id):w.xlsxUrl(a.id);try{await j(p,`${a.number??"rechnung"}.${r}`)}catch(c){v(c)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ve(w.pdfUrl(a.id))}catch(i){v(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{b.innerHTML='<p class="muted">Validiere…</p>';try{const i=await w.validate(a.id);b.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(r=>`<li class="error">${s(r)}</li>`).join("")}</ul>`}catch(i){b.innerHTML=`<p class="error">${s(i.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async i=>{const r=i.target,p=r.checked;r.disabled=!0;try{a=await w.setPaid(a.id,p),b.innerHTML=`<p style="color:var(--ok)">${p?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(c){r.checked=!p,b.innerHTML=`<p class="error">${s(c.message)}</p>`}finally{r.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const i=(a.buyer.email??"").trim(),r=`${a.documentTitle??"Rechnung"} ${a.number??""}`.trim(),p=`Guten Tag ${a.buyer.name||""},

anbei erhalten Sie ${r} vom ${a.issueDate}.
Gesamtbetrag: ${P(a.totals.grossTotal)}.
${a.dueDate?`Bitte überweisen bis ${a.dueDate}.
`:""}
Mit freundlichen Grüßen
${a.seller.name}
`;try{await j(w.pdfUrl(a.id),`${a.number??"rechnung"}.pdf`)}catch(m){v(m);return}const c=`mailto:${i}?subject=${encodeURIComponent(r)}&body=${encodeURIComponent(p)}`;window.location.href=c,b.innerHTML=i?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${s(i)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-sent")?.addEventListener("click",async()=>{try{a=await w.markSent(a.id,"E-Mail"),b.innerHTML=`<p style="color:var(--ok)">Als versendet markiert${a.sentAt?` (${s(a.sentAt.slice(0,10))})`:""}.</p>`,e.querySelector("#d-sent")?.remove()}catch(i){v(i)}}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const i=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(i!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?")){b.innerHTML='<p class="muted">Rendere neu…</p>';try{const r=await w.rerender(a.id,i.trim()||void 0);a=r.invoice,b.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${r.archivedPath?` Das Original liegt als <code>${s(r.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await E();const p=e.querySelector("#d-duty");if(a.status!=="draft"&&!a.paid)try{const{duty:c,checked:m}=await w.paymentCheck(a.id);c.required&&!m?(p.innerHTML=`<p class="error">${s(c.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`,e.querySelector("#d-duty-ok")?.addEventListener("click",async()=>{try{await w.paymentCheck(a.id,"geprüft"),p.innerHTML='<p style="color:var(--ok)">Zahlungsweise geprüft.</p>'}catch(S){v(S)}})):m&&(p.innerHTML=`<p class="muted">Zahlungsweise geprüft${a.paymentCheckedAt?` am ${s(a.paymentCheckedAt.slice(0,10))}`:""}.</p>`)}catch{}}catch(r){b.innerHTML=`<p class="error">${s(r.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const i=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(i!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:r}=await w.storno(a.id,i.trim()||void 0);location.hash=`#/edit/${r.id}`,location.reload()}catch(r){b.innerHTML=`<p class="error">${s(r.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await w.issue(a.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){b.innerHTML=`<p class="error">${s(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${s(t.message)}</div>`}}function Y(e){return{lines:(Array.isArray(e.lines)?e.lines:[]).filter(t=>t&&typeof t.description=="string"&&t.description.trim()!==""),paymentTerms:typeof e.paymentTerms=="string"?e.paymentTerms:"",skontoPercent:Number(e.skontoPercent)||0,notes:typeof e.notes=="string"?e.notes:""}}function Q(e){return e.reduce((n,t)=>{const a=Math.min(Math.max(Number(t.discountPercent)||0,0),100),d=(Number(t.quantity)||0)*(Number(t.unitPriceNet)||0);return n+d*(1-a/100)},0)}function Ne(e,n,t){return`<div class="card line" style="background:var(--bg)">
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
	</div>`}const Pe=[19,7,0];async function qe(e){e.innerHTML='<div class="card">Lade Rechnungsvorlagen…</div>';let n=[],t=null,a=[],d="",o=0,h="",b="",v=!1;async function k(){n=await w.invoiceTemplates.list(),p()}function E(c){t=c;const m=Y(c?.body??{});a=m.lines.length?m.lines.map(S=>({...S})):[i()],d=m.paymentTerms,o=m.skontoPercent,h=m.notes,b="",v=!1,p()}function i(){return{description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}}function r(){return a.map((c,m)=>{const S=(f,y)=>{const l=e.querySelector(`[data-tpl-line="${m}.${f}"]`);return l?l.value:y};return{description:String(S("description",c.description)),sku:String(S("sku","")),quantity:Number(S("quantity",c.quantity))||0,unit:String(S("unit",c.unit)),unitPriceNet:Number(S("unitPriceNet",c.unitPriceNet))||0,vatRate:Number(S("vatRate",c.vatRate))||0}})}function p(){const c=Q(r());e.innerHTML=`
		<div class="card"><div class="row"><strong>Rechnungsvorlagen</strong>
			<button id="t-new">+ Neue Vorlage</button>
			${b?`<span class="${v?"error":"muted"}">${s(b)}</span>`:""}</div>
			<p class="muted">Wiederkehrende Rechnungen (Wartung, Honorar, Abo) einmal anlegen und im Assistenten
				übernehmen. Käufer und Datum werden bewusst nicht gespeichert.</p>
			${n.map(m=>{const S=Y(m.body);return`<div class="row" style="margin-top:8px">
						<strong>${s(m.name)}</strong>
						<span class="muted">${S.lines.length} Position(en) · ${P(Q(S.lines))}${S.skontoPercent?` · ${S.skontoPercent} % Skonto`:""}</span>
						<button class="secondary" data-tpl-edit="${s(m.id)}">Bearbeiten</button>
						<button class="danger" data-tpl-del="${s(m.id)}">Löschen</button>
					</div>`}).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${t.id?s(t.name):"Neue Vorlage"}</h3>
					<label>Name<input id="t-name" value="${s(t.name)}" placeholder="z. B. Monatliche Wartung" /></label>
					<label>Zahlungsbedingungen<input id="t-terms" value="${s(d)}" placeholder="Zahlbar innerhalb von 14 Tagen" /></label>
					<div class="grid2">
						<label>Skonto %<input id="t-skonto" type="number" min="0" max="20" step="0.5" value="${s(o)}" /></label>
						<label>&nbsp;</label>
					</div>
					<label>Notiz<textarea id="t-notes" rows="2">${s(h)}</textarea></label>
					<p class="muted">Summe netto: <strong>${P(c)}</strong></p>
					${a.map((m,S)=>Ne(m,S,Pe)).join("")}
					<button class="secondary" id="t-add-line">+ Position</button>
					<p><button id="t-save">Speichern</button>
					<button class="secondary" id="t-cancel">Abbrechen</button></p>
				</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",()=>E(null)),e.querySelectorAll("[data-tpl-edit]").forEach(m=>m.addEventListener("click",()=>{const S=n.find(f=>f.id===m.dataset.tplEdit);S&&E(S)})),e.querySelectorAll("[data-tpl-del]").forEach(m=>m.addEventListener("click",async()=>{if(window.confirm("Vorlage löschen? Bereits ausgestellte Rechnungen bleiben unverändert."))try{await w.invoiceTemplates.remove(m.dataset.tplDel??""),b="Vorlage gelöscht.",v=!1,await k()}catch(S){b=S.message,v=!0,p()}})),e.querySelectorAll("[data-tpl-del-line]").forEach(m=>m.addEventListener("click",()=>{const S=Number(m.dataset.tplDelLine);a.splice(S,1),a.length===0&&a.push(i()),p()})),e.querySelector("#t-add-line")?.addEventListener("click",()=>{a.push(i()),p()}),e.querySelector("#t-cancel")?.addEventListener("click",()=>E(null)),e.querySelector("#t-save")?.addEventListener("click",async()=>{const m=e.querySelector("#t-name")?.value.trim()??"";if(!m){b="Bitte einen Namen vergeben.",v=!0,p();return}const S=r().filter(y=>y.description.trim()!=="");if(S.length===0){b="Mindestens eine Position mit Bezeichnung nötig.",v=!0,p();return}const f={lines:S,paymentTerms:e.querySelector("#t-terms")?.value??"",skontoPercent:Number(e.querySelector("#t-skonto")?.value)||0,notes:e.querySelector("#t-notes")?.value??""};try{t?.id?await w.invoiceTemplates.update(t.id,{name:m,body:f}):await w.invoiceTemplates.create(m,f),b=`Gespeichert: ${m}`,v=!1,t=null,await k()}catch(y){b=y.message,v=!0,p()}})}try{await k()}catch(c){e.innerHTML=`<div class="card error">${s(c.message)}</div>`}}function De(e){const n=G();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${s(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";V(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{V(null),location.hash="#/login",location.reload()})}function Ae(){V(null),location.hash="#/login"}async function xe(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],t=null,a=!1,d="",o=!1;async function h(){n=await w.products.list(),v()}function b(i){const r=p=>s(p??"");return`
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
		</select></label>`}function v(){e.innerHTML=`
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
			${b(t??{})}
			${d?`<p class="${o?"error":""}">${s(d)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,a=!0,d="",v()}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{t=n.find(r=>r.id===i.dataset.edit)??null,a=!1,d="",v()})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await w.products.remove(i.dataset.del??""),await h()}catch(r){d=r.message,o=!0,v()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,a=!1,d="",v()}),e.querySelector("#p-save")?.addEventListener("click",()=>{E()})}function k(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function E(){const i=k();try{a?await w.products.create(i):t&&await w.products.update(t.id,i),t=null,a=!1,d="",await h()}catch(r){d=r.message,o=!0,v()}}try{await h()}catch(i){e.innerHTML=`<div class="card error">${s(i.message)}</div>`}}async function Me(e){try{const n=await w.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(n.version)} · Schema: ${s(String(n.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(n.message)}</div>`}}const Re=["title","meta","parties","positions","totals"],ee=["payment","notes"],Oe=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function Be(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],t=null,a="",d=[];try{const i=await q("/api/company-profiles");i.ok&&(d=await i.json())}catch{}async function o(){n=await h(),v()}async function h(){const i=await q("/api/templates");if(!i.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await i.json()}function b(i){const r=i.definition,p=(c,m,S)=>`<label><input type="checkbox" data-f="blocks.${c}" ${r.blocks[c]?"checked":""} ${S?"disabled":""} style="width:auto" /> ${m}${S?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(i.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${d.map(c=>`<option value="${s(c.id)}" ${i.definition.companyId===c.id?"selected":""}>${s(c.name)}</option>`).join("")}
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
		${Re.map(c=>p(c,`Block ${c}`,!0)).join("")}
		${ee.map(c=>p(c,`Block ${c}`,!1)).join("")}
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
				${Oe.map(c=>`<option value="${c.value}" ${r.logo?.position===c.value?"selected":""}>${c.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${r.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${s(r.logo.path)}</p>`:""}`}function v(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${n.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${s(i.name)}</strong><span class="muted">v${i.version}</span>
				${i.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${i.id}">Vorschau</button>
				${i.isDefault?"":`<button class="secondary" data-def="${i.id}">Standard</button>`}
				${i.isDefault?"":`<button class="danger" data-del="${i.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${s(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${b(t)}
			${a?`<p class="error">${s(a)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const p=(await(await q("/api/templates")).json())[0];if(!p){a="Keine Basisvorlage vorhanden",v();return}t={...structuredClone(p),id:"neu",name:"Neu",version:1,isDefault:!1},a="",v()}catch(i){a=i.message,v()}}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{const r=n.find(p=>p.id===i.dataset.edit);r&&(t=structuredClone(r),a="",v())})),e.querySelectorAll("[data-prev]").forEach(i=>i.addEventListener("click",async()=>{const r=n.find(p=>p.id===i.dataset.prev);if(r)try{const p=await q("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!p.ok){const m=await p.json().catch(()=>({}));throw new Error(m.error??"Vorschau fehlgeschlagen")}const c=await p.blob();window.open(URL.createObjectURL(c),"_blank")}catch(p){a=p.message,v()}})),e.querySelectorAll("[data-def]").forEach(i=>i.addEventListener("click",async()=>{try{if(!(await q(`/api/templates/${i.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(r){a=r.message,v()}})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{const r=await q(`/api/templates/${i.dataset.del}`,{method:"DELETE"});if(!r.ok){a=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",v();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,a="",v()}),e.querySelector("#t-save")?.addEventListener("click",()=>{E()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const i=k();if(i)try{const r=await q("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!r.ok){const p=await r.json().catch(()=>({}));throw new Error(p.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){a=r.message,v()}})}function k(){if(!t)return null;const i=structuredClone(t.definition);i.name=(e.querySelector("#t-name")?.value??i.name).trim(),i.colors.primary=e.querySelector("#t-c1")?.value??i.colors.primary,i.colors.text=e.querySelector("#t-c2")?.value??i.colors.text;for(const p of ee)i.blocks[p]=e.querySelector(`[data-f="blocks.${p}"]`)?.checked??i.blocks[p];for(const p of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])i[p]=e.querySelector(`[data-f="${p}"]`)?.checked??!1;for(const p of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const c=e.querySelector(`[data-f="${p}"]`);c&&(i[p]=c.checked)}i.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?i.companyId=r:delete i.companyId,i.introText=e.querySelector("#t-intro")?.value??"",i.closingText=e.querySelector("#t-closing")?.value??"",i.signatureName=e.querySelector("#t-sign")?.value??"",i.headerExtra=e.querySelector("#t-hextra")?.value??"",i.logo&&(i.logo.position=e.querySelector("#t-lpos")?.value??"right",i.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),i.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:i.name,definition:i}}async function E(){const i=k();if(!i)return;const r=i.definition;try{let p=t.id;if(p==="neu"){const m=await q("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");p=(await m.json()).id}else{const m=await q(`/api/templates/${p}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const c=e.querySelector("#t-logo")?.files?.[0];if(c){const m=await new Promise((f,y)=>{const l=new FileReader;l.onload=()=>f(String(l.result).split(",")[1]),l.onerror=()=>y(new Error("Datei nicht lesbar")),l.readAsDataURL(c)}),S=await q(`/api/templates/${p}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:c.name,mime:c.type,dataBase64:m})});if(!S.ok)throw new Error((await S.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,a="",await o()}catch(p){a=p.message,v()}}try{await o()}catch(i){e.innerHTML=`<div class="card error">${s(i.message)}</div>`}}const te=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),U=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:C.defaultVatRate});let C={defaultVatRate:19,defaultPaymentTerms:""};const Z=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],ne="__own__";function ce(e,n){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+n),t.toISOString().slice(0,10)}function oe(e){return!!e&&!de(e)}function de(e){return!!e&&Z.some(n=>n.text===e)}function ue(e){return Z.find(n=>n.text===e)?.days??null}function ae(e){if(!e.dueAuto)return;const n=ue(e.paymentTerms);n!==null&&(e.dueDate=ce(e.issueDate,n))}function R(e){return Math.round((e+Number.EPSILON)*100)/100}function se(e){const n=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,a=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return R(n*t*(1-a/100))}function je(e){return(e??"").trim().split("..")[0]??""}function He(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const B="einv-wizard-v1",me="einv-employee";function pe(){try{return localStorage.getItem(me)??""}catch{return""}}function ie(){return new Date().toISOString().slice(0,10)}function J(){return{step:0,seller:te(),buyer:te(),lines:[U()],issueDate:ie(),deliveryDate:ie(),dueDate:"",employee:pe(),documentTitle:"Rechnung",notes:"",paymentTerms:C.defaultPaymentTerms,termsCustom:oe(C.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function I(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function ze(){try{const e=localStorage.getItem(B);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{...J(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function re(e,n,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${s(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Ue=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Ce={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function le(e,n){let t=J();const a=!!n;let d=[],o=[],h=[],b=[],v=!1;if(w.settings().then(f=>{C={defaultVatRate:Number(f.defaultVatRate)||19,defaultPaymentTerms:f.defaultPaymentTerms??""}}).catch(()=>{}),n){e.innerHTML='<div class="card">Lade Entwurf…</div>',w.get(n).then(f=>{if(f.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${s(f.status)}).</div>`;return}t={...J(),seller:f.seller,buyer:f.buyer,lines:f.lines.length>0?f.lines:[U()],issueDate:f.issueDate,deliveryDate:f.deliveryDate,dueDate:f.dueDate??"",employee:f.employeeCode??pe(),documentTitle:f.documentTitle,notes:f.notes??"",paymentTerms:f.paymentTerms??C.defaultPaymentTerms,termsCustom:oe(f.paymentTerms),skontoPercent:f.skontoPercent??0,skontoDueDate:f.skontoDueDate??"",draftId:f.id},E(),c()}).catch(f=>{e.innerHTML=`<div class="card error">${s(f.message)}</div>`});return}const k=ze();if(k&&I(k)&&!k.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${s(k.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=k,E(),c()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(B),E(),c()});return}k&&I(k)&&(t=k),E(),I(t)||w.company.getDefault().then(f=>{f&&!t.seller.name.trim()&&f.profile.name.trim()&&(t.seller={...t.seller,...f.profile},t.selectedCompany=f.id,c(!0))}).catch(()=>{});function E(){w.company.list().then(f=>{d=f,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&c()}).catch(()=>{}),w.customers.list().then(f=>{o=f,t.step===1&&!e.querySelector("#w-customer")&&c()}).catch(()=>{}),w.products.list().then(f=>{h=f,t.step===2&&!e.querySelector("#w-catalog")&&c()}).catch(()=>{}),w.invoiceTemplates.list().then(f=>{b=f,t.step===2&&!e.querySelector("#w-inv-tpl")&&c()}).catch(()=>{})}function i(){try{if(a)return;if(!t.dirty){localStorage.removeItem(B);return}localStorage.setItem(B,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function r(){e.querySelectorAll("input[data-p]").forEach($=>{const u=$.dataset.p==="seller"?t.seller:t.buyer;u[$.dataset.f]=$.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach($=>{const[u,N]=$.dataset.l.split("."),D=t.lines[Number(u)];if(D)if(N==="quantity"||N==="unitPriceNet"||N==="vatRate"||N==="discountPercent"){const M=Number($.value),H=Number.isFinite(M)?M:0;D[N]=N==="discountPercent"?Math.min(Math.max(H,0),100):H}else D[N]=$.value});const f=$=>e.querySelector(`#${$}`)?.value??"",y=()=>{const $=f("w-delivery");if(!$)return;const u=f("w-delivery-to");t.deliveryDate=u&&u!==$?`${$}..${u}`:$};t.issueDate=f("w-issue")||t.issueDate,y(),e.querySelector("#w-due")&&(t.dueDate=f("w-due")),ae(t),e.querySelector("#w-employee")&&(t.employee=f("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=f("w-title")||t.documentTitle);const l=e.querySelector("#w-notes");l&&(t.notes=l.value);const g=e.querySelector("#w-terms");if(g&&(t.paymentTerms=g.value),e.querySelector("#w-skonto")){const $=Number(f("w-skonto"));t.skontoPercent=Number.isFinite($)?Math.min(Math.max($,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=f("w-skonto-due")),i()}function p(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((y,l)=>`<span class="${l===t.step?"on":""}">${l+1}. ${y}</span>`).join("")}</div>`}function c(f=!1){f||r();let y="";if(t.step===0&&(y=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(l=>`<option value="${s(l.id)}" ${t.selectedCompany===l.id?"selected":""}>${s(l.name)}${l.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${re("seller",t.seller,!0)}</div>`),t.step===1&&(y=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(l=>`<option value="${s(l.id)}" ${t.selectedCustomer===l.id?"selected":""}>${s(l.name)}${l.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${re("buyer",t.buyer,!1)}</div>`),t.step===2&&(y=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Ue.map(l=>`<option ${l===t.documentTitle?"selected":""}>${l}</option>`).join("")}
				</select></label>
				${b.length>0?`<label>Wiederkehrende Rechnung<select id="w-inv-tpl">
							<option value="">– eigene Positionen –</option>
							${b.map(l=>`<option value="${s(l.id)}">${s(l.name)}</option>`).join("")}
						</select></label>
						<p class="muted">Übernimmt Positionen, Termine, Zahlungsbedingungen und Skonto. Käufer und Datum bleiben deine Angaben.</p>`:'<p class="muted">Tipp: Unter <a href="#/invoice-templates">Rechnungsvorlagen</a> eine Vorlage anlegen, um wiederkehrende Rechnungen nicht jedes Mal neu einzutippen.</p>'}
				${h.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${h.map(l=>`<option value="${s(l.id)}">${s(l.sku?`${l.sku} · `:"")}${s(l.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((l,g)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${g+1}</span><strong>Position ${g+1}</strong>
						<span class="line-sum">${P(se(l))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${g}.description" value="${s(l.description)}" /></label>
						<label>Art.Nr.<input data-l="${g}.sku" value="${s(l.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${g}.details" rows="1">${s(l.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${g}.quantity" type="number" min="0" step="any" value="${s(l.quantity)}" /></label>
						<label>Einheit<input data-l="${g}.unit" value="${s(l.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${g}.unitPriceNet" type="number" min="0" step="0.01" value="${s(l.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${g}.discountPercent" type="number" min="0" max="100" step="0.1" value="${s(l.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${g}.vatRate">
							${[19,7,0].map($=>`<option ${$===Number(l.vatRate)?"selected":""}>${$}</option>`).join("")}
						</select></label>
						${Number(l.vatRate)===0?`<label>Steuerbefreiung<select data-l="${g}.exemptionCategory">
								${["E","AE","K","G","O"].map($=>`<option ${(l.exemptionCategory??"E")===$?"selected":""} value="${$}">${$} — ${Ce[$]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${g}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${s(l.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${g}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${s(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${s(t.dueDate)}" />${t.dueAuto?' <span class="muted">(aus Zahlungsbedingung)</span>':""}</label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${s(je(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${s(He(t.deliveryDate))}" /></label>
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
					${Z.map(l=>`<option value="${s(l.text)}" ${!t.termsCustom&&t.paymentTerms===l.text?"selected":""}>${s(l.text)}</option>`).join("")}
					<option value="${ne}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${s(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const l=t.lines.map(T=>{const x=Math.min(Math.max(Number(T.discountPercent)||0,0),100);return{...T,discount:x,gross:R((Number(T.quantity)||0)*(Number(T.unitPriceNet)||0)),net:se(T)}}).filter(T=>T.description.trim()!==""||T.gross>0),g=new Map;for(const T of l)g.set(Number(T.vatRate)||0,R((g.get(Number(T.vatRate)||0)??0)+T.net));const $=[...g.entries()].sort(([T],[x])=>T-x).map(([T,x])=>({rate:T,net:x,tax:R(x*T/100)})),u=R($.reduce((T,x)=>T+x.net,0)),N=R($.reduce((T,x)=>T+x.tax,0)),D=R(u+N),M=R(D*(Number(t.skontoPercent)||0)/100),H=l.some(T=>T.discount>0);y=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${s(t.documentTitle)}</strong> · ${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${l.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${H?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${l.map(T=>`<tr>
							<td>${s(T.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${s(T.quantity)} ${s(T.unit)}</td>
							<td class="r">${P(T.unitPriceNet)}</td>
							${H?`<td class="r">${T.discount>0?`${s(T.discount)} %`:"–"}</td><td class="r">${T.discount>0?P(R(T.gross-T.net)):"–"}</td>`:""}
							<td class="r">${s(T.vatRate)} %</td><td class="r"><strong>${P(T.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${P(u)}</td></tr>
						${$.map(T=>`<tr class="sub"><td class="lbl">USt ${s(T.rate)} % auf ${P(T.net)}</td><td class="r">${P(T.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${P(D)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${s(t.skontoPercent)} % Skonto bis ${s(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${P(M)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${P(D-M)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${p()}${y}
			${t.error?`<div class="card error">${s(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,c()}),e.querySelector("#w-terms-select")?.addEventListener("change",l=>{const g=l.target.value;if(g===ne)t.termsCustom=!0,de(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=g;const $=ue(g);$!==null?(t.dueAuto=!0,t.dueDate=ce(t.issueDate,$)):t.dueAuto=!1}c()}),e.querySelector("#w-due")?.addEventListener("change",()=>{r(),t.dueAuto=!1,c()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const l=e.querySelector("#w-company")?.value??"",g=d.find($=>$.id===l);g?(t.seller={...t.seller,...g.profile},t.selectedCompany=g.id,c(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const l=e.querySelector("#w-customer")?.value??"",g=o.find($=>$.id===l);g?(t.buyer={...t.buyer,...g.profile},t.selectedCustomer=g.id,c(!0)):t.selectedCustomer=null}),e.querySelector("#w-inv-tpl")?.addEventListener("change",l=>{const g=l.target.value,$=b.find(N=>N.id===g);if(!$||t.lines.length>0&&!window.confirm(`Positionen durch "${$.name}" ersetzen?`))return;const u=$.body;Array.isArray(u.lines)&&u.lines.length>0&&(t.lines=u.lines.map(N=>({...U(),...N}))),typeof u.paymentTerms=="string"&&(t.paymentTerms=u.paymentTerms),typeof u.notes=="string"&&(t.notes=u.notes),typeof u.documentTitle=="string"&&u.documentTitle&&(t.documentTitle=u.documentTitle),typeof u.skontoPercent=="number"&&u.skontoPercent>0&&(t.skontoPercent=u.skontoPercent),typeof u.dueDate=="string"&&(t.dueDate=u.dueDate),typeof u.deliveryDate=="string"&&(t.deliveryDate=u.deliveryDate),c(!0)}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,c()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(B),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.push(U()),c()}),e.querySelector("#w-take")?.addEventListener("click",()=>{r();const l=e.querySelector("#w-catalog")?.value??"",g=h.find($=>$.id===l);if(g){const $={description:g.name,sku:g.sku||void 0,details:g.details||void 0,quantity:1,unit:g.unit,unitPriceNet:g.unitPriceNet,vatRate:g.vatRate},u=t.lines.findIndex(N=>!N.description.trim()&&!(N.sku??"").trim()&&!(N.details??"").trim()&&N.unitPriceNet===0);u>=0?t.lines[u]=$:t.lines.push($),t.dirty=!0}c(!0)}),e.querySelectorAll("[data-del]").forEach(l=>l.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.splice(Number(l.dataset.del),1),t.lines.length===0&&t.lines.push(U()),c(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{m(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&m(!0)})}async function m(f){if(!v){v=!0;try{r(),t.error="";const y={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(me,t.employee.trim())}catch{}let l;t.draftId?l=await w.update(t.draftId,y):(l=await w.create(y),t.draftId=l.id),f&&(l=await w.issue(l.id));try{localStorage.removeItem(B)}catch{}location.hash=`#/invoices/${l.id}`}catch(l){t.error=l.message,c()}}finally{v=!1}}}e.addEventListener("input",()=>{try{S()}catch{}});function S(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(u=>{const N=u.dataset.p==="seller"?t.seller:t.buyer;N[u.dataset.f]=u.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(u=>{const[N,D]=u.dataset.l.split("."),M=t.lines[Number(N)];M&&(D==="quantity"||D==="unitPriceNet"||D==="vatRate"||D==="discountPercent"?M[D]=Number(u.value):M[D]=u.value)});const f=u=>e.querySelector(`#${u}`)?.value??"",y=f("w-issue"),l=f("w-delivery"),g=f("w-delivery-to");y&&(t.issueDate=y),l&&(t.deliveryDate=g&&g!==l?`${l}..${g}`:l),e.querySelector("#w-due")&&(t.dueDate=f("w-due")),ae(t),e.querySelector("#w-employee")&&(t.employee=f("w-employee"));const $=f("w-title");if($&&(t.documentTitle=$),e.querySelector("#w-skonto")){const u=Number(f("w-skonto"));t.skontoPercent=Number.isFinite(u)?Math.min(Math.max(u,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=f("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,i()}c()}const Fe=document.querySelector("#app");function Ie(e){const n=!!G(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/invoice-templates","Rechnungsvorlagen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];Fe.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([a,d])=>`<a href="${a}" class="${e===a||a==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function he(){const e=location.hash||"#/";Ie(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await Te(n):e==="#/new"?le(n):e.startsWith("#/edit/")?le(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Le(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await Be(n):e==="#/company"?await be(n):e==="#/customers"?await we(n):e==="#/products"?await xe(n):e==="#/invoice-templates"?await qe(n):e==="#/backup"?await fe(n):e==="#/login"?De(n):e==="#/logout"?Ae():e==="#/status"?await Me(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{he()});he();
