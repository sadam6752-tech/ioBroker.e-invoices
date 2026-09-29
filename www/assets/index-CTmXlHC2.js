(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))s(o);new MutationObserver(o=>{for(const u of o)if(u.type==="childList")for(const h of u.addedNodes)h.tagName==="LINK"&&h.rel==="modulepreload"&&s(h)}).observe(document,{childList:!0,subtree:!0});function t(o){const u={};return o.integrity&&(u.integrity=o.integrity),o.referrerPolicy&&(u.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?u.credentials="include":o.crossOrigin==="anonymous"?u.credentials="omit":u.credentials="same-origin",u}function s(o){if(o.ep)return;o.ep=!0;const u=t(o);fetch(o.href,u)}})();const K="einv-token";function G(){try{return localStorage.getItem(K)}catch{return null}}function V(e){try{e?localStorage.setItem(K,e):localStorage.removeItem(K)}catch{}}async function L(e,n){const t=await q(e,{headers:{"content-type":"application/json"},...n});if(!t.ok){const s=await t.json().catch(()=>({}));throw new Error(s.error??`HTTP ${t.status}`)}return await t.json()}async function q(e,n){const t={...n?.headers??{}},s=G();s&&(t.authorization=`Bearer ${s}`);const o=await fetch(e,{...n,headers:t});if(o.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return o}async function j(e,n){const t=await q(e);if(!t.ok){const h=await t.json().catch(()=>({}));throw new Error(h.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const s=await t.blob(),o=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),u=document.createElement("a");u.href=URL.createObjectURL(s),u.download=o?.[1]??n,document.body.appendChild(u),u.click(),u.remove(),window.setTimeout(()=>URL.revokeObjectURL(u.href),1e4)}async function ve(e){const n=await q(e);if(!n.ok){const o=await n.json().catch(()=>({}));throw new Error(o.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const t=await n.blob(),s=URL.createObjectURL(t);window.open(s,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(s),6e4)}const k={health:()=>L("/api/health"),settings:()=>L("/api/settings"),list:(e={})=>{const n=new URLSearchParams(e).toString();return L(`/api/invoices${n?`?${n}`:""}`)},get:e=>L(`/api/invoices/${e}`),create:e=>L("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>L(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>L(`/api/invoices/${e}/issue`,{method:"POST"}),issueBatch:e=>L("/api/invoices/issue-batch",{method:"POST",body:JSON.stringify({ids:e})}),deleteDraft:e=>L(`/api/invoices/${e}`,{method:"DELETE"}),markSent:(e,n)=>L(`/api/invoices/${e}/sent`,{method:"POST",body:JSON.stringify({channel:n})}),paymentCheck:(e,n)=>L(`/api/invoices/${e}/payment-check`,{method:"POST",body:JSON.stringify({outcome:n})}),reminders:()=>L("/api/reminders"),reminded:e=>L(`/api/invoices/${e}/reminded`,{method:"POST"}),invoiceTemplates:{list:()=>L("/api/invoice-templates"),create:(e,n)=>L("/api/invoice-templates",{method:"POST",body:JSON.stringify({name:e,body:n})}),update:(e,n)=>L(`/api/invoice-templates/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/invoice-templates/${e}`,{method:"DELETE"})},setPaid:(e,n,t)=>L(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:t})}),storno:(e,n)=>L(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>L(`/api/invoices/${e}/validate`,{method:"POST"}),rerender:(e,n)=>L(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:n})}),renders:e=>L(`/api/invoices/${e}/renders`),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>L("/api/company-profiles"),getDefault:()=>L("/api/company-profiles/default"),create:(e,n)=>L("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>L(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:e=>L(`/api/customers${e?`?q=${encodeURIComponent(e)}`:""}`),create:(e,n)=>L("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>L(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>L("/api/customers/number-assign",{method:"POST"})},products:{list:()=>L("/api/products"),create:e=>L("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>L(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>L(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${n?`?${n}`:""}`},csvUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.csv${n?`?${n}`:""}`},datevUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.datev${n?`?${n}`:""}`},restorePreview:(e,n)=>L("/api/restore/preview",{method:"POST",body:JSON.stringify({filename:e,dataBase64:n})})};function a(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function P(e){return`${Number(e).toFixed(2)} EUR`}function z(e){return e.split("/").pop()??e}async function W(e){let n;try{n=await k.restorePreview(e.filename,e.dataBase64)}catch(s){return alert(`Backup kann nicht gelesen werden: ${s.message}`),!1}const t=n.overwritten.length;return window.confirm([`Vorschau für ${e.filename?z(e.filename):"der hochgeladenen Datei"}:`,"",`  Im Backup:   ${n.invoices} Rechnungen (davon ${n.issued} ausgestellt)`,`  Aktuell:     ${n.currentInvoices} Rechnungen`,`  Dateien:     ${n.filesWritten}`,`  Neu dazu:    ${n.added.length} Nummern`,`  Überschrieben: ${t} Nummern ${t?`(${n.overwritten.slice(0,5).join(", ")}${n.overwritten.length>5?" …":""})`:""}`,"",t>0?"ACHTUNG: Rechnungen, die nur hier existieren, gehen unwiederbringlich verloren.":"Die aktuelle Datenbank wird durch das Backup ersetzt.","","Trotzdem wiederherstellen?"].join(`
`))}async function fe(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],t="",s=!1;async function o(){const h=await q("/api/backups");if(!h.ok)throw new Error("Backups konnten nicht geladen werden");n=await h.json(),u()}function u(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${s?"error":""}">${a(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(h=>`<div class="row" style="margin-top:8px">
				<strong>${a(z(h.filename))}</strong>
				<span class="muted">${a(h.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(h.size/1024)} KB</span>
				<button class="secondary" data-dl="${a(h.filename)}">Download</button>
				<button class="secondary" data-restore="${a(h.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const h=await q("/api/backups",{method:"POST"});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const g=await h.json();t=`Gesichert: ${z(g.filename)}`,s=!1,await o()}catch(h){t=h.message,s=!0,u()}}),e.querySelectorAll("[data-dl]").forEach(h=>h.addEventListener("click",async()=>{const g=h.dataset.dl??"";try{await j(`/api/backups/file/${z(g)}`,z(g))}catch(p){t=p.message,s=!0,u()}})),e.querySelectorAll("[data-restore]").forEach(h=>h.addEventListener("click",async()=>{const g=h.dataset.restore??"";if(await W({filename:g}))try{const p=await q("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:g})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const $=await p.json();t=`Wiederhergestellt: ${$.invoices} Rechnungen, ${$.templates} Vorlagen${$.fileErrors.length>0?` (${$.fileErrors.length} Dateifehler)`:""}`,s=!1,await o()}catch(p){t=p.message,s=!0,u()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const h=e.querySelector("#b-file")?.files?.[0];if(!h){t="Bitte zuerst eine ZIP-Datei wählen",s=!0,u();return}let g;try{g=await new Promise((p,$)=>{const E=new FileReader;E.onload=()=>p(String(E.result).split(",")[1]),E.onerror=()=>$(new Error("Datei nicht lesbar")),E.readAsDataURL(h)})}catch(p){t=p.message,s=!0,u();return}if(await W({dataBase64:g}))try{const p=await q("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:g})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const $=await p.json();t=`Wiederhergestellt: ${$.invoices} Rechnungen, ${$.templates} Vorlagen`,s=!1,await o()}catch(p){t=p.message,s=!0,u()}})}try{await o()}catch(h){e.innerHTML=`<div class="card error">${a(h.message)}</div>`}}const _=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function A(e,n,t){const s=e[n],o=Array.isArray(s)?s.join(`
`):s??"";return`<label>${t}<input data-f="${n}" value="${a(o)}" /></label>`}async function be(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,t="",s=!1;try{n=await k.company.getDefault(),n||(n=(await k.company.list())[0]??null)}catch(u){e.innerHTML=`<div class="card error">${a(u.message)}</div>`;return}function o(){const u=n?.profile??_();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${a(n?.name??"Meine Firma")}" /></label>
			${A(u,"name","Firmenname")}
			${A(u,"street","Straße")}
			<div class="grid2">${A(u,"zip","PLZ")}${A(u,"city","Ort")}</div>
			<div class="grid2">${A(u,"country","Land")}${A(u,"email","E-Mail")}</div>
			<div class="grid2">${A(u,"phone","Telefon")}${A(u,"website","Webseite")}</div>
			<div class="grid2">${A(u,"vatId","USt-IdNr.")}${A(u,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${A(u,"bankName","Bankname")}${A(u,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${a(u.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(h=>`<div class="grid2"><label>Box ${h+1}<textarea data-fbox="${h}" rows="3">${a((u.footerBoxes??[])[h]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${h}">
					${["left","center","right"].map(g=>`<option value="${g}" ${(u.footerAlign??[])[h]===g||!(u.footerAlign??[])[h]&&g==="left"?"selected":""}>${g==="left"?"Links":g==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${s?"error":""}">${a(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const h={..._()};e.querySelectorAll("input[data-f]").forEach($=>{h[$.dataset.f]=$.value});const g=[0,1,2,3].map($=>e.querySelector(`textarea[data-fbox="${$}"]`)?.value??"");g.some($=>$.trim()!=="")?(h.footerBoxes=g,h.footerAlign=[0,1,2,3].map($=>{const E=e.querySelector(`select[data-falign="${$}"]`)?.value;return E==="center"||E==="right"?E:"left"})):(delete h.footerBoxes,delete h.footerAlign);const p=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await k.company.update(n.id,{name:p,profile:h}):n=await k.company.create(p,h),t="Gespeichert.",s=!1,o()}catch($){t=$.message,s=!0,o()}})}o()}const X=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),ye=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function ge(e,n){const t=Number(e.replace(/\D+/g,"")),s=Number(n.replace(/\D+/g,"")),o=/\d/.test(e)&&Number.isFinite(t),u=/\d/.test(n)&&Number.isFinite(s);return o&&u&&t!==s?t-s:e.localeCompare(n,"de")}function $e(e,n){const t=n.endsWith("desc")?-1:1,s=[...e];return s.sort((o,u)=>n.startsWith("number")?ge(o.profile.customerNumber?.trim()??"",u.profile.customerNumber?.trim()??"")*t:o.name.localeCompare(u.name,"de")*t),s}function O(e,n,t){const s=e[n],o=Array.isArray(s)?s.join(`
`):s??"";return`<label>${t}<input data-f="${n}" value="${a(o)}" /></label>`}async function we(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],t=null,s=!1,o="",u=!1,h="name-asc",g="";async function p(){n=await k.customers.list(g||void 0),E()}function $(r,v){return`
		<label>Name (Anzeige)<input id="k-name" value="${a(v)}" /></label>
		${O(r,"name","Firmenname")}
		${O(r,"street","Straße")}
		<div class="grid2">${O(r,"zip","PLZ")}${O(r,"city","Ort")}</div>
		<div class="grid2">${O(r,"country","Land")}${O(r,"email","E-Mail")}</div>
		<div class="grid2">${O(r,"phone","Telefon")}${O(r,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${a(r.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function E(){const r=n.filter(f=>!f.profile.customerNumber?.trim()).length,v=$e(n,h);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<input id="k-q" placeholder="Suche (Name, Nummer, Ort)…" value="${a(g)}" style="max-width:240px" />
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${ye.map(f=>`<option value="${f.value}" ${f.value===h?"selected":""}>${f.label}</option>`).join("")}
			</select></label>
			${r>0?`<button class="secondary" id="k-number">${r} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${v.map(f=>`<div class="row" style="margin-top:8px">
				<strong>${a(f.name)}</strong>
				${f.profile.customerNumber?.trim()?`<span class="badge">${a(f.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${a(f.profile.city||"")}</span>
				<button class="secondary" data-edit="${f.id}">Bearbeiten</button>
				<button class="danger" data-del="${f.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${v.length} Kunden</p>
		</div>
		${t||s?`<div class="card"><h3>${s?"Neuer Kunde":a(t?.name??"")}</h3>
			${$(t?.profile??X(),t?.name??"")}
			${o?`<p class="${u?"error":""}">${a(o)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",f=>{h=f.target.value,E()});let c;e.querySelector("#k-q")?.addEventListener("input",f=>{g=f.target.value,c!==void 0&&clearTimeout(c),c=setTimeout(()=>{p()},250)}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{o=`${await k.customers.assignNumbers()} Kundennummer(n) vergeben.`,u=!1,await p()}catch(f){o=f.message,u=!0,E()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,s=!0,o="",E()}),e.querySelectorAll("[data-edit]").forEach(f=>f.addEventListener("click",()=>{t=n.find(S=>S.id===f.dataset.edit)??null,s=!1,o="",E()})),e.querySelectorAll("[data-del]").forEach(f=>f.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await k.customers.remove(f.dataset.del??""),await p()}catch(S){o=S.message,u=!0,E()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,s=!1,o="",E()}),e.querySelector("#k-save")?.addEventListener("click",()=>{i()})}async function i(){const r={...X()};e.querySelectorAll("input[data-f]").forEach(c=>{r[c.dataset.f]=c.value});const v=e.querySelector("#k-name")?.value.trim()||r.name.trim()||"Kunde";try{s?await k.customers.create(v,r):t&&await k.customers.update(t.id,{name:v,profile:r}),t=null,s=!1,o="",await p()}catch(c){o=c.message,u=!0,E()}}try{await p()}catch(r){e.innerHTML=`<div class="card error">${a(r.message)}</div>`}}function ke(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function Se(e){return`<span class="badge ${e}">${e}</span>`}async function Te(e){e.innerHTML=`
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
		<div id="list"></div>`;const n=e.querySelector("#f-status"),t=e.querySelector("#f-q"),s=e.querySelector("#f-sort"),o=e.querySelector("#f-order"),u=e.querySelector("#f-sent"),h=e.querySelector("#reminders");let g="desc",p=[];const $=e.querySelector("#list"),E=e.querySelector("#list-err");let i=0;function r(y){E.innerHTML=`<div class="card error">${a(y.message)}</div>`}async function v(y){const l=y.dataset.paid??"",b=y.checked;y.disabled=!0;try{await k.setPaid(l,b),E.innerHTML=`<div class="card muted">${b?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await c()}catch(w){y.checked=!b,r(w)}finally{y.disabled=!1}}async function c(){const y=++i,l={sort:s.value,order:g};n.value&&(l.status=n.value),t.value.trim()&&(l.q=t.value.trim()),u.value&&(l.sent=u.value);try{const b=await k.list(l);if(y!==i)return;p=b.filter(m=>m.status==="draft").map(m=>m.id);const w=e.querySelector("#f-issue-all");w.hidden=p.length===0,w.textContent=`Ausstellen (${p.length})`,$.innerHTML=b.map(m=>`<div class="card"><div class="row">
					${m.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${m.paid?`Ausgeglichen am ${a((m.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${a(m.id)}" ${m.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${a(m.number??"(Entwurf)")}</strong>${Se(m.status)}
					<span>${a(m.buyer.name||"—")}</span>
					<span>${P(m.totals.grossTotal)}</span>
					${m.skontoPercent>0&&!m.paid?`<span class="muted">${P(m.totals.grossTotal-ke(m))} bei ${a(m.skontoPercent)} % Skonto</span>`:""}
					${m.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					${m.status==="issued"?m.sentAt?`<span class="badge issued" title="Über ${a(m.sendChannel??"E-Mail")} versendet am ${a(m.sentAt.slice(0,10))}">versendet</span>`:`<button class="secondary" data-sent="${a(m.id)}" title="Als versendet markieren">nicht versendet</button>`:""}
					<a href="#/invoices/${a(m.id)}">Ansehen</a>
					${m.status==="draft"?`<a href="#/edit/${a(m.id)}">Bearbeiten</a>`:""}
					${m.status==="draft"?`<button class="secondary" data-del="${a(m.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',$.querySelectorAll("[data-paid]").forEach(m=>m.addEventListener("change",()=>{v(m)})),$.querySelectorAll("[data-sent]").forEach(m=>m.addEventListener("click",async()=>{try{await k.markSent(m.dataset.sent??"","E-Mail"),await c()}catch(N){r(N)}})),$.querySelectorAll("[data-del]").forEach(m=>m.addEventListener("click",async()=>{if(window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen."))try{await k.deleteDraft(m.dataset.del??""),E.innerHTML='<div class="card muted">Entwurf gelöscht.</div>',await c()}catch(N){r(N)}}))}catch(b){if(y!==i)return;$.innerHTML=`<div class="card error">${a(b.message)}</div>`}}n.onchange=()=>{c()},s.onchange=()=>{c()},u.onchange=()=>{c()},o.onclick=()=>{g=g==="desc"?"asc":"desc",o.textContent=g==="desc"?"↓ absteigend":"↑ aufsteigend",c()};let f;t.oninput=()=>{f!==void 0&&clearTimeout(f),f=setTimeout(()=>{c()},250)},e.querySelector("#f-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${p.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`))try{const y=await k.issueBatch(p);E.innerHTML=`<div class="card ${y.failed.length?"error":"muted"}">${y.issued.length} ausgestellt${y.failed.length?`, ${y.failed.length} fehlgeschlagen: ${a(y.failed[0].error??"")}`:""}.</div>`,await c()}catch(y){r(y)}});const S=()=>{const y={};return n.value&&(y.status=n.value),t.value.trim()&&(y.q=t.value.trim()),y};e.querySelector("#f-export")?.addEventListener("click",async()=>{try{await j(k.exportUrl(S()),"export.xlsx")}catch(y){r(y)}}),e.querySelector("#f-csv")?.addEventListener("click",async()=>{try{await j(k.csvUrl(S()),"rechnungen.csv")}catch(y){r(y)}}),e.querySelector("#f-datev")?.addEventListener("click",async()=>{try{await j(k.datevUrl(S()),"rechnungen.datev")}catch(y){r(y)}});async function d(){try{const y=await k.reminders();if(!y.length){h.innerHTML="";return}h.innerHTML=`<div class="card"><div class="row">
				<strong>Überfällig: ${y.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${y.map(l=>`<div class="card" style="flex:1">
						<strong>${a(l.invoice.number??"")}</strong> ${a(l.invoice.buyer.name)}
						<br /><span class="muted">${l.overdueDays} Tage überfällig · Stufe ${l.level}${l.skontoActive?` · Skonto ${a(l.invoice.skontoPercent)} % noch möglich bis ${a(l.invoice.skontoDueDate??"")}`:""}</span>
						<br /><a href="#/invoices/${a(l.invoice.id)}">Ansehen</a>
					</div>`).join("")}</div></div>`}catch{}}await c(),await d()}function F(e){return Math.round((e+Number.EPSILON)*100)/100}function Ee(e){const n=(e??"").trim(),[t,s]=n.split(".."),o=u=>/^\d{4}-\d{2}-\d{2}$/.test(u??"")?`${u.slice(8,10)}.${u.slice(5,7)}.${u.slice(0,4)}`:u??"";return s?`${o(t)} – ${o(s)}`:o(t)}async function Le(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let s=await k.get(n);const u=(Array.isArray(s.lines)?s.lines:[]).map(i=>{const r=Math.min(Math.max(Number(i.discountPercent)||0,0),100),v=Number(i.quantity)||0,c=Number(i.unitPriceNet)||0;return{line:i,discount:r,gross:F(v*c),net:F(v*c*(1-r/100))}}),h=u.some(i=>i.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${a(s.number??"(Entwurf)")}</strong>
				<span class="badge ${s.status}">${s.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${a(s.seller.name)}<br />${a(s.seller.street)}<br />${a(s.seller.zip)} ${a(s.seller.city)}</div>
				<div><strong>Käufer</strong><br />${a(s.buyer.name)}<br />${a(s.buyer.street)}<br />${a(s.buyer.zip)} ${a(s.buyer.city)}${s.buyer.email?`<br />${a(s.buyer.email)}`:""}</div>
			</div>
			<p>Ausgestellt: ${a(s.issueDate)} · Leistung: ${a(Ee(s.deliveryDate))}${s.dueDate?` · Fällig: ${a(s.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${h?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${u.map((i,r)=>`<tr>
					<td>${r+1}</td><td>${a(i.line.description)}${i.line.sku?` (${a(i.line.sku)})`:""}</td>
					<td class="r">${a(i.line.quantity)} ${a(i.line.unit)}</td>
					<td class="r">${P(Number(i.line.unitPriceNet))}</td>
					${h?`<td class="r">${i.discount>0?`${a(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?P(F(i.gross-i.net)):"–"}</td>`:""}
					<td class="r">${a(i.line.vatRate)} %</td><td class="r"><strong>${P(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${P(s.totals.grossTotal)}</strong> <span class="muted">(netto ${P(s.totals.netTotal)} + USt ${P(s.totals.taxTotal)})</span></p>
			${s.notes?`<p class="muted">Notiz: ${a(s.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${s.status==="draft"?`<a class="btn" href="#/edit/${a(s.id)}">Bearbeiten</a>`:""}
				${s.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${s.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${s.paid?"checked":""} /><span>bezahlt${s.paid&&s.paidAt?` (${a(s.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${s.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				${s.status==="issued"?s.sentAt?`<span class="badge issued" title="${a(s.sendChannel??"E-Mail")} am ${a(s.sentAt.slice(0,10))}">versendet</span>`:'<button class="secondary" id="d-sent" title="Als versendet markieren">Als versendet markieren</button>':""}
				${s.status!=="draft"&&s.pdfPath?'<button class="secondary" id="d-rerender" title="Erzeugt die PDF neu, z. B. nach einer Layout-Korrektur. Der Inhalt der Rechnung bleibt unverändert, das Original wird archiviert.">Neu rendern</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
			${s.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
			${s.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
			${s.status==="issued"&&s.pdfPath?'<button class="secondary" id="d-mail">E-Mail (PDF)</button>':""}
			${s.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
			${s.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div></div>`;const g=e.querySelector("#d-out"),p=i=>{g.innerHTML=`<p class="error">${a(i.message)}</p>`},$=e.querySelector("#d-history"),E=async()=>{if(s.status!=="draft")try{const i=await k.renders(s.id);if(!i.length){$.innerHTML="";return}$.innerHTML=`<details><summary>Neu gerendert (${i.length})</summary><ul>${i.map(r=>`<li>${a(r.createdAt.slice(0,16).replace("T"," "))} – ${a(r.artifact.toUpperCase())}${r.reason?` – ${a(r.reason)}`:""}${r.previousPath?` – Original: <code>${a(r.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await E(),e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const r=i.dataset.dl,v=r==="pdf"?k.pdfUrl(s.id):r==="xml"?k.xmlUrl(s.id):k.xlsxUrl(s.id);try{await j(v,`${s.number??"rechnung"}.${r}`)}catch(c){p(c)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ve(k.pdfUrl(s.id))}catch(i){p(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{g.innerHTML='<p class="muted">Validiere…</p>';try{const i=await k.validate(s.id);g.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(r=>`<li class="error">${a(r)}</li>`).join("")}</ul>`}catch(i){g.innerHTML=`<p class="error">${a(i.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async i=>{const r=i.target,v=r.checked;r.disabled=!0;try{s=await k.setPaid(s.id,v),g.innerHTML=`<p style="color:var(--ok)">${v?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(c){r.checked=!v,g.innerHTML=`<p class="error">${a(c.message)}</p>`}finally{r.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const i=(s.buyer.email??"").trim(),r=`${s.documentTitle??"Rechnung"} ${s.number??""}`.trim(),v=`Guten Tag ${s.buyer.name||""},

anbei erhalten Sie ${r} vom ${s.issueDate}.
Gesamtbetrag: ${P(s.totals.grossTotal)}.
${s.dueDate?`Bitte überweisen bis ${s.dueDate}.
`:""}
Mit freundlichen Grüßen
${s.seller.name}
`;try{await j(k.pdfUrl(s.id),`${s.number??"rechnung"}.pdf`)}catch(f){p(f);return}const c=`mailto:${i}?subject=${encodeURIComponent(r)}&body=${encodeURIComponent(v)}`;window.location.href=c,g.innerHTML=i?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${a(i)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-sent")?.addEventListener("click",async()=>{try{s=await k.markSent(s.id,"E-Mail"),g.innerHTML=`<p style="color:var(--ok)">Als versendet markiert${s.sentAt?` (${a(s.sentAt.slice(0,10))})`:""}.</p>`,e.querySelector("#d-sent")?.remove()}catch(i){p(i)}}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const i=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(i!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?")){g.innerHTML='<p class="muted">Rendere neu…</p>';try{const r=await k.rerender(s.id,i.trim()||void 0);s=r.invoice,g.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${r.archivedPath?` Das Original liegt als <code>${a(r.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await E();const v=e.querySelector("#d-duty");if(s.status!=="draft"&&!s.paid)try{const{duty:c,checked:f}=await k.paymentCheck(s.id);c.required&&!f?(v.innerHTML=`<p class="error">${a(c.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`,e.querySelector("#d-duty-ok")?.addEventListener("click",async()=>{try{await k.paymentCheck(s.id,"geprüft"),v.innerHTML='<p style="color:var(--ok)">Zahlungsweise geprüft.</p>'}catch(S){p(S)}})):f&&(v.innerHTML=`<p class="muted">Zahlungsweise geprüft${s.paymentCheckedAt?` am ${a(s.paymentCheckedAt.slice(0,10))}`:""}.</p>`)}catch{}}catch(r){g.innerHTML=`<p class="error">${a(r.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const i=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(i!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:r}=await k.storno(s.id,i.trim()||void 0);location.hash=`#/edit/${r.id}`,location.reload()}catch(r){g.innerHTML=`<p class="error">${a(r.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await k.issue(s.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){g.innerHTML=`<p class="error">${a(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${a(t.message)}</div>`}}function Y(e){return{lines:(Array.isArray(e.lines)?e.lines:[]).filter(t=>t&&typeof t.description=="string"&&t.description.trim()!==""),paymentTerms:typeof e.paymentTerms=="string"?e.paymentTerms:"",skontoPercent:Number(e.skontoPercent)||0,notes:typeof e.notes=="string"?e.notes:""}}function Q(e){return e.reduce((n,t)=>{const s=Math.min(Math.max(Number(t.discountPercent)||0,0),100),o=(Number(t.quantity)||0)*(Number(t.unitPriceNet)||0);return n+o*(1-s/100)},0)}function Ne(e,n,t){return`<div class="card line" style="background:var(--bg)">
		<div class="line-head"><span class="line-no">${n+1}</span><strong>Position ${n+1}</strong>
			<button class="secondary" data-tpl-del-line="${n}">Entfernen</button></div>
		<div class="grid2">
			<label>Bezeichnung<input data-tpl-line="${n}.description" value="${a(e.description)}" /></label>
			<label>Art.Nr.<input data-tpl-line="${n}.sku" value="${a(e.sku??"")}" /></label>
		</div>
		<div class="grid2">
			<label>Menge<input data-tpl-line="${n}.quantity" type="number" min="0" step="any" value="${a(e.quantity)}" /></label>
			<label>Einheit<input data-tpl-line="${n}.unit" value="${a(e.unit)}" /></label>
		</div>
		<div class="grid2">
			<label>Preis netto<input data-tpl-line="${n}.unitPriceNet" type="number" min="0" step="0.01" value="${a(e.unitPriceNet)}" /></label>
			<label>USt %<select data-tpl-line="${n}.vatRate">
				${t.map(s=>`<option ${Number(s)===Number(e.vatRate)?"selected":""}>${s}</option>`).join("")}
			</select></label>
		</div>
	</div>`}const Pe=[19,7,0];async function qe(e){e.innerHTML='<div class="card">Lade Rechnungsvorlagen…</div>';let n=[],t=null,s=!1,o=[],u="",h=0,g="",p="",$=!1;async function E(){n=await k.invoiceTemplates.list(),c()}function i(f){t=f,s=!0;const S=Y(f?.body??{});o=S.lines.length?S.lines.map(d=>({...d})):[r()],u=S.paymentTerms,h=S.skontoPercent,g=S.notes,p="",$=!1,c()}function r(){return{description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}}function v(){return o.map((f,S)=>{const d=(y,l)=>{const b=e.querySelector(`[data-tpl-line="${S}.${y}"]`);return b?b.value:l};return{description:String(d("description",f.description)),sku:String(d("sku","")),quantity:Number(d("quantity",f.quantity))||0,unit:String(d("unit",f.unit)),unitPriceNet:Number(d("unitPriceNet",f.unitPriceNet))||0,vatRate:Number(d("vatRate",f.vatRate))||0}})}function c(){const f=Q(v());e.innerHTML=`
		<div class="card"><div class="row"><strong>Rechnungsvorlagen</strong>
			<button id="t-new">+ Neue Vorlage</button>
			${p?`<span class="${$?"error":"muted"}">${a(p)}</span>`:""}</div>
			<p class="muted">Wiederkehrende Rechnungen (Wartung, Honorar, Abo) einmal anlegen und im Assistenten
				übernehmen. Käufer und Datum werden bewusst nicht gespeichert.</p>
			${n.map(S=>{const d=Y(S.body);return`<div class="row" style="margin-top:8px">
						<strong>${a(S.name)}</strong>
						<span class="muted">${d.lines.length} Position(en) · ${P(Q(d.lines))}${d.skontoPercent?` · ${d.skontoPercent} % Skonto`:""}</span>
						<button class="secondary" data-tpl-edit="${a(S.id)}">Bearbeiten</button>
						<button class="danger" data-tpl-del="${a(S.id)}">Löschen</button>
					</div>`}).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${s?`<div class="card"><h3>${t?a(t.name):"Neue Vorlage"}</h3>
					<label>Name<input id="t-name" value="${a(t?.name??"")}" placeholder="z. B. Monatliche Wartung" /></label>
					<label>Zahlungsbedingungen<input id="t-terms" value="${a(u)}" placeholder="Zahlbar innerhalb von 14 Tagen" /></label>
					<div class="grid2">
						<label>Skonto %<input id="t-skonto" type="number" min="0" max="20" step="0.5" value="${a(h)}" /></label>
						<label>&nbsp;</label>
					</div>
					<label>Notiz<textarea id="t-notes" rows="2">${a(g)}</textarea></label>
					<p class="muted">Summe netto: <strong>${P(f)}</strong></p>
					${o.map((S,d)=>Ne(S,d,Pe)).join("")}
					<button class="secondary" id="t-add-line">+ Position</button>
					<p><button id="t-save">Speichern</button>
					<button class="secondary" id="t-cancel">Abbrechen</button></p>
				</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",()=>i(null)),e.querySelectorAll("[data-tpl-edit]").forEach(S=>S.addEventListener("click",()=>{const d=n.find(y=>y.id===S.dataset.tplEdit);d&&i(d)})),e.querySelectorAll("[data-tpl-del]").forEach(S=>S.addEventListener("click",async()=>{if(window.confirm("Vorlage löschen? Bereits ausgestellte Rechnungen bleiben unverändert."))try{await k.invoiceTemplates.remove(S.dataset.tplDel??""),p="Vorlage gelöscht.",$=!1,await E()}catch(d){p=d.message,$=!0,c()}})),e.querySelectorAll("[data-tpl-del-line]").forEach(S=>S.addEventListener("click",()=>{const d=Number(S.dataset.tplDelLine);o.splice(d,1),o.length===0&&o.push(r()),c()})),e.querySelector("#t-add-line")?.addEventListener("click",()=>{o.push(r()),c()}),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,s=!1,c()}),e.querySelector("#t-save")?.addEventListener("click",async()=>{const S=e.querySelector("#t-name")?.value.trim()??"";if(!S){p="Bitte einen Namen vergeben.",$=!0,c();return}const d=v().filter(l=>l.description.trim()!=="");if(d.length===0){p="Mindestens eine Position mit Bezeichnung nötig.",$=!0,c();return}const y={lines:d,paymentTerms:e.querySelector("#t-terms")?.value??"",skontoPercent:Number(e.querySelector("#t-skonto")?.value)||0,notes:e.querySelector("#t-notes")?.value??""};try{t?.id?await k.invoiceTemplates.update(t.id,{name:S,body:y}):await k.invoiceTemplates.create(S,y),p=`Gespeichert: ${S}`,$=!1,t=null,s=!1,await E()}catch(l){p=l.message,$=!0,c()}})}try{await E()}catch(f){e.innerHTML=`<div class="card error">${a(f.message)}</div>`}}function De(e){const n=G();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${a(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";V(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{V(null),location.hash="#/login",location.reload()})}function Ae(){V(null),location.hash="#/login"}async function xe(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],t=null,s=!1,o="",u=!1;async function h(){n=await k.products.list(),p()}function g(i){const r=v=>a(v??"");return`
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
			${[19,7,0].map(v=>`<option ${v===(i.vatRate??19)?"selected":""}>${v}</option>`).join("")}
		</select></label>`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${n.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${a(i.sku?`${i.sku} · `:"")}${a(i.name)}</strong>
				<span class="muted">${a(i.unit)} · ${Number(i.unitPriceNet).toFixed(2)} EUR · ${i.vatRate} %</span>
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="danger" data-del="${i.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||s?`<div class="card"><h3>${s?"Neue Position":a(t?.name??"")}</h3>
			${g(t??{})}
			${o?`<p class="${u?"error":""}">${a(o)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,s=!0,o="",p()}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{t=n.find(r=>r.id===i.dataset.edit)??null,s=!1,o="",p()})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await k.products.remove(i.dataset.del??""),await h()}catch(r){o=r.message,u=!0,p()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,s=!1,o="",p()}),e.querySelector("#p-save")?.addEventListener("click",()=>{E()})}function $(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function E(){const i=$();try{s?await k.products.create(i):t&&await k.products.update(t.id,i),t=null,s=!1,o="",await h()}catch(r){o=r.message,u=!0,p()}}try{await h()}catch(i){e.innerHTML=`<div class="card error">${a(i.message)}</div>`}}async function Me(e){try{const n=await k.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${a(n.version)} · Schema: ${a(String(n.schemaVersion))}</p>
			<pre class="dump">${a(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${a(n.message)}</div>`}}const Re=["title","meta","parties","positions","totals"],ee=["payment","notes"],Oe=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function Be(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],t=null,s="",o=[];try{const i=await q("/api/company-profiles");i.ok&&(o=await i.json())}catch{}async function u(){n=await h(),p()}async function h(){const i=await q("/api/templates");if(!i.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await i.json()}function g(i){const r=i.definition,v=(c,f,S)=>`<label><input type="checkbox" data-f="blocks.${c}" ${r.blocks[c]?"checked":""} ${S?"disabled":""} style="width:auto" /> ${f}${S?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${a(i.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${o.map(c=>`<option value="${a(c.id)}" ${i.definition.companyId===c.id?"selected":""}>${a(c.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${a(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${a(r.colors.text)}" /></label>
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
		${Re.map(c=>v(c,`Block ${c}`,!0)).join("")}
		${ee.map(c=>v(c,`Block ${c}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${r.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${r.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${r.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${r.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${r.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${r.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${r.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${a(r.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${a(r.closingText??"")}</textarea></label>
		<div class="grid2">
			<label title="Leer lassen: es wird kein Name gedruckt">Unterschrift (Name, optional)<input id="t-sign" value="${a(r.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${a(r.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${a(r.footerText)}</textarea></label>
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
		${r.logo?`<p class="muted">Aktuell: ${a(r.logo.path)}</p>`:""}`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${n.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${a(i.name)}</strong><span class="muted">v${i.version}</span>
				${i.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${i.id}">Vorschau</button>
				${i.isDefault?"":`<button class="secondary" data-def="${i.id}">Standard</button>`}
				${i.isDefault?"":`<button class="danger" data-del="${i.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${a(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${g(t)}
			${s?`<p class="error">${a(s)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const v=(await(await q("/api/templates")).json())[0];if(!v){s="Keine Basisvorlage vorhanden",p();return}t={...structuredClone(v),id:"neu",name:"Neu",version:1,isDefault:!1},s="",p()}catch(i){s=i.message,p()}}),e.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{const r=n.find(v=>v.id===i.dataset.edit);r&&(t=structuredClone(r),s="",p())})),e.querySelectorAll("[data-prev]").forEach(i=>i.addEventListener("click",async()=>{const r=n.find(v=>v.id===i.dataset.prev);if(r)try{const v=await q("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!v.ok){const f=await v.json().catch(()=>({}));throw new Error(f.error??"Vorschau fehlgeschlagen")}const c=await v.blob();window.open(URL.createObjectURL(c),"_blank")}catch(v){s=v.message,p()}})),e.querySelectorAll("[data-def]").forEach(i=>i.addEventListener("click",async()=>{try{if(!(await q(`/api/templates/${i.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await u()}catch(r){s=r.message,p()}})),e.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{const r=await q(`/api/templates/${i.dataset.del}`,{method:"DELETE"});if(!r.ok){s=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await u()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,s="",p()}),e.querySelector("#t-save")?.addEventListener("click",()=>{E()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const i=$();if(i)try{const r=await q("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!r.ok){const v=await r.json().catch(()=>({}));throw new Error(v.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){s=r.message,p()}})}function $(){if(!t)return null;const i=structuredClone(t.definition);i.name=(e.querySelector("#t-name")?.value??i.name).trim(),i.colors.primary=e.querySelector("#t-c1")?.value??i.colors.primary,i.colors.text=e.querySelector("#t-c2")?.value??i.colors.text;for(const v of ee)i.blocks[v]=e.querySelector(`[data-f="blocks.${v}"]`)?.checked??i.blocks[v];for(const v of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])i[v]=e.querySelector(`[data-f="${v}"]`)?.checked??!1;for(const v of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const c=e.querySelector(`[data-f="${v}"]`);c&&(i[v]=c.checked)}i.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?i.companyId=r:delete i.companyId,i.introText=e.querySelector("#t-intro")?.value??"",i.closingText=e.querySelector("#t-closing")?.value??"",i.signatureName=e.querySelector("#t-sign")?.value??"",i.headerExtra=e.querySelector("#t-hextra")?.value??"",i.logo&&(i.logo.position=e.querySelector("#t-lpos")?.value??"right",i.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),i.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:i.name,definition:i}}async function E(){const i=$();if(!i)return;const r=i.definition;try{let v=t.id;if(v==="neu"){const f=await q("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");v=(await f.json()).id}else{const f=await q(`/api/templates/${v}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const c=e.querySelector("#t-logo")?.files?.[0];if(c){const f=await new Promise((d,y)=>{const l=new FileReader;l.onload=()=>d(String(l.result).split(",")[1]),l.onerror=()=>y(new Error("Datei nicht lesbar")),l.readAsDataURL(c)}),S=await q(`/api/templates/${v}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:c.name,mime:c.type,dataBase64:f})});if(!S.ok)throw new Error((await S.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,s="",await u()}catch(v){s=v.message,p()}}try{await u()}catch(i){e.innerHTML=`<div class="card error">${a(i.message)}</div>`}}const te=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),U=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:C.defaultVatRate});let C={defaultVatRate:19,defaultPaymentTerms:""};const Z=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],ne="__own__";function ce(e,n){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+n),t.toISOString().slice(0,10)}function oe(e){return!!e&&!de(e)}function de(e){return!!e&&Z.some(n=>n.text===e)}function ue(e){return Z.find(n=>n.text===e)?.days??null}function ae(e){if(!e.dueAuto)return;const n=ue(e.paymentTerms);n!==null&&(e.dueDate=ce(e.issueDate,n))}function R(e){return Math.round((e+Number.EPSILON)*100)/100}function se(e){const n=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,s=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return R(n*t*(1-s/100))}function je(e){return(e??"").trim().split("..")[0]??""}function He(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const B="einv-wizard-v1",me="einv-employee";function pe(){try{return localStorage.getItem(me)??""}catch{return""}}function ie(){return new Date().toISOString().slice(0,10)}function J(){return{step:0,seller:te(),buyer:te(),lines:[U()],issueDate:ie(),deliveryDate:ie(),dueDate:"",employee:pe(),documentTitle:"Rechnung",notes:"",paymentTerms:C.defaultPaymentTerms,termsCustom:oe(C.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function I(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function ze(){try{const e=localStorage.getItem(B);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{...J(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function re(e,n,t){return`
		<label>Name<input data-p="${e}" data-f="name" value="${a(n.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${a(n.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${a(n.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${a(n.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${a(n.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${a(n.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${e}" data-f="phone" value="${a(n.phone)}" /></label>
			${t?`<label>Webseite<input data-p="${e}" data-f="website" value="${a(n.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${a(n.contactName)}" /></label>`}
		</div>
		${t?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${a(n.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${a(n.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${a(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${a(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Ue=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Ce={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function le(e,n){let t=J();const s=!!n;let o=[],u=[],h=[],g=[],p=!1;if(k.settings().then(d=>{C={defaultVatRate:Number(d.defaultVatRate)||19,defaultPaymentTerms:d.defaultPaymentTerms??""}}).catch(()=>{}),n){e.innerHTML='<div class="card">Lade Entwurf…</div>',k.get(n).then(d=>{if(d.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${a(d.status)}).</div>`;return}t={...J(),seller:d.seller,buyer:d.buyer,lines:d.lines.length>0?d.lines:[U()],issueDate:d.issueDate,deliveryDate:d.deliveryDate,dueDate:d.dueDate??"",employee:d.employeeCode??pe(),documentTitle:d.documentTitle,notes:d.notes??"",paymentTerms:d.paymentTerms??C.defaultPaymentTerms,termsCustom:oe(d.paymentTerms),skontoPercent:d.skontoPercent??0,skontoDueDate:d.skontoDueDate??"",draftId:d.id},E(),c()}).catch(d=>{e.innerHTML=`<div class="card error">${a(d.message)}</div>`});return}const $=ze();if($&&I($)&&!$.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${a($.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=$,E(),c()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(B),E(),c()});return}$&&I($)&&(t=$),E(),I(t)||k.company.getDefault().then(d=>{d&&!t.seller.name.trim()&&d.profile.name.trim()&&(t.seller={...t.seller,...d.profile},t.selectedCompany=d.id,c(!0))}).catch(()=>{});function E(){k.company.list().then(d=>{o=d,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&c()}).catch(()=>{}),k.customers.list().then(d=>{u=d,t.step===1&&!e.querySelector("#w-customer")&&c()}).catch(()=>{}),k.products.list().then(d=>{h=d,t.step===2&&!e.querySelector("#w-catalog")&&c()}).catch(()=>{}),k.invoiceTemplates.list().then(d=>{g=d,t.step===2&&!e.querySelector("#w-inv-tpl")&&c()}).catch(()=>{})}function i(){try{if(s)return;if(!t.dirty){localStorage.removeItem(B);return}localStorage.setItem(B,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function r(){e.querySelectorAll("input[data-p]").forEach(w=>{const m=w.dataset.p==="seller"?t.seller:t.buyer;m[w.dataset.f]=w.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(w=>{const[m,N]=w.dataset.l.split("."),D=t.lines[Number(m)];if(D)if(N==="quantity"||N==="unitPriceNet"||N==="vatRate"||N==="discountPercent"){const M=Number(w.value),H=Number.isFinite(M)?M:0;D[N]=N==="discountPercent"?Math.min(Math.max(H,0),100):H}else D[N]=w.value});const d=w=>e.querySelector(`#${w}`)?.value??"",y=()=>{const w=d("w-delivery");if(!w)return;const m=d("w-delivery-to");t.deliveryDate=m&&m!==w?`${w}..${m}`:w};t.issueDate=d("w-issue")||t.issueDate,y(),e.querySelector("#w-due")&&(t.dueDate=d("w-due")),ae(t),e.querySelector("#w-employee")&&(t.employee=d("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=d("w-title")||t.documentTitle);const l=e.querySelector("#w-notes");l&&(t.notes=l.value);const b=e.querySelector("#w-terms");if(b&&(t.paymentTerms=b.value),e.querySelector("#w-skonto")){const w=Number(d("w-skonto"));t.skontoPercent=Number.isFinite(w)?Math.min(Math.max(w,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=d("w-skonto-due")),i()}function v(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((y,l)=>`<span class="${l===t.step?"on":""}">${l+1}. ${y}</span>`).join("")}</div>`}function c(d=!1){d||r();let y="";if(t.step===0&&(y=`<div class="card"><h3>Verkäufer</h3>
				${o.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${o.map(l=>`<option value="${a(l.id)}" ${t.selectedCompany===l.id?"selected":""}>${a(l.name)}${l.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${re("seller",t.seller,!0)}</div>`),t.step===1&&(y=`<div class="card"><h3>Käufer</h3>
				${u.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${u.map(l=>`<option value="${a(l.id)}" ${t.selectedCustomer===l.id?"selected":""}>${a(l.name)}${l.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${re("buyer",t.buyer,!1)}</div>`),t.step===2&&(y=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Ue.map(l=>`<option ${l===t.documentTitle?"selected":""}>${l}</option>`).join("")}
				</select></label>
				${g.length>0?`<label>Wiederkehrende Rechnung<select id="w-inv-tpl">
							<option value="">– eigene Positionen –</option>
							${g.map(l=>`<option value="${a(l.id)}">${a(l.name)}</option>`).join("")}
						</select></label>
						<p class="muted">Übernimmt Positionen, Termine, Zahlungsbedingungen und Skonto. Käufer und Datum bleiben deine Angaben.</p>`:'<p class="muted">Tipp: Unter <a href="#/invoice-templates">Rechnungsvorlagen</a> eine Vorlage anlegen, um wiederkehrende Rechnungen nicht jedes Mal neu einzutippen.</p>'}
				${h.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${h.map(l=>`<option value="${a(l.id)}">${a(l.sku?`${l.sku} · `:"")}${a(l.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((l,b)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${b+1}</span><strong>Position ${b+1}</strong>
						<span class="line-sum">${P(se(l))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${b}.description" value="${a(l.description)}" /></label>
						<label>Art.Nr.<input data-l="${b}.sku" value="${a(l.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${b}.details" rows="1">${a(l.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${b}.quantity" type="number" min="0" step="any" value="${a(l.quantity)}" /></label>
						<label>Einheit<input data-l="${b}.unit" value="${a(l.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${b}.unitPriceNet" type="number" min="0" step="0.01" value="${a(l.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${b}.discountPercent" type="number" min="0" max="100" step="0.1" value="${a(l.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${b}.vatRate">
							${[19,7,0].map(w=>`<option ${w===Number(l.vatRate)?"selected":""}>${w}</option>`).join("")}
						</select></label>
						${Number(l.vatRate)===0?`<label>Steuerbefreiung<select data-l="${b}.exemptionCategory">
								${["E","AE","K","G","O"].map(w=>`<option ${(l.exemptionCategory??"E")===w?"selected":""} value="${w}">${w} — ${Ce[w]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${b}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${a(l.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${b}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${a(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${a(t.dueDate)}" />${t.dueAuto?' <span class="muted">(aus Zahlungsbedingung)</span>':""}</label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${a(je(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${a(He(t.deliveryDate))}" /></label>
					</div>
					<p class="muted">Nur „von" angeben, wenn die Leistung an einem Tag erbracht wurde. Mit „bis" wird der Zeitraum als BT-74/BT-75 in die Rechnung geschrieben.</p>
				</fieldset>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${a(t.employee)}" /></label>
				<fieldset class="period">
					<legend>Skonto (Rabatt bei früher Zahlung)</legend>
					<div class="grid2">
						<label>Skonto %<input id="w-skonto" type="number" min="0" max="100" step="0.01" value="${a(t.skontoPercent)}" /></label>
						<label>Skonto bis<input id="w-skonto-due" type="date" value="${a(t.skontoDueDate)}" /></label>
					</div>
					<p class="muted">Bei 0 % kein Skonto. Ohne eigenes Datum gilt das Fälligkeitsdatum. Der Skonto mindert den Zahlbetrag (BT-9) und steht als Bedingung mit Subject-Code AAK im XML.</p>
				</fieldset>
				<label>Notizen<textarea id="w-notes">${a(t.notes)}</textarea></label>
				<label>Zahlungsbedingungen<select id="w-terms-select">
					<option value="" ${t.paymentTerms===""?"selected":""}>keine</option>
					${Z.map(l=>`<option value="${a(l.text)}" ${!t.termsCustom&&t.paymentTerms===l.text?"selected":""}>${a(l.text)}</option>`).join("")}
					<option value="${ne}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${a(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const l=t.lines.map(T=>{const x=Math.min(Math.max(Number(T.discountPercent)||0,0),100);return{...T,discount:x,gross:R((Number(T.quantity)||0)*(Number(T.unitPriceNet)||0)),net:se(T)}}).filter(T=>T.description.trim()!==""||T.gross>0),b=new Map;for(const T of l)b.set(Number(T.vatRate)||0,R((b.get(Number(T.vatRate)||0)??0)+T.net));const w=[...b.entries()].sort(([T],[x])=>T-x).map(([T,x])=>({rate:T,net:x,tax:R(x*T/100)})),m=R(w.reduce((T,x)=>T+x.net,0)),N=R(w.reduce((T,x)=>T+x.tax,0)),D=R(m+N),M=R(D*(Number(t.skontoPercent)||0)/100),H=l.some(T=>T.discount>0);y=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${a(t.documentTitle)}</strong> · ${a(t.seller.name||"—")} → ${a(t.buyer.name||"—")} · ${l.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${H?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${l.map(T=>`<tr>
							<td>${a(T.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${a(T.quantity)} ${a(T.unit)}</td>
							<td class="r">${P(T.unitPriceNet)}</td>
							${H?`<td class="r">${T.discount>0?`${a(T.discount)} %`:"–"}</td><td class="r">${T.discount>0?P(R(T.gross-T.net)):"–"}</td>`:""}
							<td class="r">${a(T.vatRate)} %</td><td class="r"><strong>${P(T.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${P(m)}</td></tr>
						${w.map(T=>`<tr class="sub"><td class="lbl">USt ${a(T.rate)} % auf ${P(T.net)}</td><td class="r">${P(T.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${P(D)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${a(t.skontoPercent)} % Skonto bis ${a(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${P(M)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${P(D-M)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${v()}${y}
			${t.error?`<div class="card error">${a(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,c()}),e.querySelector("#w-terms-select")?.addEventListener("change",l=>{const b=l.target.value;if(b===ne)t.termsCustom=!0,de(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=b;const w=ue(b);w!==null?(t.dueAuto=!0,t.dueDate=ce(t.issueDate,w)):t.dueAuto=!1}c()}),e.querySelector("#w-due")?.addEventListener("change",()=>{r(),t.dueAuto=!1,c()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const l=e.querySelector("#w-company")?.value??"",b=o.find(w=>w.id===l);b?(t.seller={...t.seller,...b.profile},t.selectedCompany=b.id,c(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const l=e.querySelector("#w-customer")?.value??"",b=u.find(w=>w.id===l);b?(t.buyer={...t.buyer,...b.profile},t.selectedCustomer=b.id,c(!0)):t.selectedCustomer=null}),e.querySelector("#w-inv-tpl")?.addEventListener("change",l=>{const b=l.target.value,w=g.find(N=>N.id===b);if(!w||t.lines.length>0&&!window.confirm(`Positionen durch "${w.name}" ersetzen?`))return;const m=w.body;Array.isArray(m.lines)&&m.lines.length>0&&(t.lines=m.lines.map(N=>({...U(),...N}))),typeof m.paymentTerms=="string"&&(t.paymentTerms=m.paymentTerms),typeof m.notes=="string"&&(t.notes=m.notes),typeof m.documentTitle=="string"&&m.documentTitle&&(t.documentTitle=m.documentTitle),typeof m.skontoPercent=="number"&&m.skontoPercent>0&&(t.skontoPercent=m.skontoPercent),typeof m.dueDate=="string"&&(t.dueDate=m.dueDate),typeof m.deliveryDate=="string"&&(t.deliveryDate=m.deliveryDate),c(!0)}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,c()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(B),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.push(U()),c()}),e.querySelector("#w-take")?.addEventListener("click",()=>{r();const l=e.querySelector("#w-catalog")?.value??"",b=h.find(w=>w.id===l);if(b){const w={description:b.name,sku:b.sku||void 0,details:b.details||void 0,quantity:1,unit:b.unit,unitPriceNet:b.unitPriceNet,vatRate:b.vatRate},m=t.lines.findIndex(N=>!N.description.trim()&&!(N.sku??"").trim()&&!(N.details??"").trim()&&N.unitPriceNet===0);m>=0?t.lines[m]=w:t.lines.push(w),t.dirty=!0}c(!0)}),e.querySelectorAll("[data-del]").forEach(l=>l.addEventListener("click",()=>{r(),t.dirty=!0,t.lines.splice(Number(l.dataset.del),1),t.lines.length===0&&t.lines.push(U()),c(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{f(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&f(!0)})}async function f(d){if(!p){p=!0;try{r(),t.error="";const y={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(me,t.employee.trim())}catch{}let l;t.draftId?l=await k.update(t.draftId,y):(l=await k.create(y),t.draftId=l.id),d&&(l=await k.issue(l.id));try{localStorage.removeItem(B)}catch{}location.hash=`#/invoices/${l.id}`}catch(l){t.error=l.message,c()}}finally{p=!1}}}e.addEventListener("input",()=>{try{S()}catch{}});function S(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(m=>{const N=m.dataset.p==="seller"?t.seller:t.buyer;N[m.dataset.f]=m.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(m=>{const[N,D]=m.dataset.l.split("."),M=t.lines[Number(N)];M&&(D==="quantity"||D==="unitPriceNet"||D==="vatRate"||D==="discountPercent"?M[D]=Number(m.value):M[D]=m.value)});const d=m=>e.querySelector(`#${m}`)?.value??"",y=d("w-issue"),l=d("w-delivery"),b=d("w-delivery-to");y&&(t.issueDate=y),l&&(t.deliveryDate=b&&b!==l?`${l}..${b}`:l),e.querySelector("#w-due")&&(t.dueDate=d("w-due")),ae(t),e.querySelector("#w-employee")&&(t.employee=d("w-employee"));const w=d("w-title");if(w&&(t.documentTitle=w),e.querySelector("#w-skonto")){const m=Number(d("w-skonto"));t.skontoPercent=Number.isFinite(m)?Math.min(Math.max(m,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=d("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,i()}c()}const Fe=document.querySelector("#app");function Ie(e){const n=!!G(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/invoice-templates","Rechnungsvorlagen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];Fe.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([s,o])=>`<a href="${s}" class="${e===s||s==="#/"&&e.startsWith("#/invoices")?"active":""}">${o}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function he(){const e=location.hash||"#/";Ie(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await Te(n):e==="#/new"?le(n):e.startsWith("#/edit/")?le(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Le(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await Be(n):e==="#/company"?await be(n):e==="#/customers"?await we(n):e==="#/products"?await xe(n):e==="#/invoice-templates"?await qe(n):e==="#/backup"?await fe(n):e==="#/login"?De(n):e==="#/logout"?Ae():e==="#/status"?await Me(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{he()});he();
