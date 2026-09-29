(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))n(d);new MutationObserver(d=>{for(const c of d)if(c.type==="childList")for(const m of c.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&n(m)}).observe(document,{childList:!0,subtree:!0});function t(d){const c={};return d.integrity&&(c.integrity=d.integrity),d.referrerPolicy&&(c.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?c.credentials="include":d.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function n(d){if(d.ep)return;d.ep=!0;const c=t(d);fetch(d.href,c)}})();const I="einv-token";function J(){try{return localStorage.getItem(I)}catch{return null}}function K(e){try{e?localStorage.setItem(I,e):localStorage.removeItem(I)}catch{}}async function S(e,a){const t=await q(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const n=await t.json().catch(()=>({}));throw new Error(n.error??`HTTP ${t.status}`)}return await t.json()}async function q(e,a){const t={...a?.headers??{}},n=J();n&&(t.authorization=`Bearer ${n}`);const d=await fetch(e,{...a,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function B(e,a){const t=await q(e);if(!t.ok){const m=await t.json().catch(()=>({}));throw new Error(m.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const n=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),c=document.createElement("a");c.href=URL.createObjectURL(n),c.download=d?.[1]??a,document.body.appendChild(c),c.click(),c.remove(),window.setTimeout(()=>URL.revokeObjectURL(c.href),1e4)}async function me(e){const a=await q(e);if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),n=URL.createObjectURL(t);window.open(n,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(n),6e4)}const $={health:()=>S("/api/health"),settings:()=>S("/api/settings"),list:(e={})=>{const a=new URLSearchParams(e).toString();return S(`/api/invoices${a?`?${a}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),issueBatch:e=>S("/api/invoices/issue-batch",{method:"POST",body:JSON.stringify({ids:e})}),deleteDraft:e=>S(`/api/invoices/${e}`,{method:"DELETE"}),markSent:(e,a)=>S(`/api/invoices/${e}/sent`,{method:"POST",body:JSON.stringify({channel:a})}),paymentCheck:(e,a)=>S(`/api/invoices/${e}/payment-check`,{method:"POST",body:JSON.stringify({outcome:a})}),reminders:()=>S("/api/reminders"),reminded:e=>S(`/api/invoices/${e}/reminded`,{method:"POST"}),invoiceTemplates:{list:()=>S("/api/invoice-templates"),create:(e,a)=>S("/api/invoice-templates",{method:"POST",body:JSON.stringify({name:e,body:a})}),remove:e=>S(`/api/invoice-templates/${e}`,{method:"DELETE"})},setPaid:(e,a,t)=>S(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:a,paidAt:t})}),storno:(e,a)=>S(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:a})}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),rerender:(e,a)=>S(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:a})}),renders:e=>S(`/api/invoices/${e}/renders`),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,a)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:e=>S(`/api/customers${e?`?q=${encodeURIComponent(e)}`:""}`),create:(e,a)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>S("/api/customers/number-assign",{method:"POST"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`},csvUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.csv${a?`?${a}`:""}`},datevUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.datev${a?`?${a}`:""}`},restorePreview:(e,a)=>S("/api/restore/preview",{method:"POST",body:JSON.stringify({filename:e,dataBase64:a})})};function i(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function N(e){return`${Number(e).toFixed(2)} EUR`}function j(e){return e.split("/").pop()??e}async function Z(e){let a;try{a=await $.restorePreview(e.filename,e.dataBase64)}catch(n){return alert(`Backup kann nicht gelesen werden: ${n.message}`),!1}const t=a.overwritten.length;return window.confirm([`Vorschau für ${e.filename?j(e.filename):"der hochgeladenen Datei"}:`,"",`  Im Backup:   ${a.invoices} Rechnungen (davon ${a.issued} ausgestellt)`,`  Aktuell:     ${a.currentInvoices} Rechnungen`,`  Dateien:     ${a.filesWritten}`,`  Neu dazu:    ${a.added.length} Nummern`,`  Überschrieben: ${t} Nummern ${t?`(${a.overwritten.slice(0,5).join(", ")}${a.overwritten.length>5?" …":""})`:""}`,"",t>0?"ACHTUNG: Rechnungen, die nur hier existieren, gehen unwiederbringlich verloren.":"Die aktuelle Datenbank wird durch das Backup ersetzt.","","Trotzdem wiederherstellen?"].join(`
`))}async function pe(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",n=!1;async function d(){const m=await q("/api/backups");if(!m.ok)throw new Error("Backups konnten nicht geladen werden");a=await m.json(),c()}function c(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${n?"error":""}">${i(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(m=>`<div class="row" style="margin-top:8px">
				<strong>${i(j(m.filename))}</strong>
				<span class="muted">${i(m.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(m.size/1024)} KB</span>
				<button class="secondary" data-dl="${i(m.filename)}">Download</button>
				<button class="secondary" data-restore="${i(m.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const m=await q("/api/backups",{method:"POST"});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const y=await m.json();t=`Gesichert: ${j(y.filename)}`,n=!1,await d()}catch(m){t=m.message,n=!0,c()}}),e.querySelectorAll("[data-dl]").forEach(m=>m.addEventListener("click",async()=>{const y=m.dataset.dl??"";try{await B(`/api/backups/file/${j(y)}`,j(y))}catch(p){t=p.message,n=!0,c()}})),e.querySelectorAll("[data-restore]").forEach(m=>m.addEventListener("click",async()=>{const y=m.dataset.restore??"";if(await Z({filename:y}))try{const p=await q("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:y})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const w=await p.json();t=`Wiederhergestellt: ${w.invoices} Rechnungen, ${w.templates} Vorlagen${w.fileErrors.length>0?` (${w.fileErrors.length} Dateifehler)`:""}`,n=!1,await d()}catch(p){t=p.message,n=!0,c()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const m=e.querySelector("#b-file")?.files?.[0];if(!m){t="Bitte zuerst eine ZIP-Datei wählen",n=!0,c();return}let y;try{y=await new Promise((p,w)=>{const E=new FileReader;E.onload=()=>p(String(E.result).split(",")[1]),E.onerror=()=>w(new Error("Datei nicht lesbar")),E.readAsDataURL(m)})}catch(p){t=p.message,n=!0,c();return}if(await Z({dataBase64:y}))try{const p=await q("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:y})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const w=await p.json();t=`Wiederhergestellt: ${w.invoices} Rechnungen, ${w.templates} Vorlagen`,n=!1,await d()}catch(p){t=p.message,n=!0,c()}})}try{await d()}catch(m){e.innerHTML=`<div class="card error">${i(m.message)}</div>`}}const W=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function D(e,a,t){const n=e[a],d=Array.isArray(n)?n.join(`
`):n??"";return`<label>${t}<input data-f="${a}" value="${i(d)}" /></label>`}async function he(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",n=!1;try{a=await $.company.getDefault(),a||(a=(await $.company.list())[0]??null)}catch(c){e.innerHTML=`<div class="card error">${i(c.message)}</div>`;return}function d(){const c=a?.profile??W();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${i(a?.name??"Meine Firma")}" /></label>
			${D(c,"name","Firmenname")}
			${D(c,"street","Straße")}
			<div class="grid2">${D(c,"zip","PLZ")}${D(c,"city","Ort")}</div>
			<div class="grid2">${D(c,"country","Land")}${D(c,"email","E-Mail")}</div>
			<div class="grid2">${D(c,"phone","Telefon")}${D(c,"website","Webseite")}</div>
			<div class="grid2">${D(c,"vatId","USt-IdNr.")}${D(c,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${D(c,"bankName","Bankname")}${D(c,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${i(c.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(m=>`<div class="grid2"><label>Box ${m+1}<textarea data-fbox="${m}" rows="3">${i((c.footerBoxes??[])[m]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${m}">
					${["left","center","right"].map(y=>`<option value="${y}" ${(c.footerAlign??[])[m]===y||!(c.footerAlign??[])[m]&&y==="left"?"selected":""}>${y==="left"?"Links":y==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${n?"error":""}">${i(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const m={...W()};e.querySelectorAll("input[data-f]").forEach(w=>{m[w.dataset.f]=w.value});const y=[0,1,2,3].map(w=>e.querySelector(`textarea[data-fbox="${w}"]`)?.value??"");y.some(w=>w.trim()!=="")?(m.footerBoxes=y,m.footerAlign=[0,1,2,3].map(w=>{const E=e.querySelector(`select[data-falign="${w}"]`)?.value;return E==="center"||E==="right"?E:"left"})):(delete m.footerBoxes,delete m.footerAlign);const p=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await $.company.update(a.id,{name:p,profile:m}):a=await $.company.create(p,m),t="Gespeichert.",n=!1,d()}catch(w){t=w.message,n=!0,d()}})}d()}const _=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),fe=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function ve(e,a){const t=Number(e.replace(/\D+/g,"")),n=Number(a.replace(/\D+/g,"")),d=/\d/.test(e)&&Number.isFinite(t),c=/\d/.test(a)&&Number.isFinite(n);return d&&c&&t!==n?t-n:e.localeCompare(a,"de")}function be(e,a){const t=a.endsWith("desc")?-1:1,n=[...e];return n.sort((d,c)=>a.startsWith("number")?ve(d.profile.customerNumber?.trim()??"",c.profile.customerNumber?.trim()??"")*t:d.name.localeCompare(c.name,"de")*t),n}function R(e,a,t){const n=e[a],d=Array.isArray(n)?n.join(`
`):n??"";return`<label>${t}<input data-f="${a}" value="${i(d)}" /></label>`}async function ye(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,n=!1,d="",c=!1,m="name-asc",y="";async function p(){a=await $.customers.list(y||void 0),E()}function w(r,o){return`
		<label>Name (Anzeige)<input id="k-name" value="${i(o)}" /></label>
		${R(r,"name","Firmenname")}
		${R(r,"street","Straße")}
		<div class="grid2">${R(r,"zip","PLZ")}${R(r,"city","Ort")}</div>
		<div class="grid2">${R(r,"country","Land")}${R(r,"email","E-Mail")}</div>
		<div class="grid2">${R(r,"phone","Telefon")}${R(r,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${i(r.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function E(){const r=a.filter(g=>!g.profile.customerNumber?.trim()).length,o=be(a,m);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<input id="k-q" placeholder="Suche (Name, Nummer, Ort)…" value="${i(y)}" style="max-width:240px" />
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${fe.map(g=>`<option value="${g.value}" ${g.value===m?"selected":""}>${g.label}</option>`).join("")}
			</select></label>
			${r>0?`<button class="secondary" id="k-number">${r} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${o.map(g=>`<div class="row" style="margin-top:8px">
				<strong>${i(g.name)}</strong>
				${g.profile.customerNumber?.trim()?`<span class="badge">${i(g.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${i(g.profile.city||"")}</span>
				<button class="secondary" data-edit="${g.id}">Bearbeiten</button>
				<button class="danger" data-del="${g.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${o.length} Kunden</p>
		</div>
		${t||n?`<div class="card"><h3>${n?"Neuer Kunde":i(t?.name??"")}</h3>
			${w(t?.profile??_(),t?.name??"")}
			${d?`<p class="${c?"error":""}">${i(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",g=>{m=g.target.value,E()});let f;e.querySelector("#k-q")?.addEventListener("input",g=>{y=g.target.value,f!==void 0&&clearTimeout(f),f=setTimeout(()=>{p()},250)}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{d=`${await $.customers.assignNumbers()} Kundennummer(n) vergeben.`,c=!1,await p()}catch(g){d=g.message,c=!0,E()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,n=!0,d="",E()}),e.querySelectorAll("[data-edit]").forEach(g=>g.addEventListener("click",()=>{t=a.find(u=>u.id===g.dataset.edit)??null,n=!1,d="",E()})),e.querySelectorAll("[data-del]").forEach(g=>g.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(g.dataset.del??""),await p()}catch(u){d=u.message,c=!0,E()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,n=!1,d="",E()}),e.querySelector("#k-save")?.addEventListener("click",()=>{s()})}async function s(){const r={..._()};e.querySelectorAll("input[data-f]").forEach(f=>{r[f.dataset.f]=f.value});const o=e.querySelector("#k-name")?.value.trim()||r.name.trim()||"Kunde";try{n?await $.customers.create(o,r):t&&await $.customers.update(t.id,{name:o,profile:r}),t=null,n=!1,d="",await p()}catch(f){d=f.message,c=!0,E()}}try{await p()}catch(r){e.innerHTML=`<div class="card error">${i(r.message)}</div>`}}function ge(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function $e(e){return`<span class="badge ${e}">${e}</span>`}async function we(e){e.innerHTML=`
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
		<div id="list"></div>
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),n=e.querySelector("#f-sort"),d=e.querySelector("#f-order"),c=e.querySelector("#f-sent"),m=e.querySelector("#reminders");let y="desc",p=[];const w=e.querySelector("#list"),E=e.querySelector("#list-err");let s=0;function r(l){E.innerHTML=`<div class="card error">${i(l.message)}</div>`}async function o(l){const h=l.dataset.paid??"",b=l.checked;l.disabled=!0;try{await $.setPaid(h,b),E.innerHTML=`<div class="card muted">${b?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await f()}catch(T){l.checked=!b,r(T)}finally{l.disabled=!1}}async function f(){const l=++s,h={sort:n.value,order:y};a.value&&(h.status=a.value),t.value.trim()&&(h.q=t.value.trim()),c.value&&(h.sent=c.value);try{const b=await $.list(h);if(l!==s)return;p=b.filter(v=>v.status==="draft").map(v=>v.id);const T=e.querySelector("#f-issue-all");T.hidden=p.length===0,T.textContent=`Ausstellen (${p.length})`,w.innerHTML=b.map(v=>`<div class="card"><div class="row">
					${v.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${v.paid?`Ausgeglichen am ${i((v.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${i(v.id)}" ${v.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${i(v.number??"(Entwurf)")}</strong>${$e(v.status)}
					<span>${i(v.buyer.name||"—")}</span>
					<span>${N(v.totals.grossTotal)}</span>
					${v.skontoPercent>0&&!v.paid?`<span class="muted">${N(v.totals.grossTotal-ge(v))} bei ${i(v.skontoPercent)} % Skonto</span>`:""}
					${v.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					${v.status==="issued"?v.sentAt?`<span class="badge issued" title="Über ${i(v.sendChannel??"E-Mail")} versendet am ${i(v.sentAt.slice(0,10))}">versendet</span>`:`<button class="secondary" data-sent="${i(v.id)}" title="Als versendet markieren">nicht versendet</button>`:""}
					<a href="#/invoices/${i(v.id)}">Ansehen</a>
					${v.status==="draft"?`<a href="#/edit/${i(v.id)}">Bearbeiten</a>`:""}
					${v.status==="draft"?`<button class="secondary" data-del="${i(v.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',w.querySelectorAll("[data-paid]").forEach(v=>v.addEventListener("change",()=>{o(v)})),w.querySelectorAll("[data-sent]").forEach(v=>v.addEventListener("click",async()=>{try{await $.markSent(v.dataset.sent??"","E-Mail"),await f()}catch(P){r(P)}})),w.querySelectorAll("[data-del]").forEach(v=>v.addEventListener("click",async()=>{if(window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen."))try{await $.deleteDraft(v.dataset.del??""),E.innerHTML='<div class="card muted">Entwurf gelöscht.</div>',await f()}catch(P){r(P)}}))}catch(b){if(l!==s)return;w.innerHTML=`<div class="card error">${i(b.message)}</div>`}}a.onchange=()=>{f()},n.onchange=()=>{f()},c.onchange=()=>{f()},d.onclick=()=>{y=y==="desc"?"asc":"desc",d.textContent=y==="desc"?"↓ absteigend":"↑ aufsteigend",f()};let g;t.oninput=()=>{g!==void 0&&clearTimeout(g),g=setTimeout(()=>{f()},250)},e.querySelector("#f-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${p.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`))try{const l=await $.issueBatch(p);E.innerHTML=`<div class="card ${l.failed.length?"error":"muted"}">${l.issued.length} ausgestellt${l.failed.length?`, ${l.failed.length} fehlgeschlagen: ${i(l.failed[0].error??"")}`:""}.</div>`,await f()}catch(l){r(l)}});const u=()=>{const l={};return a.value&&(l.status=a.value),t.value.trim()&&(l.q=t.value.trim()),l};e.querySelector("#f-export")?.addEventListener("click",async()=>{try{await B($.exportUrl(u()),"export.xlsx")}catch(l){r(l)}}),e.querySelector("#f-csv")?.addEventListener("click",async()=>{try{await B($.csvUrl(u()),"rechnungen.csv")}catch(l){r(l)}}),e.querySelector("#f-datev")?.addEventListener("click",async()=>{try{await B($.datevUrl(u()),"rechnungen.datev")}catch(l){r(l)}});async function L(){try{const l=await $.reminders();if(!l.length){m.innerHTML="";return}m.innerHTML=`<div class="card"><div class="row">
				<strong>Überfällig: ${l.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${l.map(h=>`<div class="card" style="flex:1">
						<strong>${i(h.invoice.number??"")}</strong> ${i(h.invoice.buyer.name)}
						<br /><span class="muted">${h.overdueDays} Tage überfällig · Stufe ${h.level}${h.skontoActive?` · Skonto ${i(h.invoice.skontoPercent)} % noch möglich bis ${i(h.invoice.skontoDueDate??"")}`:""}</span>
						<br /><a href="#/invoices/${i(h.invoice.id)}">Ansehen</a>
					</div>`).join("")}</div></div>`}catch{}}await f(),await L()}function C(e){return Math.round((e+Number.EPSILON)*100)/100}function ke(e){const a=(e??"").trim(),[t,n]=a.split(".."),d=c=>/^\d{4}-\d{2}-\d{2}$/.test(c??"")?`${c.slice(8,10)}.${c.slice(5,7)}.${c.slice(0,4)}`:c??"";return n?`${d(t)} – ${d(n)}`:d(t)}async function Se(e,a){e.innerHTML='<div class="card">Lade…</div>';try{let n=await $.get(a);const c=(Array.isArray(n.lines)?n.lines:[]).map(s=>{const r=Math.min(Math.max(Number(s.discountPercent)||0,0),100),o=Number(s.quantity)||0,f=Number(s.unitPriceNet)||0;return{line:s,discount:r,gross:C(o*f),net:C(o*f*(1-r/100))}}),m=c.some(s=>s.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${i(n.number??"(Entwurf)")}</strong>
				<span class="badge ${n.status}">${n.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${i(n.seller.name)}<br />${i(n.seller.street)}<br />${i(n.seller.zip)} ${i(n.seller.city)}</div>
				<div><strong>Käufer</strong><br />${i(n.buyer.name)}<br />${i(n.buyer.street)}<br />${i(n.buyer.zip)} ${i(n.buyer.city)}${n.buyer.email?`<br />${i(n.buyer.email)}`:""}</div>
			</div>
			<p>Ausgestellt: ${i(n.issueDate)} · Leistung: ${i(ke(n.deliveryDate))}${n.dueDate?` · Fällig: ${i(n.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${m?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${c.map((s,r)=>`<tr>
					<td>${r+1}</td><td>${i(s.line.description)}${s.line.sku?` (${i(s.line.sku)})`:""}</td>
					<td class="r">${i(s.line.quantity)} ${i(s.line.unit)}</td>
					<td class="r">${N(Number(s.line.unitPriceNet))}</td>
					${m?`<td class="r">${s.discount>0?`${i(s.discount)} %`:"–"}</td><td class="r">${s.discount>0?N(C(s.gross-s.net)):"–"}</td>`:""}
					<td class="r">${i(s.line.vatRate)} %</td><td class="r"><strong>${N(s.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${N(n.totals.grossTotal)}</strong> <span class="muted">(netto ${N(n.totals.netTotal)} + USt ${N(n.totals.taxTotal)})</span></p>
			${n.notes?`<p class="muted">Notiz: ${i(n.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${n.status==="draft"?`<a class="btn" href="#/edit/${i(n.id)}">Bearbeiten</a>`:""}
				${n.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${n.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${n.paid?"checked":""} /><span>bezahlt${n.paid&&n.paidAt?` (${i(n.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${n.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				${n.status==="issued"?n.sentAt?`<span class="badge issued" title="${i(n.sendChannel??"E-Mail")} am ${i(n.sentAt.slice(0,10))}">versendet</span>`:'<button class="secondary" id="d-sent" title="Als versendet markieren">Als versendet markieren</button>':""}
				${n.status!=="draft"&&n.pdfPath?'<button class="secondary" id="d-rerender" title="Erzeugt die PDF neu, z. B. nach einer Layout-Korrektur. Der Inhalt der Rechnung bleibt unverändert, das Original wird archiviert.">Neu rendern</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
			${n.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
			${n.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
			${n.status==="issued"&&n.pdfPath?'<button class="secondary" id="d-mail">E-Mail (PDF)</button>':""}
			${n.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
			${n.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div></div>`;const y=e.querySelector("#d-out"),p=s=>{y.innerHTML=`<p class="error">${i(s.message)}</p>`},w=e.querySelector("#d-history"),E=async()=>{if(n.status!=="draft")try{const s=await $.renders(n.id);if(!s.length){w.innerHTML="";return}w.innerHTML=`<details><summary>Neu gerendert (${s.length})</summary><ul>${s.map(r=>`<li>${i(r.createdAt.slice(0,16).replace("T"," "))} – ${i(r.artifact.toUpperCase())}${r.reason?` – ${i(r.reason)}`:""}${r.previousPath?` – Original: <code>${i(r.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await E(),e.querySelectorAll("[data-dl]").forEach(s=>s.addEventListener("click",async()=>{const r=s.dataset.dl,o=r==="pdf"?$.pdfUrl(n.id):r==="xml"?$.xmlUrl(n.id):$.xlsxUrl(n.id);try{await B(o,`${n.number??"rechnung"}.${r}`)}catch(f){p(f)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await me($.pdfUrl(n.id))}catch(s){p(s)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{y.innerHTML='<p class="muted">Validiere…</p>';try{const s=await $.validate(n.id);y.innerHTML=s.formatErrors.length+s.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...s.formatErrors,...s.businessErrors].map(r=>`<li class="error">${i(r)}</li>`).join("")}</ul>`}catch(s){y.innerHTML=`<p class="error">${i(s.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async s=>{const r=s.target,o=r.checked;r.disabled=!0;try{n=await $.setPaid(n.id,o),y.innerHTML=`<p style="color:var(--ok)">${o?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(f){r.checked=!o,y.innerHTML=`<p class="error">${i(f.message)}</p>`}finally{r.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const s=(n.buyer.email??"").trim(),r=`${n.documentTitle??"Rechnung"} ${n.number??""}`.trim(),o=`Guten Tag ${n.buyer.name||""},

anbei erhalten Sie ${r} vom ${n.issueDate}.
Gesamtbetrag: ${N(n.totals.grossTotal)}.
${n.dueDate?`Bitte überweisen bis ${n.dueDate}.
`:""}
Mit freundlichen Grüßen
${n.seller.name}
`;try{await B($.pdfUrl(n.id),`${n.number??"rechnung"}.pdf`)}catch(g){p(g);return}const f=`mailto:${s}?subject=${encodeURIComponent(r)}&body=${encodeURIComponent(o)}`;window.location.href=f,y.innerHTML=s?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${i(s)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-sent")?.addEventListener("click",async()=>{try{n=await $.markSent(n.id,"E-Mail"),y.innerHTML=`<p style="color:var(--ok)">Als versendet markiert${n.sentAt?` (${i(n.sentAt.slice(0,10))})`:""}.</p>`,e.querySelector("#d-sent")?.remove()}catch(s){p(s)}}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const s=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(s!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?")){y.innerHTML='<p class="muted">Rendere neu…</p>';try{const r=await $.rerender(n.id,s.trim()||void 0);n=r.invoice,y.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${r.archivedPath?` Das Original liegt als <code>${i(r.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await E();const o=e.querySelector("#d-duty");if(n.status!=="draft"&&!n.paid)try{const{duty:f,checked:g}=await $.paymentCheck(n.id);f.required&&!g?(o.innerHTML=`<p class="error">${i(f.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`,e.querySelector("#d-duty-ok")?.addEventListener("click",async()=>{try{await $.paymentCheck(n.id,"geprüft"),o.innerHTML='<p style="color:var(--ok)">Zahlungsweise geprüft.</p>'}catch(u){p(u)}})):g&&(o.innerHTML=`<p class="muted">Zahlungsweise geprüft${n.paymentCheckedAt?` am ${i(n.paymentCheckedAt.slice(0,10))}`:""}.</p>`)}catch{}}catch(r){y.innerHTML=`<p class="error">${i(r.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const s=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(s!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:r}=await $.storno(n.id,s.trim()||void 0);location.hash=`#/edit/${r.id}`,location.reload()}catch(r){y.innerHTML=`<p class="error">${i(r.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const s=await $.issue(n.id);location.hash=`#/invoices/${s.id}`,location.reload()}catch(s){y.innerHTML=`<p class="error">${i(s.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${i(t.message)}</div>`}}function Ee(e){const a=J();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${i(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";K(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{K(null),location.hash="#/login",location.reload()})}function Te(){K(null),location.hash="#/login"}async function Le(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,n=!1,d="",c=!1;async function m(){a=await $.products.list(),p()}function y(s){const r=o=>i(o??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${r(s.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${r(s.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${r(s.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${r(s.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${s.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(o=>`<option ${o===(s.vatRate??19)?"selected":""}>${o}</option>`).join("")}
		</select></label>`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${a.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${i(s.sku?`${s.sku} · `:"")}${i(s.name)}</strong>
				<span class="muted">${i(s.unit)} · ${Number(s.unitPriceNet).toFixed(2)} EUR · ${s.vatRate} %</span>
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="danger" data-del="${s.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||n?`<div class="card"><h3>${n?"Neue Position":i(t?.name??"")}</h3>
			${y(t??{})}
			${d?`<p class="${c?"error":""}">${i(d)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,n=!0,d="",p()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(r=>r.id===s.dataset.edit)??null,n=!1,d="",p()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(s.dataset.del??""),await m()}catch(r){d=r.message,c=!0,p()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,n=!1,d="",p()}),e.querySelector("#p-save")?.addEventListener("click",()=>{E()})}function w(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function E(){const s=w();try{n?await $.products.create(s):t&&await $.products.update(t.id,s),t=null,n=!1,d="",await m()}catch(r){d=r.message,c=!0,p()}}try{await m()}catch(s){e.innerHTML=`<div class="card error">${i(s.message)}</div>`}}async function Ne(e){try{const a=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${i(a.version)} · Schema: ${i(String(a.schemaVersion))}</p>
			<pre class="dump">${i(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${i(a.message)}</div>`}}const Pe=["title","meta","parties","positions","totals"],X=["payment","notes"],qe=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function De(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,n="",d=[];try{const s=await q("/api/company-profiles");s.ok&&(d=await s.json())}catch{}async function c(){a=await m(),p()}async function m(){const s=await q("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function y(s){const r=s.definition,o=(f,g,u)=>`<label><input type="checkbox" data-f="blocks.${f}" ${r.blocks[f]?"checked":""} ${u?"disabled":""} style="width:auto" /> ${g}${u?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${i(s.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${d.map(f=>`<option value="${i(f.id)}" ${s.definition.companyId===f.id?"selected":""}>${i(f.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${i(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${i(r.colors.text)}" /></label>
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
		${Pe.map(f=>o(f,`Block ${f}`,!0)).join("")}
		${X.map(f=>o(f,`Block ${f}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${r.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${r.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${r.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${r.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${r.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${r.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${r.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${i(r.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${i(r.closingText??"")}</textarea></label>
		<div class="grid2">
			<label title="Leer lassen: es wird kein Name gedruckt">Unterschrift (Name, optional)<input id="t-sign" value="${i(r.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${i(r.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${i(r.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${qe.map(f=>`<option value="${f.value}" ${r.logo?.position===f.value?"selected":""}>${f.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${r.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${i(r.logo.path)}</p>`:""}`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${a.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${i(s.name)}</strong><span class="muted">v${s.version}</span>
				${s.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${s.id}">Vorschau</button>
				${s.isDefault?"":`<button class="secondary" data-def="${s.id}">Standard</button>`}
				${s.isDefault?"":`<button class="danger" data-del="${s.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${i(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${y(t)}
			${n?`<p class="error">${i(n)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const o=(await(await q("/api/templates")).json())[0];if(!o){n="Keine Basisvorlage vorhanden",p();return}t={...structuredClone(o),id:"neu",name:"Neu",version:1,isDefault:!1},n="",p()}catch(s){n=s.message,p()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const r=a.find(o=>o.id===s.dataset.edit);r&&(t=structuredClone(r),n="",p())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const r=a.find(o=>o.id===s.dataset.prev);if(r)try{const o=await q("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!o.ok){const g=await o.json().catch(()=>({}));throw new Error(g.error??"Vorschau fehlgeschlagen")}const f=await o.blob();window.open(URL.createObjectURL(f),"_blank")}catch(o){n=o.message,p()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await q(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await c()}catch(r){n=r.message,p()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const r=await q(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!r.ok){n=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await c()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,n="",p()}),e.querySelector("#t-save")?.addEventListener("click",()=>{E()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=w();if(s)try{const r=await q("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!r.ok){const o=await r.json().catch(()=>({}));throw new Error(o.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){n=r.message,p()}})}function w(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const o of X)s.blocks[o]=e.querySelector(`[data-f="blocks.${o}"]`)?.checked??s.blocks[o];for(const o of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[o]=e.querySelector(`[data-f="${o}"]`)?.checked??!1;for(const o of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const f=e.querySelector(`[data-f="${o}"]`);f&&(s[o]=f.checked)}s.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?s.companyId=r:delete s.companyId,s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),s.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:s.name,definition:s}}async function E(){const s=w();if(!s)return;const r=s.definition;try{let o=t.id;if(o==="neu"){const g=await q("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!g.ok)throw new Error((await g.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");o=(await g.json()).id}else{const g=await q(`/api/templates/${o}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!g.ok)throw new Error((await g.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const f=e.querySelector("#t-logo")?.files?.[0];if(f){const g=await new Promise((L,l)=>{const h=new FileReader;h.onload=()=>L(String(h.result).split(",")[1]),h.onerror=()=>l(new Error("Datei nicht lesbar")),h.readAsDataURL(f)}),u=await q(`/api/templates/${o}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:f.name,mime:f.type,dataBase64:g})});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,n="",await c()}catch(o){n=o.message,p()}}try{await c()}catch(s){e.innerHTML=`<div class="card error">${i(s.message)}</div>`}}const Y=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),U=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:z.defaultVatRate});let z={defaultVatRate:19,defaultPaymentTerms:""};const G=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],Q="__own__";function ie(e,a){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+a),t.toISOString().slice(0,10)}function re(e){return!!e&&!le(e)}function le(e){return!!e&&G.some(a=>a.text===e)}function ce(e){return G.find(a=>a.text===e)?.days??null}function ee(e){if(!e.dueAuto)return;const a=ce(e.paymentTerms);a!==null&&(e.dueDate=ie(e.issueDate,a))}function M(e){return Math.round((e+Number.EPSILON)*100)/100}function te(e){const a=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,n=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(a*t*(1-n/100))}function Ae(e){return(e??"").trim().split("..")[0]??""}function xe(e){const a=(e??"").trim().split("..");return a.length>1?a[1]:""}const O="einv-wizard-v1",oe="einv-employee";function de(){try{return localStorage.getItem(oe)??""}catch{return""}}function ae(){return new Date().toISOString().slice(0,10)}function V(){return{step:0,seller:Y(),buyer:Y(),lines:[U()],issueDate:ae(),deliveryDate:ae(),dueDate:"",employee:de(),documentTitle:"Rechnung",notes:"",paymentTerms:z.defaultPaymentTerms,termsCustom:re(z.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function F(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function Me(){try{const e=localStorage.getItem(O);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...V(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function ne(e,a,t){return`
		<label>Name<input data-p="${e}" data-f="name" value="${i(a.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${i(a.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${i(a.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${i(a.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${i(a.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${i(a.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${e}" data-f="phone" value="${i(a.phone)}" /></label>
			${t?`<label>Webseite<input data-p="${e}" data-f="website" value="${i(a.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${i(a.contactName)}" /></label>`}
		</div>
		${t?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${i(a.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${i(a.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${i(a.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${i(a.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Re=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Oe={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function se(e,a){let t=V();const n=!!a;let d=[],c=[],m=[],y=!1;if($.settings().then(u=>{z={defaultVatRate:Number(u.defaultVatRate)||19,defaultPaymentTerms:u.defaultPaymentTerms??""}}).catch(()=>{}),a){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(a).then(u=>{if(u.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${i(u.status)}).</div>`;return}t={...V(),seller:u.seller,buyer:u.buyer,lines:u.lines.length>0?u.lines:[U()],issueDate:u.issueDate,deliveryDate:u.deliveryDate,dueDate:u.dueDate??"",employee:u.employeeCode??de(),documentTitle:u.documentTitle,notes:u.notes??"",paymentTerms:u.paymentTerms??z.defaultPaymentTerms,termsCustom:re(u.paymentTerms),skontoPercent:u.skontoPercent??0,skontoDueDate:u.skontoDueDate??"",draftId:u.id},w(),o()}).catch(u=>{e.innerHTML=`<div class="card error">${i(u.message)}</div>`});return}const p=Me();if(p&&F(p)&&!p.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${i(p.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=p,w(),o()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(O),w(),o()});return}p&&F(p)&&(t=p),w(),F(t)||$.company.getDefault().then(u=>{u&&!t.seller.name.trim()&&u.profile.name.trim()&&(t.seller={...t.seller,...u.profile},t.selectedCompany=u.id,o(!0))}).catch(()=>{});function w(){$.company.list().then(u=>{d=u,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&o()}).catch(()=>{}),$.customers.list().then(u=>{c=u,t.step===1&&!e.querySelector("#w-customer")&&o()}).catch(()=>{}),$.products.list().then(u=>{m=u,t.step===2&&!e.querySelector("#w-catalog")&&o()}).catch(()=>{})}function E(){try{if(n)return;if(!t.dirty){localStorage.removeItem(O);return}localStorage.setItem(O,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function s(){e.querySelectorAll("input[data-p]").forEach(b=>{const T=b.dataset.p==="seller"?t.seller:t.buyer;T[b.dataset.f]=b.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(b=>{const[T,v]=b.dataset.l.split("."),P=t.lines[Number(T)];if(P)if(v==="quantity"||v==="unitPriceNet"||v==="vatRate"||v==="discountPercent"){const x=Number(b.value),H=Number.isFinite(x)?x:0;P[v]=v==="discountPercent"?Math.min(Math.max(H,0),100):H}else P[v]=b.value});const u=b=>e.querySelector(`#${b}`)?.value??"",L=()=>{const b=u("w-delivery");if(!b)return;const T=u("w-delivery-to");t.deliveryDate=T&&T!==b?`${b}..${T}`:b};t.issueDate=u("w-issue")||t.issueDate,L(),e.querySelector("#w-due")&&(t.dueDate=u("w-due")),ee(t),e.querySelector("#w-employee")&&(t.employee=u("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=u("w-title")||t.documentTitle);const l=e.querySelector("#w-notes");l&&(t.notes=l.value);const h=e.querySelector("#w-terms");if(h&&(t.paymentTerms=h.value),e.querySelector("#w-skonto")){const b=Number(u("w-skonto"));t.skontoPercent=Number.isFinite(b)?Math.min(Math.max(b,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=u("w-skonto-due")),E()}function r(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((L,l)=>`<span class="${l===t.step?"on":""}">${l+1}. ${L}</span>`).join("")}</div>`}function o(u=!1){u||s();let L="";if(t.step===0&&(L=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(l=>`<option value="${i(l.id)}" ${t.selectedCompany===l.id?"selected":""}>${i(l.name)}${l.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ne("seller",t.seller,!0)}</div>`),t.step===1&&(L=`<div class="card"><h3>Käufer</h3>
				${c.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${c.map(l=>`<option value="${i(l.id)}" ${t.selectedCustomer===l.id?"selected":""}>${i(l.name)}${l.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ne("buyer",t.buyer,!1)}</div>`),t.step===2&&(L=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Re.map(l=>`<option ${l===t.documentTitle?"selected":""}>${l}</option>`).join("")}
				</select></label>
				${m.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${m.map(l=>`<option value="${i(l.id)}">${i(l.sku?`${l.sku} · `:"")}${i(l.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((l,h)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${h+1}</span><strong>Position ${h+1}</strong>
						<span class="line-sum">${N(te(l))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${h}.description" value="${i(l.description)}" /></label>
						<label>Art.Nr.<input data-l="${h}.sku" value="${i(l.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${h}.details" rows="1">${i(l.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${h}.quantity" type="number" min="0" step="any" value="${i(l.quantity)}" /></label>
						<label>Einheit<input data-l="${h}.unit" value="${i(l.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${h}.unitPriceNet" type="number" min="0" step="0.01" value="${i(l.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${h}.discountPercent" type="number" min="0" max="100" step="0.1" value="${i(l.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${h}.vatRate">
							${[19,7,0].map(b=>`<option ${b===Number(l.vatRate)?"selected":""}>${b}</option>`).join("")}
						</select></label>
						${Number(l.vatRate)===0?`<label>Steuerbefreiung<select data-l="${h}.exemptionCategory">
								${["E","AE","K","G","O"].map(b=>`<option ${(l.exemptionCategory??"E")===b?"selected":""} value="${b}">${b} — ${Oe[b]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${h}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${i(l.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${h}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${i(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${i(t.dueDate)}" />${t.dueAuto?' <span class="muted">(aus Zahlungsbedingung)</span>':""}</label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${i(Ae(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${i(xe(t.deliveryDate))}" /></label>
					</div>
					<p class="muted">Nur „von" angeben, wenn die Leistung an einem Tag erbracht wurde. Mit „bis" wird der Zeitraum als BT-74/BT-75 in die Rechnung geschrieben.</p>
				</fieldset>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${i(t.employee)}" /></label>
				<fieldset class="period">
					<legend>Skonto (Rabatt bei früher Zahlung)</legend>
					<div class="grid2">
						<label>Skonto %<input id="w-skonto" type="number" min="0" max="100" step="0.01" value="${i(t.skontoPercent)}" /></label>
						<label>Skonto bis<input id="w-skonto-due" type="date" value="${i(t.skontoDueDate)}" /></label>
					</div>
					<p class="muted">Bei 0 % kein Skonto. Ohne eigenes Datum gilt das Fälligkeitsdatum. Der Skonto mindert den Zahlbetrag (BT-9) und steht als Bedingung mit Subject-Code AAK im XML.</p>
				</fieldset>
				<label>Notizen<textarea id="w-notes">${i(t.notes)}</textarea></label>
				<label>Zahlungsbedingungen<select id="w-terms-select">
					<option value="" ${t.paymentTerms===""?"selected":""}>keine</option>
					${G.map(l=>`<option value="${i(l.text)}" ${!t.termsCustom&&t.paymentTerms===l.text?"selected":""}>${i(l.text)}</option>`).join("")}
					<option value="${Q}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${i(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const l=t.lines.map(k=>{const A=Math.min(Math.max(Number(k.discountPercent)||0,0),100);return{...k,discount:A,gross:M((Number(k.quantity)||0)*(Number(k.unitPriceNet)||0)),net:te(k)}}).filter(k=>k.description.trim()!==""||k.gross>0),h=new Map;for(const k of l)h.set(Number(k.vatRate)||0,M((h.get(Number(k.vatRate)||0)??0)+k.net));const b=[...h.entries()].sort(([k],[A])=>k-A).map(([k,A])=>({rate:k,net:A,tax:M(A*k/100)})),T=M(b.reduce((k,A)=>k+A.net,0)),v=M(b.reduce((k,A)=>k+A.tax,0)),P=M(T+v),x=M(P*(Number(t.skontoPercent)||0)/100),H=l.some(k=>k.discount>0);L=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${i(t.documentTitle)}</strong> · ${i(t.seller.name||"—")} → ${i(t.buyer.name||"—")} · ${l.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${H?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${l.map(k=>`<tr>
							<td>${i(k.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${i(k.quantity)} ${i(k.unit)}</td>
							<td class="r">${N(k.unitPriceNet)}</td>
							${H?`<td class="r">${k.discount>0?`${i(k.discount)} %`:"–"}</td><td class="r">${k.discount>0?N(M(k.gross-k.net)):"–"}</td>`:""}
							<td class="r">${i(k.vatRate)} %</td><td class="r"><strong>${N(k.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${N(T)}</td></tr>
						${b.map(k=>`<tr class="sub"><td class="lbl">USt ${i(k.rate)} % auf ${N(k.net)}</td><td class="r">${N(k.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${N(P)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${i(t.skontoPercent)} % Skonto bis ${i(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${N(x)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${N(P-x)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${r()}${L}
			${t.error?`<div class="card error">${i(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,o()}),e.querySelector("#w-terms-select")?.addEventListener("change",l=>{const h=l.target.value;if(h===Q)t.termsCustom=!0,le(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=h;const b=ce(h);b!==null?(t.dueAuto=!0,t.dueDate=ie(t.issueDate,b)):t.dueAuto=!1}o()}),e.querySelector("#w-due")?.addEventListener("change",()=>{s(),t.dueAuto=!1,o()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const l=e.querySelector("#w-company")?.value??"",h=d.find(b=>b.id===l);h?(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,o(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const l=e.querySelector("#w-customer")?.value??"",h=c.find(b=>b.id===l);h?(t.buyer={...t.buyer,...h.profile},t.selectedCustomer=h.id,o(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,o()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(O),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.push(U()),o()}),e.querySelector("#w-take")?.addEventListener("click",()=>{s();const l=e.querySelector("#w-catalog")?.value??"",h=m.find(b=>b.id===l);if(h){const b={description:h.name,sku:h.sku||void 0,details:h.details||void 0,quantity:1,unit:h.unit,unitPriceNet:h.unitPriceNet,vatRate:h.vatRate},T=t.lines.findIndex(v=>!v.description.trim()&&!(v.sku??"").trim()&&!(v.details??"").trim()&&v.unitPriceNet===0);T>=0?t.lines[T]=b:t.lines.push(b),t.dirty=!0}o(!0)}),e.querySelectorAll("[data-del]").forEach(l=>l.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.splice(Number(l.dataset.del),1),t.lines.length===0&&t.lines.push(U()),o(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{f(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&f(!0)})}async function f(u){if(!y){y=!0;try{s(),t.error="";const L={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(oe,t.employee.trim())}catch{}let l;t.draftId?l=await $.update(t.draftId,L):(l=await $.create(L),t.draftId=l.id),u&&(l=await $.issue(l.id));try{localStorage.removeItem(O)}catch{}location.hash=`#/invoices/${l.id}`}catch(l){t.error=l.message,o()}}finally{y=!1}}}e.addEventListener("input",()=>{try{g()}catch{}});function g(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(T=>{const v=T.dataset.p==="seller"?t.seller:t.buyer;v[T.dataset.f]=T.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(T=>{const[v,P]=T.dataset.l.split("."),x=t.lines[Number(v)];x&&(P==="quantity"||P==="unitPriceNet"||P==="vatRate"||P==="discountPercent"?x[P]=Number(T.value):x[P]=T.value)});const u=T=>e.querySelector(`#${T}`)?.value??"",L=u("w-issue"),l=u("w-delivery"),h=u("w-delivery-to");L&&(t.issueDate=L),l&&(t.deliveryDate=h&&h!==l?`${l}..${h}`:l),e.querySelector("#w-due")&&(t.dueDate=u("w-due")),ee(t),e.querySelector("#w-employee")&&(t.employee=u("w-employee"));const b=u("w-title");if(b&&(t.documentTitle=b),e.querySelector("#w-skonto")){const T=Number(u("w-skonto"));t.skontoPercent=Number.isFinite(T)?Math.min(Math.max(T,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=u("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,E()}o()}const Be=document.querySelector("#app");function He(e){const a=!!J(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];Be.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([n,d])=>`<a href="${n}" class="${e===n||n==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function ue(){const e=location.hash||"#/";He(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await we(a):e==="#/new"?se(a):e.startsWith("#/edit/")?se(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Se(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await De(a):e==="#/company"?await he(a):e==="#/customers"?await ye(a):e==="#/products"?await Le(a):e==="#/backup"?await pe(a):e==="#/login"?Ee(a):e==="#/logout"?Te():e==="#/status"?await Ne(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{ue()});ue();
