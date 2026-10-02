(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const u of document.querySelectorAll('link[rel="modulepreload"]'))t(u);new MutationObserver(u=>{for(const l of u)if(l.type==="childList")for(const m of l.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&t(m)}).observe(document,{childList:!0,subtree:!0});function r(u){const l={};return u.integrity&&(l.integrity=u.integrity),u.referrerPolicy&&(l.referrerPolicy=u.referrerPolicy),u.crossOrigin==="use-credentials"?l.credentials="include":u.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function t(u){if(u.ep)return;u.ep=!0;const l=r(u);fetch(u.href,l)}})();const te="einv-token";function ce(){try{return localStorage.getItem(te)}catch{return null}}function ne(e){try{e?localStorage.setItem(te,e):localStorage.removeItem(te)}catch{}}async function A(e,n){const r=await R(e,{headers:{"content-type":"application/json"},...n});if(!r.ok){const t=await r.json().catch(()=>({}));throw new Error(t.error??`HTTP ${r.status}`)}return await r.json()}async function R(e,n){const r={...n?.headers??{}},t=ce();t&&(r.authorization=`Bearer ${t}`);const u=await fetch(e,{...n,headers:r});if(u.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return u}async function F(e,n){const r=await R(e);if(!r.ok){const m=await r.json().catch(()=>({}));throw new Error(m.error??`Download fehlgeschlagen (HTTP ${r.status})`)}const t=await r.blob(),u=/filename="([^"]+)"/.exec(r.headers.get("content-disposition")??""),l=document.createElement("a");l.href=URL.createObjectURL(t),l.download=u?.[1]??n,document.body.appendChild(l),l.click(),l.remove(),window.setTimeout(()=>URL.revokeObjectURL(l.href),1e4)}async function Re(e){const n=await R(e);if(!n.ok){const u=await n.json().catch(()=>({}));throw new Error(u.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const r=await n.blob(),t=URL.createObjectURL(r);window.open(t,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(t),6e4)}function X(e){return new URLSearchParams({docType:"invoice",...e}).toString()}const v={health:()=>A("/api/health"),settings:()=>A("/api/settings"),list:(e={})=>{const n=new URLSearchParams(e).toString();return A(`/api/invoices${n?`?${n}`:""}`)},get:e=>A(`/api/invoices/${e}`),create:e=>A("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>A(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>A(`/api/invoices/${e}/issue`,{method:"POST"}),issueBatch:e=>A("/api/invoices/issue-batch",{method:"POST",body:JSON.stringify({ids:e})}),deleteDraft:e=>A(`/api/invoices/${e}`,{method:"DELETE"}),markSent:(e,n)=>A(`/api/invoices/${e}/sent`,{method:"POST",body:JSON.stringify({channel:n})}),paymentCheck:(e,n)=>A(`/api/invoices/${e}/payment-check`,{method:"POST",body:JSON.stringify({outcome:n})}),reminders:()=>A("/api/reminders"),reminded:e=>A(`/api/invoices/${e}/reminded`,{method:"POST"}),invoiceTemplates:{list:()=>A("/api/invoice-templates"),create:(e,n)=>A("/api/invoice-templates",{method:"POST",body:JSON.stringify({name:e,body:n})}),update:(e,n)=>A(`/api/invoice-templates/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>A(`/api/invoice-templates/${e}`,{method:"DELETE"})},setPaid:(e,n,r)=>A(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:r})}),storno:(e,n)=>A(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>A(`/api/invoices/${e}/validate`,{method:"POST"}),quoteAccept:(e,n)=>A(`/api/invoices/${e}/quote-accept`,{method:"POST",body:JSON.stringify({at:n})}),quoteReject:(e,n)=>A(`/api/invoices/${e}/quote-reject`,{method:"POST",body:JSON.stringify({reason:n})}),convert:(e,n=!0)=>A(`/api/invoices/${e}/convert`,{method:"POST",body:JSON.stringify({requireAccepted:n})}),asTemplate:(e,n)=>A(`/api/invoices/${e}/as-template`,{method:"POST",body:JSON.stringify({name:n})}),rerender:(e,n)=>A(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:n})}),renders:e=>A(`/api/invoices/${e}/renders`),validationReports:e=>A(`/api/invoices/${e}/validation`),validationReportUrl:(e,n)=>`/api/invoices/${e}/validation/${n}.json`,attachments:{list:e=>A(`/api/invoices/${e}/attachments`),add:(e,n)=>A(`/api/invoices/${e}/attachments`,{method:"POST",body:JSON.stringify(n)}),remove:(e,n)=>A(`/api/invoices/${e}/attachments/${n}`,{method:"DELETE"}),url:(e,n)=>`/api/invoices/${e}/attachments/${n}`},pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>A("/api/company-profiles"),getDefault:()=>A("/api/company-profiles/default"),create:(e,n)=>A("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>A(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:e=>A(`/api/customers${e?`?q=${encodeURIComponent(e)}`:""}`),create:(e,n)=>A("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>A(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>A(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>A("/api/customers/number-assign",{method:"POST"})},products:{list:()=>A("/api/products"),create:e=>A("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>A(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>A(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>`/api/invoices/export.xlsx?${X(e)}`,csvUrl:(e={})=>`/api/invoices/export.csv?${X(e)}`,datevUrl:(e={})=>`/api/invoices/export.datev?${X(e)}`,restorePreview:(e,n)=>A("/api/restore/preview",{method:"POST",body:JSON.stringify({filename:e,dataBase64:n})})};function Ee(e){return new Promise((n,r)=>{const t=new FileReader;t.onload=()=>{const u=t.result;if(typeof u!="string"){r(new Error("Datei nicht lesbar"));return}n(u.split(",")[1])},t.onerror=()=>r(new Error("Datei nicht lesbar")),t.readAsDataURL(e)})}function a(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function D(e){return`${Number(e).toFixed(2)} EUR`}function Z(e){return e.split("/").pop()??e}async function de(e){let n;try{n=await v.restorePreview(e.filename,e.dataBase64)}catch(t){return alert(`Backup kann nicht gelesen werden: ${t.message}`),!1}const r=n.overwritten.length;return window.confirm([`Vorschau für ${e.filename?Z(e.filename):"der hochgeladenen Datei"}:`,"",`  Im Backup:   ${n.invoices} Rechnungen (davon ${n.issued} ausgestellt)`,`  Aktuell:     ${n.currentInvoices} Rechnungen`,`  Dateien:     ${n.filesWritten}`,`  Neu dazu:    ${n.added.length} Nummern`,`  Überschrieben: ${r} Nummern ${r?`(${n.overwritten.slice(0,5).join(", ")}${n.overwritten.length>5?" …":""})`:""}`,"",n.onlyHere.length>0?`ACHTUNG: ${n.onlyHere.length} Rechnungen, die nur hier existieren, verschwinden aus der Datenbank (${n.onlyHere.slice(0,5).join(", ")}${n.onlyHere.length>5?" …":""}). Ihre Nummern werden nicht erneut vergeben.`:"Die aktuelle Datenbank wird durch das Backup ersetzt.",'Vor dem Wiederherstellen wird der aktuelle Stand automatisch als "prerestore"-Backup gesichert.',"","Trotzdem wiederherstellen?"].join(`
`))}async function Me(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],r="",t=!1;async function u(){const m=await R("/api/backups");if(!m.ok)throw new Error("Backups konnten nicht geladen werden");n=await m.json(),l()}function l(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${r?`<p class="${t?"error":""}">${a(r)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(m=>`<div class="row" style="margin-top:8px">
				<strong>${a(Z(m.filename))}</strong>
				<span class="muted">${a(m.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(m.size/1024)} KB</span>
				<button class="secondary" data-dl="${a(m.filename)}">Download</button>
				<button class="secondary" data-restore="${a(m.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const m=await R("/api/backups",{method:"POST"});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const T=await m.json();r=`Gesichert: ${Z(T.filename)}`,t=!1,await u()}catch(m){r=m.message,t=!0,l()}}),e.querySelectorAll("[data-dl]").forEach(m=>m.addEventListener("click",async()=>{const T=m.dataset.dl??"";try{await F(`/api/backups/file/${Z(T)}`,Z(T))}catch($){r=$.message,t=!0,l()}})),e.querySelectorAll("[data-restore]").forEach(m=>m.addEventListener("click",async()=>{const T=m.dataset.restore??"";if(await de({filename:T}))try{const $=await R("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:T})});if(!$.ok)throw new Error((await $.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const h=await $.json();r=`Wiederhergestellt: ${h.invoices} Rechnungen, ${h.templates} Vorlagen${h.fileErrors.length>0?` (${h.fileErrors.length} Dateifehler)`:""}`,t=!1,await u()}catch($){r=$.message,t=!0,l()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const m=e.querySelector("#b-file")?.files?.[0];if(!m){r="Bitte zuerst eine ZIP-Datei wählen",t=!0,l();return}let T;try{T=await Ee(m)}catch($){r=$.message,t=!0,l();return}if(await de({dataBase64:T}))try{const $=await R("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:T})});if(!$.ok)throw new Error((await $.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const h=await $.json();r=`Wiederhergestellt: ${h.invoices} Rechnungen, ${h.templates} Vorlagen`,t=!1,await u()}catch($){r=$.message,t=!0,l()}})}try{await u()}catch(m){e.innerHTML=`<div class="card error">${a(m.message)}</div>`}}const ue=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function O(e,n,r){const t=e[n],u=Array.isArray(t)?t.join(`
`):t??"";return`<label>${r}<input data-f="${n}" value="${a(u)}" /></label>`}async function Oe(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,r="",t=!1;try{n=await v.company.getDefault(),n||(n=(await v.company.list())[0]??null)}catch(l){e.innerHTML=`<div class="card error">${a(l.message)}</div>`;return}function u(){const l=n?.profile??ue();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${a(n?.name??"Meine Firma")}" /></label>
			${O(l,"name","Firmenname")}
			${O(l,"street","Straße")}
			<div class="grid2">${O(l,"zip","PLZ")}${O(l,"city","Ort")}</div>
			<div class="grid2">${O(l,"country","Land")}${O(l,"email","E-Mail")}</div>
			<div class="grid2">${O(l,"phone","Telefon")}${O(l,"website","Webseite")}</div>
			<div class="grid2">${O(l,"vatId","USt-IdNr.")}${O(l,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${O(l,"bankName","Bankname")}${O(l,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${a(l.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(m=>`<div class="grid2"><label>Box ${m+1}<textarea data-fbox="${m}" rows="3">${a((l.footerBoxes??[])[m]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${m}">
					${["left","center","right"].map(T=>`<option value="${T}" ${(l.footerAlign??[])[m]===T||!(l.footerAlign??[])[m]&&T==="left"?"selected":""}>${T==="left"?"Links":T==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${r?`<p class="${t?"error":""}">${a(r)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const m={...ue()};e.querySelectorAll("input[data-f]").forEach(h=>{m[h.dataset.f]=h.value});const T=[0,1,2,3].map(h=>e.querySelector(`textarea[data-fbox="${h}"]`)?.value??"");T.some(h=>h.trim()!=="")?(m.footerBoxes=T,m.footerAlign=[0,1,2,3].map(h=>{const g=e.querySelector(`select[data-falign="${h}"]`)?.value;return g==="center"||g==="right"?g:"left"})):(delete m.footerBoxes,delete m.footerAlign);const $=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await v.company.update(n.id,{name:$,profile:m}):n=await v.company.create($,m),r="Gespeichert.",t=!1,u()}catch(h){r=h.message,t=!0,u()}})}u()}const me=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),je=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function Be(e,n){const r=Number(e.replace(/\D+/g,"")),t=Number(n.replace(/\D+/g,"")),u=/\d/.test(e)&&Number.isFinite(r),l=/\d/.test(n)&&Number.isFinite(t);return u&&l&&r!==t?r-t:e.localeCompare(n,"de")}function Ue(e,n){const r=n.endsWith("desc")?-1:1,t=[...e];return t.sort((u,l)=>n.startsWith("number")?Be(u.profile.customerNumber?.trim()??"",l.profile.customerNumber?.trim()??"")*r:u.name.localeCompare(l.name,"de")*r),t}function I(e,n,r){const t=e[n],u=Array.isArray(t)?t.join(`
`):t??"";return`<label>${r}<input data-f="${n}" value="${a(u)}" /></label>`}async function He(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],r=null,t=!1,u="",l=!1,m="name-asc",T="";async function $(){n=await v.customers.list(T||void 0),g()}function h(o,y){return`
		<label>Name (Anzeige)<input id="k-name" value="${a(y)}" /></label>
		${I(o,"name","Firmenname")}
		${I(o,"street","Straße")}
		<div class="grid2">${I(o,"zip","PLZ")}${I(o,"city","Ort")}</div>
		<div class="grid2">${I(o,"country","Land")}${I(o,"email","E-Mail")}</div>
		<div class="grid2">${I(o,"phone","Telefon")}${I(o,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${a(o.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function g(){const o=n.filter(w=>!w.profile.customerNumber?.trim()).length,y=Ue(n,m);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<input id="k-q" placeholder="Suche (Name, Nummer, Ort)…" value="${a(T)}" style="max-width:240px" />
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${je.map(w=>`<option value="${w.value}" ${w.value===m?"selected":""}>${w.label}</option>`).join("")}
			</select></label>
			${o>0?`<button class="secondary" id="k-number">${o} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${y.map(w=>`<div class="row" style="margin-top:8px">
				<strong>${a(w.name)}</strong>
				${w.profile.customerNumber?.trim()?`<span class="badge">${a(w.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${a(w.profile.city||"")}</span>
				<button class="secondary" data-edit="${w.id}">Bearbeiten</button>
				<button class="danger" data-del="${w.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${y.length} Kunden</p>
		</div>
		${r||t?`<div class="card"><h3>${t?"Neuer Kunde":a(r?.name??"")}</h3>
			${h(r?.profile??me(),r?.name??"")}
			${u?`<p class="${l?"error":""}">${a(u)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",w=>{m=w.target.value,g()});let b;e.querySelector("#k-q")?.addEventListener("input",w=>{T=w.target.value,b!==void 0&&clearTimeout(b),b=setTimeout(()=>{$()},250)}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{u=`${(await v.customers.assignNumbers()).updated} Kundennummer(n) vergeben.`,l=!1,await $()}catch(w){u=w.message,l=!0,g()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{r=null,t=!0,u="",g()}),e.querySelectorAll("[data-edit]").forEach(w=>w.addEventListener("click",()=>{r=n.find(q=>q.id===w.dataset.edit)??null,t=!1,u="",g()})),e.querySelectorAll("[data-del]").forEach(w=>w.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await v.customers.remove(w.dataset.del??""),await $()}catch(q){u=q.message,l=!0,g()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{r=null,t=!1,u="",g()}),e.querySelector("#k-save")?.addEventListener("click",()=>{c()})}async function c(){const o={...me()};e.querySelectorAll("input[data-f]").forEach(b=>{o[b.dataset.f]=b.value});const y=e.querySelector("#k-name")?.value.trim()||o.name.trim()||"Kunde";try{t?await v.customers.create(y,o):r&&await v.customers.update(r.id,{name:y,profile:o}),r=null,t=!1,u="",await $()}catch(b){u=b.message,l=!0,g()}}try{await $()}catch(o){e.innerHTML=`<div class="card error">${a(o.message)}</div>`}}function ze(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function Ce(e){return`<span class="badge ${e}">${e}</span>`}async function Fe(e){e.innerHTML=`
		<div class="card">
			<div class="row"><strong>Rechnungen</strong></div>
			<div class="row filters">
				<select id="f-status">
					<option value="">alle</option>
					<option value="draft">draft</option>
					<option value="issued">issued</option>
					<option value="cancelled">cancelled</option>
				</select>
				<select id="f-sort" title="Sortierung">
					<option value="date">Datum</option>
					<option value="number">Nummer</option>
					<option value="amount">Betrag</option>
					<option value="customer">Kunde</option>
					<option value="due">Fällig</option>
				</select>
				<select id="f-sent" title="Versandstatus">
					<option value="">alle</option>
					<option value="1">versendet</option>
					<option value="0">nicht versendet</option>
				</select>
			</div>
			<div class="row actions">
				<input id="f-q" placeholder="Suche (Nr, Kunde, Position)…" />
				<button class="btn secondary" id="f-order" title="Umschalten aufsteigend/absteigend">↓ absteigend</button>
				<a class="btn" href="#/new">+ Neu</a>
				<button class="btn secondary" id="f-export" title="Excel-Liste">Excel</button>
				<button class="btn secondary" id="f-csv" title="CSV für die Buchhaltung">CSV</button>
				<button class="btn secondary" id="f-datev" title="DATEV-Buchungssätze">DATEV</button>
				<button class="btn secondary" id="f-issue-all" title="Alle sichtbaren Entwürfe ausstellen" hidden>Ausstellen (0)</button>
			</div>
		</div>
		<div id="reminders"></div>
		<div id="list-err"></div>
		<div id="list"></div>`;const n=e.querySelector("#f-status"),r=e.querySelector("#f-q"),t=e.querySelector("#f-sort"),u=e.querySelector("#f-order"),l=e.querySelector("#f-sent"),m=e.querySelector("#reminders");let T="desc",$=[];const h=e.querySelector("#list"),g=e.querySelector("#list-err");let c=0;function o(i){g.innerHTML=`<div class="card error">${a(i.message)}</div>`}async function y(i){const s=i.dataset.paid??"",d=i.checked;i.disabled=!0;try{await v.setPaid(s,d),g.innerHTML=`<div class="card muted">${d?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await b()}catch(k){i.checked=!d,o(k)}finally{i.disabled=!1}}async function b(){const i=++c,s={sort:t.value,order:T};s.docType="invoice",n.value&&(s.status=n.value),r.value.trim()&&(s.q=r.value.trim()),l.value&&(s.sent=l.value);try{const d=await v.list(s);if(i!==c)return;$=d.filter(f=>f.status==="draft").map(f=>f.id);const k=e.querySelector("#f-issue-all");k.hidden=$.length===0,k.textContent=`Ausstellen (${$.length})`,h.innerHTML=d.map(f=>`<div class="card"><div class="row">
					${f.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${f.paid?`Ausgeglichen am ${a((f.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${a(f.id)}" ${f.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${a(f.number??"(Entwurf)")}</strong>${Ce(f.status)}
					<span>${a(f.buyer.name||"—")}</span>
					<span>${D(f.totals.grossTotal)}</span>
					${f.skontoPercent>0&&!f.paid?`<span class="muted">${D(f.totals.grossTotal-ze(f))} bei ${a(f.skontoPercent)} % Skonto</span>`:""}
					${f.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					${f.status==="issued"?f.sentAt?`<span class="badge issued" title="Über ${a(f.sendChannel??"E-Mail")} versendet am ${a(f.sentAt.slice(0,10))}">versendet</span>`:`<button class="secondary" data-sent="${a(f.id)}" title="Als versendet markieren">nicht versendet</button>`:""}
					<a href="#/invoices/${a(f.id)}">Ansehen</a>
					${f.status==="draft"?`<a href="#/edit/${a(f.id)}">Bearbeiten</a>`:""}
					${f.status==="draft"?`<button class="secondary" data-del="${a(f.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',h.querySelectorAll("[data-paid]").forEach(f=>f.addEventListener("change",()=>{y(f)})),h.querySelectorAll("[data-sent]").forEach(f=>f.addEventListener("click",async()=>{try{await v.markSent(f.dataset.sent??"","E-Mail"),await b()}catch(p){o(p)}})),h.querySelectorAll("[data-del]").forEach(f=>f.addEventListener("click",async()=>{if(window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen."))try{await v.deleteDraft(f.dataset.del??""),g.innerHTML='<div class="card muted">Entwurf gelöscht.</div>',await b()}catch(p){o(p)}}))}catch(d){if(i!==c)return;h.innerHTML=`<div class="card error">${a(d.message)}</div>`}}n.onchange=()=>{b()},t.onchange=()=>{b()},l.onchange=()=>{b()},u.onclick=()=>{T=T==="desc"?"asc":"desc",u.textContent=T==="desc"?"↓ absteigend":"↑ aufsteigend",b()};let w;r.oninput=()=>{w!==void 0&&clearTimeout(w),w=setTimeout(()=>{b()},250)},e.querySelector("#f-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${$.length} Entwurf/Entwürfe ausstellen? Jede bekommt eine eigene Nummer und PDF. Danach ist keine Änderung mehr möglich.`))try{const i=await v.issueBatch($);g.innerHTML=`<div class="card ${i.failed.length?"error":"muted"}">${i.issued.length} ausgestellt${i.failed.length?`, ${i.failed.length} fehlgeschlagen: ${a(i.failed[0].error??"")}`:""}.</div>`,await b()}catch(i){o(i)}});const q=()=>{const i={};return i.docType="invoice",n.value&&(i.status=n.value),r.value.trim()&&(i.q=r.value.trim()),i};e.querySelector("#f-export")?.addEventListener("click",async()=>{try{await F(v.exportUrl(q()),"export.xlsx")}catch(i){o(i)}}),e.querySelector("#f-csv")?.addEventListener("click",async()=>{try{await F(v.csvUrl(q()),"rechnungen.csv")}catch(i){o(i)}}),e.querySelector("#f-datev")?.addEventListener("click",async()=>{try{await F(v.datevUrl(q()),"rechnungen.datev")}catch(i){o(i)}});async function N(){try{const i=await v.reminders();if(!i.length){m.innerHTML="";return}m.innerHTML=`<div class="card"><div class="row">
				<strong>Überfällig: ${i.length}</strong>
				<span class="muted">Zahlungserinnerung – der Versand bleibt eine bewusste Handlung.</span>
			</div><div class="row">${i.map(s=>`<div class="card" style="flex:1">
						<strong>${a(s.invoice.number??"")}</strong> ${a(s.invoice.buyer.name)}
						<br /><span class="muted">${s.overdueDays} Tage überfällig · Stufe ${s.level}${s.skontoActive?` · Skonto ${a(s.invoice.skontoPercent)} % noch möglich bis ${a(s.invoice.skontoDueDate??"")}`:""}</span>
						<br /><a href="#/invoices/${a(s.invoice.id)}">Ansehen</a>
					</div>`).join("")}</div></div>`}catch{}}await b(),await N()}const Ie=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Ke=["Angebot","Kostenvoranschlag"],K=30,Ve={one:"Rechnung",plural:"Rechnungen",number:"Rechnungsnr.:",date:"Rechnungsdatum:",delivery:"Lieferdatum:",due:"Fällig am:",validUntil:"Gültig bis:",perDocument:"je Rechnung",defaultTitle:"Rechnung",titles:Ie,newOne:"+ Neue Rechnung",issue:"Ausstellen",issueConfirm:"Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).",hint:"Eine ausgestellte Rechnung ist eine E-Rechnung: PDF/A-3 mit XML, eigenes Mahnwesen und Buchhaltungsexport.",offer:!1},Je={one:"Angebot",plural:"Angebote",number:"Angebotsnr.:",date:"Angebotsdatum:",delivery:"Leistungszeitraum:",due:"Zahlungsziel:",validUntil:"Gültig bis:",perDocument:"je Angebot",defaultTitle:"Angebot",titles:Ke,newOne:"+ Neues Angebot",issue:"Ausstellen",issueConfirm:"Wirklich ausstellen? Das Angebot bekommt seine Nummer aus dem Angebotsnummernkreis und die PDF wird geschrieben. Danach ist keine Änderung mehr möglich.",hint:"Ein Angebot ist keine E-Rechnung: gespeichert wird ein Sicht-PDF ohne XML, gemahnt wird nie und in den Buchhaltungsexporten taucht es nicht auf.",offer:!0};function ae(e){return(e??"").trim().toLowerCase()==="quote"?"quote":"invoice"}function j(e){return ae(e)==="quote"}function B(e){return j(e)?Je:Ve}function ie(e){return B(e).defaultTitle}function se(e,n=new Date().toISOString().slice(0,10)){return e.acceptedAt?"accepted":e.rejectedAt||e.status==="cancelled"?"rejected":e.status==="draft"?"draft":e.validUntil&&/^\d{4}-\d{2}-\d{2}$/.test(e.validUntil)&&e.validUntil<n?"expired":"open"}function Le(e){switch(e){case"draft":return"Entwurf";case"open":return"Offen";case"accepted":return"Angenommen";case"rejected":return"Abgelehnt";default:return"Verfallen"}}const Y=5*1024*1024,W=10,Ge=["pdf","png","jpg","jpeg"];function Q(e){return e>=1024*1024?`${(e/(1024*1024)).toFixed(1).replace(".",",")} MB`:`${Math.max(1,Math.round(e/1024))} kB`}function Ze(e){return e==="application/pdf"?"PDF":e==="image/png"?"PNG":e==="image/jpeg"?"JPEG":e}function _e(e){const n=e.lastIndexOf(".");return n>0?e.slice(n+1).toLowerCase():""}function We(e){const n=new Uint8Array(e);let r="";const t=32768;for(let u=0;u<n.length;u+=t)r+=String.fromCharCode(...n.subarray(u,u+t));return btoa(r)}function Ae(e,n,r){let t=[];e.innerHTML=`
		<div class="card att">
			<div class="row"><h3 style="margin:0">Anlagen</h3><span class="muted" id="att-count"></span></div>
			<p class="muted">Belege zum Vorgang (Lieferschein, Nachweis, Bestellbestätigung) — PDF, PNG oder JPEG,
				höchstens ${W} Dateien mit je ${Q(Y)}. Beim Ausstellen
				werden sie in die Rechnung eingebettet (PDF/A-3, im XML als BG-24).</p>
			${r.readOnly?'<p class="muted">Diese Rechnung ist ausgestellt: die Anlagen bleiben abrufbar, lassen sich aber nicht mehr ändern (GoBD).</p>':`<div class="row att-upload">
						<input type="file" id="att-file" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" />
						<button id="att-add">Hochladen</button>
					</div>
					<progress id="att-progress" max="100" value="0" hidden></progress>`}
			<div id="att-list" class="muted">Lade …</div>
			<p id="att-out" class="muted"></p>
		</div>`;const u=e.querySelector("#att-list"),l=e.querySelector("#att-out"),m=e.querySelector("#att-count");function T(){if(m.textContent=t.length>0?`${t.length} von ${W}`:"",t.length===0){u.className="muted",u.textContent=r.readOnly?"Keine Anlagen an dieser Rechnung.":"Noch keine Anlagen.";return}u.className="",u.innerHTML=`<table class="ovw att-table"><thead><tr>
				<th>Datei</th><th>Typ</th><th class="r">Größe</th><th class="r">Aktion</th>
			</tr></thead><tbody>${t.map(h=>`<tr>
						<td>${a(h.filename)}</td>
						<td>${a(Ze(h.mime))}</td>
						<td class="r">${a(Q(h.size))}</td>
						<td class="r">
							<button class="secondary" data-download="${h.id}">Download</button>
							${r.readOnly?"":`<button class="danger" data-delete="${h.id}">Löschen</button>`}
						</td>
					</tr>`).join("")}</tbody></table>`,u.querySelectorAll("[data-download]").forEach(h=>h.addEventListener("click",()=>{const g=Number(h.dataset.download),c=t.find(o=>o.id===g);F(v.attachments.url(n,g),c?.filename??"anlage.pdf").catch(o=>{l.className="error",l.textContent=o.message})})),u.querySelectorAll("[data-delete]").forEach(h=>h.addEventListener("click",()=>{const g=Number(h.dataset.delete),c=t.find(o=>o.id===g);window.confirm(`Anlage „${c?.filename??g}" wirklich löschen?`)&&(async()=>{try{await v.attachments.remove(n,g),t=await v.attachments.list(n),T(),l.className="muted",l.textContent="Anlage gelöscht."}catch(o){l.className="error",l.textContent=o.message}})()}))}function $(h){return h.size===0?`${h.name}: leere Datei`:h.size>Y?`${h.name}: größer als ${Q(Y)}`:Ge.includes(_e(h.name))?null:`${h.name}: nur PDF, PNG und JPEG`}e.querySelector("#att-add")?.addEventListener("click",()=>{const h=e.querySelector("#att-file"),g=e.querySelector("#att-progress"),c=[...h?.files??[]];(async()=>{if(l.className="muted",l.textContent="",c.length===0){l.className="error",l.textContent="Bitte zuerst eine Datei auswählen.";return}if(t.length+c.length>W){l.className="error",l.textContent=`Höchstens ${W} Anlagen je Rechnung (bisher ${t.length}).`;return}const o=c.map($).filter(y=>y!==null);if(o.length>0){l.className="error",l.textContent=o.join(" · ");return}g&&(g.hidden=!1,g.value=0);try{for(const[y,b]of c.entries()){const w=We(await b.arrayBuffer());await v.attachments.add(n,{filename:b.name,mime:b.type,dataBase64:w}),g&&(g.value=Math.round((y+1)/c.length*100))}t=await v.attachments.list(n),T(),h&&(h.value=""),l.className="muted",l.textContent=`${c.length} Anlage(n) gespeichert.`}catch(y){l.className="error",l.textContent=y.message}finally{g&&(g.hidden=!0)}})()}),v.attachments.list(n).then(h=>{t=h,T()}).catch(h=>{u.className="error",u.textContent=h.message})}function ee(e){return Math.round((e+Number.EPSILON)*100)/100}function Xe(e){const n=(e??"").trim(),[r,t]=n.split(".."),u=l=>/^\d{4}-\d{2}-\d{2}$/.test(l??"")?`${l.slice(8,10)}.${l.slice(5,7)}.${l.slice(0,4)}`:l??"";return t?`${u(r)} – ${u(t)}`:u(r)}async function Ye(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let t=await v.get(n);const u=B(t.docType),l=j(t.docType),m=se(t),$=(Array.isArray(t.lines)?t.lines:[]).map(i=>{const s=Math.min(Math.max(Number(i.discountPercent)||0,0),100),d=Number(i.quantity)||0,k=Number(i.unitPriceNet)||0;return{line:i,discount:s,gross:ee(d*k),net:ee(d*k*(1-s/100))}}),h=$.some(i=>i.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${a(t.number??"(Entwurf)")}</strong>
				${l?`<span class="badge ${m}">${a(Le(m))}</span>`:`<span class="badge ${t.status}">${t.status}</span>`}
				<span class="muted">${a(u.one)}</span>
				<a class="btn secondary" href="${l?"#/offers":"#/"}">← ${l?"Angebote":"Liste"}</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${a(t.seller.name)}<br />${a(t.seller.street)}<br />${a(t.seller.zip)} ${a(t.seller.city)}</div>
				<div><strong>Käufer</strong><br />${a(t.buyer.name)}<br />${a(t.buyer.street)}<br />${a(t.buyer.zip)} ${a(t.buyer.city)}${t.buyer.email?`<br />${a(t.buyer.email)}`:""}</div>
			</div>
			<p>${a(u.date.replace(/:$/,""))}: ${a(t.issueDate)} · ${a(u.delivery.replace(/:$/,""))}: ${a(Xe(t.deliveryDate))}${t.dueDate?` · Fällig: ${a(t.dueDate)}`:""}${l&&t.validUntil?` · ${a(u.validUntil.replace(/:$/,""))}: ${a(t.validUntil)}`:""}</p>
			${l&&t.acceptedAt?`<p style="color:var(--ok)">Angenommen am ${a(t.acceptedAt.slice(0,10))}.</p>`:""}
			${l&&t.rejectedAt?`<p class="error">Abgelehnt am ${a(t.rejectedAt.slice(0,10))}${t.rejectionReason?`: ${a(t.rejectionReason)}`:""}.</p>`:""}
			${l&&m==="expired"?`<p class="muted">Das Angebot ist am ${a(t.validUntil??"")} verfallen.</p>`:""}
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${h?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${$.map((i,s)=>`<tr>
					<td>${s+1}</td><td>${a(i.line.description)}${i.line.sku?` (${a(i.line.sku)})`:""}</td>
					<td class="r">${a(i.line.quantity)} ${a(i.line.unit)}</td>
					<td class="r">${D(Number(i.line.unitPriceNet))}</td>
					${h?`<td class="r">${i.discount>0?`${a(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?D(ee(i.gross-i.net)):"–"}</td>`:""}
					<td class="r">${a(i.line.vatRate)} %</td><td class="r"><strong>${D(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${D(t.totals.grossTotal)}</strong> <span class="muted">(netto ${D(t.totals.netTotal)} + USt ${D(t.totals.taxTotal)})</span></p>
			${t.notes?`<p class="muted">Notiz: ${a(t.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${t.status==="draft"?`<a class="btn" href="#/edit/${a(t.id)}">Bearbeiten</a>`:""}
				${t.status==="draft"?`<button id="d-issue">${a(u.issue)}</button><span class="muted">Danach nicht mehr änderbar.</span>`:""}
				${!l&&t.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${t.paid?"checked":""} /><span>bezahlt${t.paid&&t.paidAt?` (${a(t.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${!l&&t.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				${t.status==="issued"?t.sentAt?`<span class="badge issued" title="${a(t.sendChannel??"E-Mail")} am ${a(t.sentAt.slice(0,10))}">versendet</span>`:'<button class="secondary" id="d-sent" title="Als versendet markieren">Als versendet markieren</button>':""}
				${t.status!=="draft"&&t.pdfPath?'<button class="secondary" id="d-rerender" title="Erzeugt die PDF aus den gespeicherten Daten neu (z. B. nach einer Layout-Korrektur). Nummer, Beträge und Daten bleiben unverändert, das Original wird archiviert.">Neu rendern</button>':""}
				${l?"":'<button class="secondary" id="d-as-tpl" title="Legt eine Rechnungsvorlage mit diesen Positionen, Terminen und Zahlungsbedingungen an. Käufer und Datum werden nicht übernommen.">Vorlage erstellen</button>'}
				<button class="secondary" id="d-validate">${l?"Pflichtangaben prüfen":"Validieren"}</button>
				${l&&t.status==="issued"&&!t.acceptedAt&&!t.rejectedAt?'<button id="d-accept">Annehmen</button><button class="secondary" id="d-reject">Ablehnen</button>':""}
				${l&&t.status==="issued"?'<button class="secondary" id="d-convert" title="Erstellt einen Rechnungsentwurf mit Verweis auf dieses Angebot. Die Rechnungsnummer fällt erst beim Ausstellen.">In Rechnung umwandeln</button>':""}
			${t.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
			${t.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
			${t.status==="issued"&&t.pdfPath?'<button class="secondary" id="d-mail">E-Mail (PDF)</button>':""}
			${t.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
			${t.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div><div id="d-duty"></div><div id="d-history"></div><div id="d-reports"></div><div id="d-attachments"></div><div id="d-links"></div></div>`;const g=e.querySelector("#d-out"),c=i=>{g.innerHTML=`<p class="error">${a(i.message)}</p>`},o=e.querySelector("#d-history"),y=async()=>{if(t.status!=="draft")try{const i=await v.renders(t.id);if(!i.length){o.innerHTML="";return}o.innerHTML=`<details><summary>Neu gerendert (${i.length})</summary><ul>${i.map(s=>`<li>${a(s.createdAt.slice(0,16).replace("T"," "))} – ${a(s.artifact.toUpperCase())}${s.reason?` – ${a(s.reason)}`:""}${s.previousPath?` – Original: <code>${a(s.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await y();const b=e.querySelector("#d-reports"),w=async()=>{try{const i=await v.validationReports(t.id);if(!i.length){b.innerHTML="";return}b.innerHTML=`<details><summary>Validierungsberichte (${i.length})</summary><ul>${i.map(s=>`<li>${a(s.createdAt.slice(0,16).replace("T"," "))} – Bericht ${s.seq}: ${s.formatErrors+s.businessErrors===0?'<span style="color:var(--ok)">keine Fehler</span>':`${s.formatErrors} Format-, ${s.businessErrors} Fachfehler`} – <a href="#" data-report="${s.seq}">herunterladen</a></li>`).join("")}</ul></details>`,b.querySelectorAll("[data-report]").forEach(s=>s.addEventListener("click",async d=>{d.preventDefault();const k=Number(s.dataset.report);try{await F(v.validationReportUrl(t.id,k),`validation-${k}.json`)}catch(f){c(f)}}))}catch{}};await w(),Ae(e.querySelector("#d-attachments"),t.id,{readOnly:t.status!=="draft"});const q=e.querySelector("#d-links"),N=async()=>{const i=[];try{if(t.sourceDocumentId){const s=await v.get(t.sourceDocumentId);i.push(`<p>Zugrunde liegendes Angebot: <a href="#/invoices/${a(s.id)}">${a(s.number??"(Entwurf)")}</a>${s.validUntil?` (gültig bis ${a(s.validUntil)})`:""}${s.acceptedAt?` – angenommen am ${a(s.acceptedAt.slice(0,10))}`:""}</p>`)}if(l){const s=await v.list({docType:"invoice",sourceDocumentId:t.id});s.length>0&&i.push(`<p>Daraus hervorgegangene Rechnung(en): ${s.map(d=>`<a href="#/invoices/${a(d.id)}">${a(d.number??"(Entwurf)")}</a>`).join(", ")}</p>`)}q.innerHTML=i.length?`<div class="card">${i.join("")}</div>`:""}catch{}};await N(),e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const s=i.dataset.dl,d=s==="pdf"?v.pdfUrl(t.id):s==="xml"?v.xmlUrl(t.id):v.xlsxUrl(t.id);try{await F(d,`${t.number??"rechnung"}.${s}`)}catch(k){c(k)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await Re(v.pdfUrl(t.id))}catch(i){c(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{g.innerHTML='<p class="muted">Validiere…</p>';try{const i=await v.validate(t.id),s=i.report,d=[...i.formatErrors,...i.businessErrors],k=s?`<p class="muted">Bericht gespeichert: <code>${a(s.path.split("/").pop()??"")}</code> – <a href="#" id="d-report-last">herunterladen</a></p>`:'<p class="muted">Hinweis: der Bericht konnte nicht gespeichert werden (Adapter-Log).</p>';g.innerHTML=(d.length===0?`<p style="color:var(--ok)">${l?"Gültig: keine offenen Pflichtangaben.":"Gültig: keine Fehler."}</p>`:`<ul>${d.map(f=>`<li class="error">${a(f)}</li>`).join("")}</ul>`)+(l?'<p class="muted">Ein Angebot ist keine E-Rechnung: geprüft werden nur die Pflichtangaben — es gibt kein XML und keine XSD-Prüfung.</p>':"")+k,s&&g.querySelector("#d-report-last")?.addEventListener("click",async f=>{f.preventDefault();try{await F(v.validationReportUrl(t.id,s.seq),`validation-${s.seq}.json`)}catch(p){c(p)}}),await w()}catch(i){g.innerHTML=`<p class="error">${a(i.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async i=>{const s=i.target,d=s.checked;s.disabled=!0;try{t=await v.setPaid(t.id,d),g.innerHTML=`<p style="color:var(--ok)">${d?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(k){s.checked=!d,g.innerHTML=`<p class="error">${a(k.message)}</p>`}finally{s.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const i=(t.buyer.email??"").trim(),s=`${t.documentTitle??"Rechnung"} ${t.number??""}`.trim(),d=`Guten Tag ${t.buyer.name||""},

anbei erhalten Sie ${s} vom ${t.issueDate}.
Gesamtbetrag: ${D(t.totals.grossTotal)}.
${l&&t.validUntil?`Das Angebot ist bis ${t.validUntil} gültig.
`:""}${!l&&t.dueDate?`Bitte überweisen bis ${t.dueDate}.
`:""}
Mit freundlichen Grüßen
${t.seller.name}
`;try{await F(v.pdfUrl(t.id),`${t.number??"rechnung"}.pdf`)}catch(f){c(f);return}const k=`mailto:${i}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(d)}`;window.location.href=k,g.innerHTML=i?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${a(i)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-sent")?.addEventListener("click",async()=>{try{t=await v.markSent(t.id,"E-Mail"),g.innerHTML=`<p style="color:var(--ok)">Als versendet markiert${t.sentAt?` (${a(t.sentAt.slice(0,10))})`:""}.</p>`,e.querySelector("#d-sent")?.remove()}catch(i){c(i)}}),e.querySelector("#d-as-tpl")?.addEventListener("click",async()=>{const i=`${t.buyer.name||"Rechnung"} ${new Date().getFullYear()}`,s=window.prompt("Name der Vorlage:",i);if(!(!s||!s.trim()))try{const d=await v.asTemplate(t.id,s.trim());g.innerHTML=`<p style="color:var(--ok)">Vorlage „${a(d.name)}" angelegt –
					<a href="#/invoice-templates">jetzt bearbeiten</a>.</p>`}catch(d){c(d)}}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const i=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(i!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-<n>.pdf archiviert (nie überschrieben), das XML bleibt unverändert. Fortfahren?")){g.innerHTML='<p class="muted">Rendere neu…</p>';try{const s=await v.rerender(t.id,i.trim()||void 0);t=s.invoice,g.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${s.archivedPath?` Das Original liegt als <code>${a(s.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await y();const d=e.querySelector("#d-duty");if(t.status!=="draft"&&!t.paid)try{const{duty:k,checked:f}=await v.paymentCheck(t.id);k.required&&!f?(d.innerHTML=`<p class="error">${a(k.reason)}</p>
						<button class="secondary" id="d-duty-ok">Zahlungsweise geprüft</button>`,e.querySelector("#d-duty-ok")?.addEventListener("click",async()=>{try{await v.paymentCheck(t.id,"geprüft"),d.innerHTML='<p style="color:var(--ok)">Zahlungsweise geprüft.</p>'}catch(p){c(p)}})):f&&(d.innerHTML=`<p class="muted">Zahlungsweise geprüft${t.paymentCheckedAt?` am ${a(t.paymentCheckedAt.slice(0,10))}`:""}.</p>`)}catch{}}catch(s){g.innerHTML=`<p class="error">${a(s.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const i=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(i!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:s}=await v.storno(t.id,i.trim()||void 0);location.hash=`#/edit/${s.id}`,location.reload()}catch(s){g.innerHTML=`<p class="error">${a(s.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm(u.issueConfirm))try{const i=await v.issue(t.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){g.innerHTML=`<p class="error">${a(i.message)}</p>`}}),e.querySelector("#d-accept")?.addEventListener("click",async()=>{if(window.confirm("Angebot als angenommen vermerken? Die Entscheidung ist endgültig und steht danach auf dem Angebot."))try{await v.quoteAccept(t.id),location.reload()}catch(i){g.innerHTML=`<p class="error">${a(i.message)}</p>`}}),e.querySelector("#d-reject")?.addEventListener("click",async()=>{const i=window.prompt("Grund der Ablehnung (erscheint auf dem Angebot):","");if(i!==null&&window.confirm("Angebot als abgelehnt vermerken? Die Entscheidung ist endgültig."))try{await v.quoteReject(t.id,i.trim()||void 0),location.reload()}catch(s){g.innerHTML=`<p class="error">${a(s.message)}</p>`}}),e.querySelector("#d-convert")?.addEventListener("click",async()=>{const i=!!t.acceptedAt;if(!(!i&&!window.confirm("Das Angebot ist nicht als angenommen vermerkt. Trotzdem einen Rechnungsentwurf daraus erstellen?")))try{const s=await v.convert(t.id,i);g.innerHTML=`<p style="color:var(--ok)">Rechnungsentwurf erstellt – Nummer und PDF folgen beim Ausstellen: <a href="#/edit/${a(s.id)}">Entwurf öffnen</a></p>`,await N()}catch(s){g.innerHTML=`<p class="error">${a(s.message)}</p>`}})}catch(r){e.innerHTML=`<div class="card error">${a(r.message)}</div>`}}function pe(e){return{lines:(Array.isArray(e.lines)?e.lines:[]).filter(r=>r&&typeof r.description=="string"&&r.description.trim()!==""),paymentTerms:typeof e.paymentTerms=="string"?e.paymentTerms:"",skontoPercent:Number(e.skontoPercent)||0,notes:typeof e.notes=="string"?e.notes:""}}function he(e){return e.reduce((n,r)=>{const t=Math.min(Math.max(Number(r.discountPercent)||0,0),100),u=(Number(r.quantity)||0)*(Number(r.unitPriceNet)||0);return n+u*(1-t/100)},0)}function Qe(e,n,r){return`<div class="card line" style="background:var(--bg)">
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
				${r.map(t=>`<option ${Number(t)===Number(e.vatRate)?"selected":""}>${t}</option>`).join("")}
			</select></label>
		</div>
	</div>`}const et=[19,7,0];async function tt(e){e.innerHTML='<div class="card">Lade Rechnungsvorlagen…</div>';let n=[],r=[],t=null,u=!1,l=[],m="",T=0,$="",h="",g=!1;async function c(){n=await v.invoiceTemplates.list(),q()}async function o(){try{r=await v.products.list(),u&&q()}catch{r=[]}}function y(N){t=N,u=!0;const i=pe(N?.body??{});l=i.lines.length?i.lines.map(s=>({...s})):[b()],m=i.paymentTerms,T=i.skontoPercent,$=i.notes,h="",g=!1,q()}function b(){return{description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}}function w(){return l.map((N,i)=>{const s=(d,k)=>{const f=e.querySelector(`[data-tpl-line="${i}.${d}"]`);return f?f.value:k};return{description:String(s("description",N.description)),sku:String(s("sku","")),quantity:Number(s("quantity",N.quantity))||0,unit:String(s("unit",N.unit)),unitPriceNet:Number(s("unitPriceNet",N.unitPriceNet))||0,vatRate:Number(s("vatRate",N.vatRate))||0}})}function q(){const N=he(w());e.innerHTML=`
		<div class="card"><div class="row"><strong>Rechnungsvorlagen</strong>
			<button id="t-new">+ Neue Vorlage</button>
			${h?`<span class="${g?"error":"muted"}">${a(h)}</span>`:""}</div>
			<p class="muted">Wiederkehrende Rechnungen (Wartung, Honorar, Abo) einmal anlegen und im Assistenten
				übernehmen. Käufer und Datum werden bewusst nicht gespeichert.</p>
			${n.map(i=>{const s=pe(i.body);return`<div class="row" style="margin-top:8px">
						<strong>${a(i.name)}</strong>
						<span class="muted">${s.lines.length} Position(en) · ${D(he(s.lines))}${s.skontoPercent?` · ${s.skontoPercent} % Skonto`:""}</span>
						<button class="secondary" data-tpl-edit="${a(i.id)}">Bearbeiten</button>
						<button class="danger" data-tpl-del="${a(i.id)}">Löschen</button>
					</div>`}).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${u?`<div class="card"><h3>${t?a(t.name):"Neue Vorlage"}</h3>
					<label>Name<input id="t-name" value="${a(t?.name??"")}" placeholder="z. B. Monatliche Wartung" /></label>
					<label>Zahlungsbedingungen<input id="t-terms" value="${a(m)}" placeholder="Zahlbar innerhalb von 14 Tagen" /></label>
					<div class="grid2">
						<label>Skonto %<input id="t-skonto" type="number" min="0" max="20" step="0.5" value="${a(T)}" /></label>
						<label>&nbsp;</label>
					</div>
					<label>Notiz<textarea id="t-notes" rows="2">${a($)}</textarea></label>
					<p class="muted">Summe netto: <strong>${D(N)}</strong></p>
					${r.length>0?`<div class="row">
								<label style="flex:1">Aus dem Positionskatalog übernehmen<select id="t-catalog">
									<option value="">– Position wählen –</option>
									${r.map(i=>`<option value="${a(i.id)}">${a(i.sku?`${i.sku} · `:"")}${a(i.name)} · ${D(i.unitPriceNet)}</option>`).join("")}
								</select></label>
								<button class="secondary" id="t-take" style="align-self:end">Position hinzufügen</button>
							</div>`:'<p class="muted">Unter <a href="#/products">Positionen</a> kannst du den Katalog pflegen.</p>'}
					${l.map((i,s)=>Qe(i,s,et)).join("")}
					<button class="secondary" id="t-add-line">+ Leere Position</button>
					<p><button id="t-save">Speichern</button>
					<button class="secondary" id="t-cancel">Abbrechen</button></p>
				</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",()=>y(null)),e.querySelectorAll("[data-tpl-edit]").forEach(i=>i.addEventListener("click",()=>{const s=n.find(d=>d.id===i.dataset.tplEdit);s&&y(s)})),e.querySelectorAll("[data-tpl-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Vorlage löschen? Bereits ausgestellte Rechnungen bleiben unverändert."))try{await v.invoiceTemplates.remove(i.dataset.tplDel??""),h="Vorlage gelöscht.",g=!1,await c()}catch(s){h=s.message,g=!0,q()}})),e.querySelectorAll("[data-tpl-del-line]").forEach(i=>i.addEventListener("click",()=>{const s=Number(i.dataset.tplDelLine);l.splice(s,1),l.length===0&&l.push(b()),q()})),e.querySelector("#t-take")?.addEventListener("click",()=>{l=w();const i=e.querySelector("#t-catalog")?.value??"",s=r.find(d=>d.id===i);s&&(l.push({description:s.name,sku:s.sku||void 0,details:s.details||void 0,quantity:1,unit:s.unit,unitPriceNet:s.unitPriceNet,vatRate:s.vatRate}),q())}),e.querySelector("#t-add-line")?.addEventListener("click",()=>{l=w(),l.push(b()),q()}),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,u=!1,q()}),e.querySelector("#t-save")?.addEventListener("click",async()=>{const i=e.querySelector("#t-name")?.value.trim()??"";if(!i){h="Bitte einen Namen vergeben.",g=!0,q();return}const s=w().filter(k=>k.description.trim()!=="");if(s.length===0){h="Mindestens eine Position mit Bezeichnung nötig.",g=!0,q();return}const d={lines:s,paymentTerms:e.querySelector("#t-terms")?.value??"",skontoPercent:Number(e.querySelector("#t-skonto")?.value)||0,notes:e.querySelector("#t-notes")?.value??""};try{t?.id?await v.invoiceTemplates.update(t.id,{name:i,body:d}):await v.invoiceTemplates.create(i,d),h=`Gespeichert: ${i}`,g=!1,t=null,u=!1,await c()}catch(k){h=k.message,g=!0,q()}})}try{await c(),o()}catch(N){e.innerHTML=`<div class="card error">${a(N.message)}</div>`}}function nt(e){const n=ce();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${a(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const r=e.querySelector("#l-token")?.value.trim()??"";ne(r||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{ne(null),location.hash="#/login",location.reload()})}function at(){ne(null),location.hash="#/login"}async function it(e){const n=B("quote");e.innerHTML=`
		<div class="card">
			<div class="row"><strong>${a(n.plural)}</strong></div>
			<div class="row filters">
				<select id="o-state" title="Zustand">
					<option value="">alle</option>
					<option value="draft">Entwurf</option>
					<option value="open">Offen</option>
					<option value="accepted">Angenommen</option>
					<option value="rejected">Abgelehnt</option>
					<option value="expired">Verfallen</option>
				</select>
				<select id="o-sort" title="Sortierung">
					<option value="date">Datum</option>
					<option value="number">Nummer</option>
					<option value="amount">Betrag</option>
					<option value="customer">Kunde</option>
				</select>
			</div>
			<div class="row actions">
				<input id="o-q" placeholder="Suche (Nr, Kunde, Position)…" />
				<button class="btn secondary" id="o-order" title="Umschalten aufsteigend/absteigend">↓ absteigend</button>
				<a class="btn" href="#/new/quote">${a(n.newOne)}</a>
				<button class="btn secondary" id="o-issue-all" title="Alle sichtbaren Entwürfe ausstellen" hidden>Ausstellen (0)</button>
			</div>
			<p class="muted">${a(n.hint)}</p>
		</div>
		<div id="o-err"></div>
		<div id="o-list"></div>`;const r=e.querySelector("#o-state"),t=e.querySelector("#o-q"),u=e.querySelector("#o-sort"),l=e.querySelector("#o-order"),m=e.querySelector("#o-list"),T=e.querySelector("#o-err");let $="desc",h=[],g=[],c=0;function o(i){T.innerHTML=`<div class="card error">${a(i.message)}</div>`}function y(i){const s=se(i);return`<div class="card"><div class="row">
			<strong>${a(i.number??"(Entwurf)")}</strong>
			<span class="badge ${s}">${Le(s)}</span>
			<span>${a(i.buyer.name||"—")}</span>
			<span>${D(i.totals.grossTotal)}</span>
			${i.validUntil?`<span class="muted">gültig bis ${a(i.validUntil)}</span>`:""}
			${i.acceptedAt?`<span class="muted">angenommen am ${a(i.acceptedAt.slice(0,10))}</span>`:""}
			${i.rejectedAt?`<span class="muted">abgelehnt am ${a(i.rejectedAt.slice(0,10))}${i.rejectionReason?`: ${a(i.rejectionReason)}`:""}</span>`:""}
			<a href="#/invoices/${a(i.id)}">Ansehen</a>
			${i.status==="draft"?`<a href="#/edit/${a(i.id)}">Bearbeiten</a>`:""}
			${i.status==="draft"?`<button data-issue="${a(i.id)}">Ausstellen</button>`:""}
			${s==="open"||s==="expired"?`<button data-accept="${a(i.id)}">Annehmen</button>
						<button class="secondary" data-reject="${a(i.id)}">Ablehnen</button>`:""}
			${s!=="draft"?`<button class="secondary" data-convert="${a(i.id)}">In Rechnung umwandeln</button>`:""}
			${i.status==="draft"?`<button class="secondary" data-del="${a(i.id)}" title="Entwurf endgültig verwerfen">Löschen</button>`:""}
		</div></div>`}async function b(){const i=++c,s=r.value,d={docType:"quote",sort:u.value,order:$};s&&(d.status=s==="draft"?"draft":"issued"),t.value.trim()&&(d.q=t.value.trim());try{const k=(await v.list(d)).filter(p=>!s||se(p)===s);if(i!==c)return;h=k,g=k.filter(p=>p.status==="draft").map(p=>p.id);const f=e.querySelector("#o-issue-all");f.hidden=g.length===0,f.textContent=`Ausstellen (${g.length})`,m.innerHTML=k.map(y).join("")||'<div class="card muted">Keine Angebote gefunden.</div>',q()}catch(k){i===c&&(m.innerHTML=`<div class="card error">${a(k.message)}</div>`)}}async function w(i,s){T.innerHTML=`<div class="card muted">${a(s)}</div>`;try{await i(),await b()}catch(d){o(d)}}function q(){m.querySelectorAll("[data-issue]").forEach(i=>i.addEventListener("click",async()=>{window.confirm(n.issueConfirm)&&await w(()=>v.issue(i.dataset.issue??""),"Angebot ausgestellt.")})),m.querySelectorAll("[data-accept]").forEach(i=>i.addEventListener("click",async()=>{window.confirm("Angebot als angenommen vermerken? Die Entscheidung ist endgültig.")&&await w(()=>v.quoteAccept(i.dataset.accept??""),"Annahme vermerkt.")})),m.querySelectorAll("[data-reject]").forEach(i=>i.addEventListener("click",async()=>{const s=window.prompt("Grund der Ablehnung (erscheint auf dem Angebot):","");s!==null&&await w(()=>v.quoteReject(i.dataset.reject??"",s.trim()||void 0),"Ablehnung vermerkt.")})),m.querySelectorAll("[data-convert]").forEach(i=>i.addEventListener("click",async()=>{const s=i.dataset.convert??"",d=!!h.find(k=>k.id===s)?.acceptedAt;if(!(!d&&!window.confirm("Das Angebot ist nicht als angenommen vermerkt. Trotzdem einen Rechnungsentwurf daraus erstellen?")))try{const k=await v.convert(s,d);T.innerHTML=`<div class="card muted">Rechnungsentwurf erstellt – Nummer und PDF folgen beim Ausstellen. <a href="#/edit/${a(k.id)}">Öffnen</a></div>`,await b()}catch(k){o(k)}})),m.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{window.confirm("Entwurf endgültig verwerfen? Das lässt sich nicht rückgängig machen.")&&await w(()=>v.deleteDraft(i.dataset.del??""),"Entwurf gelöscht.")}))}r.onchange=()=>{b()},u.onchange=()=>{b()},l.onclick=()=>{$=$==="desc"?"asc":"desc",l.textContent=$==="desc"?"↓ absteigend":"↑ aufsteigend",b()};let N;t.oninput=()=>{N!==void 0&&clearTimeout(N),N=setTimeout(()=>{b()},250)},e.querySelector("#o-issue-all")?.addEventListener("click",async()=>{if(window.confirm(`${g.length} Angebots-Entwurf/Entwürfe ausstellen? Jedes bekommt eine eigene Nummer und seine PDF. Danach ist keine Änderung mehr möglich.`))try{const i=await v.issueBatch(g);T.innerHTML=`<div class="card ${i.failed.length?"error":"muted"}">${i.issued.length} ausgestellt${i.failed.length?`, ${i.failed.length} fehlgeschlagen: ${a(i.failed[0].error??"")}`:""}.</div>`,await b()}catch(i){o(i)}}),await b()}async function st(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],r=null,t=!1,u="",l=!1;async function m(){n=await v.products.list(),$()}function T(c){const o=y=>a(y??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${o(c.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${o(c.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${o(c.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${o(c.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${c.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(y=>`<option ${y===(c.vatRate??19)?"selected":""}>${y}</option>`).join("")}
		</select></label>`}function $(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${n.map(c=>`<div class="row" style="margin-top:8px">
				<strong>${a(c.sku?`${c.sku} · `:"")}${a(c.name)}</strong>
				<span class="muted">${a(c.unit)} · ${Number(c.unitPriceNet).toFixed(2)} EUR · ${c.vatRate} %</span>
				<button class="secondary" data-edit="${c.id}">Bearbeiten</button>
				<button class="danger" data-del="${c.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${r||t?`<div class="card"><h3>${t?"Neue Position":a(r?.name??"")}</h3>
			${T(r??{})}
			${u?`<p class="${l?"error":""}">${a(u)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{r=null,t=!0,u="",$()}),e.querySelectorAll("[data-edit]").forEach(c=>c.addEventListener("click",()=>{r=n.find(o=>o.id===c.dataset.edit)??null,t=!1,u="",$()})),e.querySelectorAll("[data-del]").forEach(c=>c.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await v.products.remove(c.dataset.del??""),await m()}catch(o){u=o.message,l=!0,$()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{r=null,t=!1,u="",$()}),e.querySelector("#p-save")?.addEventListener("click",()=>{g()})}function h(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function g(){const c=h();try{t?await v.products.create(c):r&&await v.products.update(r.id,c),r=null,t=!1,u="",await m()}catch(o){u=o.message,l=!0,$()}}try{await m()}catch(c){e.innerHTML=`<div class="card error">${a(c.message)}</div>`}}async function rt(e){try{const n=await v.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p><strong>E-Invoices</strong> - Version: ${a(n.version)} · Schema: ${a(String(n.schemaVersion))}</p>
			<pre class="dump">${a(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${a(n.message)}</div>`}}const lt=["title","meta","parties","positions","totals"],fe=["payment","notes"],ct=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function ot(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],r=null,t="",u=[];try{const c=await R("/api/company-profiles");c.ok&&(u=await c.json())}catch{}async function l(){n=await m(),$()}async function m(){const c=await R("/api/templates");if(!c.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await c.json()}function T(c){const o=c.definition,y=(b,w,q)=>`<label><input type="checkbox" data-f="blocks.${b}" ${o.blocks[b]?"checked":""} ${q?"disabled":""} style="width:auto" /> ${w}${q?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${a(c.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${u.map(b=>`<option value="${a(b.id)}" ${c.definition.companyId===b.id?"selected":""}>${a(b.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${a(o.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${a(o.colors.text)}" /></label>
		</div>
		<label class="pay" title="Aus: das Dokument bleibt schwarz/weiß, die Primärfarbe wird nirgends verwendet">
			<input type="checkbox" data-f="usePrimaryColor" ${o.usePrimaryColor!==!1?"checked":""} /><span>Primärfarbe verwenden</span>
		</label>
		<label class="pay" title="Ohne Haken: der Titel wird in der Textfarbe gesetzt">
			<input type="checkbox" data-f="titleAccent" ${o.titleAccent!==!1?"checked":""} /><span>Rechnungstitel in Akzentfarbe</span>
		</label>
		<label class="pay" title="Ohne Haken: nur die linke Hälfte der Kopfzeile ist eingefärbt, die rechte bleibt grau">
			<input type="checkbox" data-f="tableHeaderAccent" ${o.tableHeaderAccent===!0?"checked":""} /><span>Tabellenkopf komplett in Akzentfarbe</span>
		</label>
		${lt.map(b=>y(b,`Block ${b}`,!0)).join("")}
		${fe.map(b=>y(b,`Block ${b}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${o.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${o.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${o.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${o.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${o.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${o.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${o.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${a(o.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${a(o.closingText??"")}</textarea></label>
		<div class="grid2">
			<label title="Leer lassen: es wird kein Name gedruckt">Unterschrift (Name, optional)<input id="t-sign" value="${a(o.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${a(o.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${a(o.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${ct.map(b=>`<option value="${b.value}" ${o.logo?.position===b.value?"selected":""}>${b.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${o.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${o.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${o.logo?`<p class="muted">Aktuell: ${a(o.logo.path)}</p>`:""}`}function $(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Druckvorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			<p class="muted">Aussehen der PDF-Rechnung: Logo, Farben, Kopf- und Fußzeilen. Die inhaltlichen
				Positionen legst du unter <a href="#/invoice-templates">Rechnungsvorlagen</a> oder
				<a href="#/products">Positionen</a> fest.</p>
			${n.map(c=>`<div class="row" style="margin-top:8px">
				<strong>${a(c.name)}</strong><span class="muted">v${c.version}</span>
				${c.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${c.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${c.id}">Vorschau</button>
				${c.isDefault?"":`<button class="secondary" data-def="${c.id}">Standard</button>`}
				${c.isDefault?"":`<button class="danger" data-del="${c.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${r?`<div class="card"><h3>${a(r.id==="neu"?"Neue Vorlage":r.name)}</h3>${T(r)}
			${t?`<p class="error">${a(t)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const y=(await(await R("/api/templates")).json())[0];if(!y){t="Keine Basisvorlage vorhanden",$();return}r={...structuredClone(y),id:"neu",name:"Neu",version:1,isDefault:!1},t="",$()}catch(c){t=c.message,$()}}),e.querySelectorAll("[data-edit]").forEach(c=>c.addEventListener("click",()=>{const o=n.find(y=>y.id===c.dataset.edit);o&&(r=structuredClone(o),t="",$())})),e.querySelectorAll("[data-prev]").forEach(c=>c.addEventListener("click",async()=>{const o=n.find(y=>y.id===c.dataset.prev);if(o)try{const y=await R("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:o.definition})});if(!y.ok){const w=await y.json().catch(()=>({}));throw new Error(w.error??"Vorschau fehlgeschlagen")}const b=await y.blob();window.open(URL.createObjectURL(b),"_blank")}catch(y){t=y.message,$()}})),e.querySelectorAll("[data-def]").forEach(c=>c.addEventListener("click",async()=>{try{if(!(await R(`/api/templates/${c.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");r=null,await l()}catch(o){t=o.message,$()}})),e.querySelectorAll("[data-del]").forEach(c=>c.addEventListener("click",async()=>{const o=await R(`/api/templates/${c.dataset.del}`,{method:"DELETE"});if(!o.ok){t=(await o.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",$();return}await l()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{r=null,t="",$()}),e.querySelector("#t-save")?.addEventListener("click",()=>{g()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const c=h();if(c)try{const o=await R("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:c.definition})});if(!o.ok){const y=await o.json().catch(()=>({}));throw new Error(y.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await o.blob()),"_blank")}catch(o){t=o.message,$()}})}function h(){if(!r)return null;const c=structuredClone(r.definition);c.name=(e.querySelector("#t-name")?.value??c.name).trim(),c.colors.primary=e.querySelector("#t-c1")?.value??c.colors.primary,c.colors.text=e.querySelector("#t-c2")?.value??c.colors.text;for(const y of fe)c.blocks[y]=e.querySelector(`[data-f="blocks.${y}"]`)?.checked??c.blocks[y];for(const y of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])c[y]=e.querySelector(`[data-f="${y}"]`)?.checked??!1;for(const y of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const b=e.querySelector(`[data-f="${y}"]`);b&&(c[y]=b.checked)}c.footerText=e.querySelector("#t-footer")?.value??"";const o=e.querySelector("#t-company")?.value??"";return o?c.companyId=o:delete c.companyId,c.introText=e.querySelector("#t-intro")?.value??"",c.closingText=e.querySelector("#t-closing")?.value??"",c.signatureName=e.querySelector("#t-sign")?.value??"",c.headerExtra=e.querySelector("#t-hextra")?.value??"",c.logo&&(c.logo.position=e.querySelector("#t-lpos")?.value??"right",c.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),c.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:c.name,definition:c}}async function g(){const c=h();if(!c)return;const o=c.definition;try{let y=r.id;if(y==="neu"){const w=await R("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:o.name,definition:o})});if(!w.ok)throw new Error((await w.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");y=(await w.json()).id}else{const w=await R(`/api/templates/${y}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:o.name,definition:o})});if(!w.ok)throw new Error((await w.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const b=e.querySelector("#t-logo")?.files?.[0];if(b){const w=await Ee(b),q=await R(`/api/templates/${y}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:b.name,mime:b.type,dataBase64:w})});if(!q.ok)throw new Error((await q.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}r=null,t="",await l()}catch(y){t=y.message,$()}}try{await l()}catch(c){e.innerHTML=`<div class="card error">${a(c.message)}</div>`}}let V={defaultVatRate:19,defaultPaymentTerms:""};const ve=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),_=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:V.defaultVatRate}),oe=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],ge="__own__";function C(e,n){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const r=new Date(`${e}T00:00:00Z`);return r.setUTCDate(r.getUTCDate()+n),r.toISOString().slice(0,10)}function re(e){return!!e&&!Ne(e)}function Ne(e){return!!e&&oe.some(n=>n.text===e)}function Pe(e){return oe.find(n=>n.text===e)?.days??null}function be(e){if(!e.dueAuto)return;const n=Pe(e.paymentTerms);n!==null&&(e.dueDate=C(e.issueDate,n))}function ye(e,n){j(e.docType)&&(!e.validUntil||e.validUntil===C(n,K))&&(e.validUntil=C(e.issueDate,K))}function z(e){return Math.round((e+Number.EPSILON)*100)/100}function $e(e){const n=Number(e.quantity)||0,r=Number(e.unitPriceNet)||0,t=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return z(n*r*(1-t/100))}function dt(e){return(e??"").trim().split("..")[0]??""}function ut(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const J="einv-wizard-v1",qe="einv-employee";function De(){try{return localStorage.getItem(qe)??""}catch{return""}}function we(){return new Date().toISOString().slice(0,10)}function le(){return{step:0,docType:"invoice",seller:ve(),buyer:ve(),lines:[_()],issueDate:we(),deliveryDate:we(),dueDate:"",validUntil:"",employee:De(),documentTitle:ie("invoice"),notes:"",paymentTerms:V.defaultPaymentTerms,termsCustom:re(V.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function ke(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function mt(){try{const e=localStorage.getItem(J);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{...le(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function Se(e,n,r){return`
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
			${r?`<label>Webseite<input data-p="${e}" data-f="website" value="${a(n.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${a(n.contactName)}" /></label>`}
		</div>
		${r?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${a(n.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${a(n.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${a(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${a(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const pt={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function Te(e,n,r="invoice"){let t=le();!n&&r==="quote"&&(t.docType="quote",t.documentTitle=ie("quote"),t.validUntil=C(t.issueDate,K));const u=!!n;let l=[],m=[],T=[],$=[],h=!1,g=!1;if(v.settings().then(d=>{V={defaultVatRate:Number(d.defaultVatRate)||19,defaultPaymentTerms:d.defaultPaymentTerms??""}}).catch(()=>{}),n){e.innerHTML='<div class="card">Lade Entwurf…</div>',v.get(n).then(d=>{if(d.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${a(d.status)}).</div>`;return}t={...le(),docType:ae(d.docType),seller:d.seller,buyer:d.buyer,lines:d.lines.length>0?d.lines:[_()],issueDate:d.issueDate,deliveryDate:d.deliveryDate,dueDate:d.dueDate??"",validUntil:d.validUntil??"",employee:d.employeeCode??De(),documentTitle:d.documentTitle,notes:d.notes??"",paymentTerms:d.paymentTerms??V.defaultPaymentTerms,termsCustom:re(d.paymentTerms),skontoPercent:d.skontoPercent??0,skontoDueDate:d.skontoDueDate??"",draftId:d.id},y(),N()}).catch(d=>{e.innerHTML=`<div class="card error">${a(d.message)}</div>`});return}const c=mt(),o=c&&ke(c)&&(r!=="quote"||j(c.docType))?c:null;if(o&&!o.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter ${a(B(o.docType).one)}-Entwurf vom ${a(o.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=o,y(),N()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(J),y(),N()});return}o&&(t=o),y(),ke(t)||v.company.getDefault().then(d=>{d&&!t.seller.name.trim()&&d.profile.name.trim()&&(t.seller={...t.seller,...d.profile},t.selectedCompany=d.id,N(!0))}).catch(()=>{});function y(){if(g)return;g=!0;const d=(k,f)=>{f(),e.querySelector(k)||N(!0)};v.company.list().then(k=>d("#w-company",()=>l=k)).catch(()=>{}),v.customers.list().then(k=>d("#w-customer",()=>m=k)).catch(()=>{}),v.products.list().then(k=>d("#w-catalog",()=>T=k)).catch(()=>{}),v.invoiceTemplates.list().then(k=>d("#w-inv-tpl",()=>$=k)).catch(()=>{})}function b(){try{if(u)return;if(!t.dirty){localStorage.removeItem(J);return}localStorage.setItem(J,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function w(){e.querySelectorAll("input[data-p]").forEach(E=>{const L=E.dataset.p==="seller"?t.seller:t.buyer;L[E.dataset.f]=E.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(E=>{const[L,x]=E.dataset.l.split("."),M=t.lines[Number(L)];if(M)if(x==="quantity"||x==="unitPriceNet"||x==="vatRate"||x==="discountPercent"){const H=Number(E.value),G=Number.isFinite(H)?H:0;M[x]=x==="discountPercent"?Math.min(Math.max(G,0),100):G}else M[x]=E.value});const d=E=>e.querySelector(`#${E}`)?.value??"",k=()=>{const E=d("w-delivery");if(!E)return;const L=d("w-delivery-to");t.deliveryDate=L&&L!==E?`${E}..${L}`:E},f=t.issueDate;t.issueDate=d("w-issue")||t.issueDate,k(),e.querySelector("#w-due")&&(t.dueDate=d("w-due")),be(t),e.querySelector("#w-valid")&&(t.validUntil=d("w-valid")||t.validUntil),ye(t,f),e.querySelector("#w-employee")&&(t.employee=d("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=d("w-title")||t.documentTitle);const p=e.querySelector("#w-notes");p&&(t.notes=p.value);const S=e.querySelector("#w-terms");if(S&&(t.paymentTerms=S.value),e.querySelector("#w-skonto")){const E=Number(d("w-skonto"));t.skontoPercent=Number.isFinite(E)?Math.min(Math.max(E,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=d("w-skonto-due")),b()}function q(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((k,f)=>`<span class="${f===t.step?"on":""}">${f+1}. ${k}</span>`).join("")}</div>`}function N(d=!1){d||w();let k="";if(t.step===0&&(k=`<div class="card"><h3>Verkäufer</h3>
				${u?`<p class="muted">Belegart: <strong>${a(B(t.docType).one)}</strong> — bleibt beim Bearbeiten erhalten, der Nummernkreis hängt an ihr.</p>`:`<label>Belegart<select id="w-doctype">
							<option value="invoice" ${t.docType==="invoice"?"selected":""}>Rechnung — E-Rechnung mit XML, Mahnwesen, Export</option>
							<option value="quote" ${t.docType==="quote"?"selected":""}>Angebot — Sicht-PDF ohne XML, eigene Nummer</option>
						</select></label>`}
				${l.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${l.map(p=>`<option value="${a(p.id)}" ${t.selectedCompany===p.id?"selected":""}>${a(p.name)}${p.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Se("seller",t.seller,!0)}</div>`),t.step===1&&(k=`<div class="card"><h3>Käufer</h3>
				${m.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${m.map(p=>`<option value="${a(p.id)}" ${t.selectedCustomer===p.id?"selected":""}>${a(p.name)}${p.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Se("buyer",t.buyer,!1)}</div>`),t.step===2&&(k=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${B(t.docType).titles.map(p=>`<option ${p===t.documentTitle?"selected":""}>${p}</option>`).join("")}
				</select></label>
				${$.length>0?`<label>Wiederkehrende Rechnung<select id="w-inv-tpl">
							<option value="">– eigene Positionen –</option>
							${$.map(p=>`<option value="${a(p.id)}">${a(p.name)}</option>`).join("")}
						</select></label>
						<p class="muted">Übernimmt Positionen, Termine, Zahlungsbedingungen und Skonto. Käufer und Datum bleiben deine Angaben.</p>`:'<p class="muted">Tipp: Unter <a href="#/invoice-templates">Rechnungsvorlagen</a> eine Vorlage anlegen, um wiederkehrende Rechnungen nicht jedes Mal neu einzutippen.</p>'}
				${T.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${T.map(p=>`<option value="${a(p.id)}">${a(p.sku?`${p.sku} · `:"")}${a(p.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((p,S)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${S+1}</span><strong>Position ${S+1}</strong>
						<span class="line-sum">${D($e(p))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${S}.description" value="${a(p.description)}" /></label>
						<label>Art.Nr.<input data-l="${S}.sku" value="${a(p.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${S}.details" rows="1">${a(p.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${S}.quantity" type="number" min="0" step="any" value="${a(p.quantity)}" /></label>
						<label>Einheit<input data-l="${S}.unit" value="${a(p.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${S}.unitPriceNet" type="number" min="0" step="0.01" value="${a(p.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${S}.discountPercent" type="number" min="0" max="100" step="0.1" value="${a(p.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${S}.vatRate">
							${[19,7,0].map(E=>`<option ${E===Number(p.vatRate)?"selected":""}>${E}</option>`).join("")}
						</select></label>
						${Number(p.vatRate)===0?`<label>Steuerbefreiung<select data-l="${S}.exemptionCategory">
								${["E","AE","K","G","O"].map(E=>`<option ${(p.exemptionCategory??"E")===E?"selected":""} value="${E}">${E} — ${pt[E]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${S}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${a(p.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${S}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${a(t.issueDate)}" /></label>
					${j(t.docType)?`<label>${a(B(t.docType).validUntil.replace(/:$/,""))}<input id="w-valid" type="date" value="${a(t.validUntil)}" />${t.validUntil===C(t.issueDate,K)?' <span class="muted">(30 Tage)</span>':""}</label>`:`<label>Fällig am<input id="w-due" type="date" value="${a(t.dueDate)}" />${t.dueAuto?' <span class="muted">(aus Zahlungsbedingung)</span>':""}</label>`}
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${a(dt(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${a(ut(t.deliveryDate))}" /></label>
					</div>
					<p class="muted">Nur „von" angeben, wenn die Leistung an einem Tag erbracht wurde. ${j(t.docType)?'Mit „bis" steht der Zeitraum als Leistungszeitraum auf dem Angebot.':'Mit „bis" wird der Zeitraum als BT-74/BT-75 in die Rechnung geschrieben.'}</p>
				</fieldset>
				<label>Mitarbeiter-Kürzel (für Nr. ${j(t.docType)?"A-JJJJ-KK-LLL":"JJJJ-KK-LLL"})<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${a(t.employee)}" /></label>
				${j(t.docType)?`<p class="muted">Ein Angebot kennt kein Zahlungsziel, keinen Skonto und keine Zahlungsbedingungen —
							es gilt bis zum Datum „Gültig bis".</p>`:`<fieldset class="period">
					<legend>Skonto (Rabatt bei früher Zahlung)</legend>
					<div class="grid2">
						<label>Skonto %<input id="w-skonto" type="number" min="0" max="100" step="0.01" value="${a(t.skontoPercent)}" /></label>
						<label>Skonto bis<input id="w-skonto-due" type="date" value="${a(t.skontoDueDate)}" /></label>
					</div>
					<p class="muted">Bei 0 % kein Skonto. Ohne eigenes Datum gilt das Fälligkeitsdatum. Der Skonto mindert den Zahlbetrag (BT-9) und steht als Bedingung mit Subject-Code AAK im XML.</p>
				</fieldset>
				<label>Zahlungsbedingungen<select id="w-terms-select">
					<option value="" ${t.paymentTerms===""?"selected":""}>keine</option>
					${oe.map(p=>`<option value="${a(p.text)}" ${!t.termsCustom&&t.paymentTerms===p.text?"selected":""}>${a(p.text)}</option>`).join("")}
					<option value="${ge}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${a(t.paymentTerms)}</textarea></label>`:""}`}
				<label>Notizen<textarea id="w-notes">${a(t.notes)}</textarea></label>
			</div>`),t.step===3){const p=t.lines.map(P=>{const U=Math.min(Math.max(Number(P.discountPercent)||0,0),100);return{...P,discount:U,gross:z((Number(P.quantity)||0)*(Number(P.unitPriceNet)||0)),net:$e(P)}}).filter(P=>P.description.trim()!==""||P.gross>0),S=new Map;for(const P of p)S.set(Number(P.vatRate)||0,z((S.get(Number(P.vatRate)||0)??0)+P.net));const E=[...S.entries()].sort(([P],[U])=>P-U).map(([P,U])=>({rate:P,net:U,tax:z(U*P/100)})),L=z(E.reduce((P,U)=>P+U.net,0)),x=z(E.reduce((P,U)=>P+U.tax,0)),M=z(L+x),H=z(M*(Number(t.skontoPercent)||0)/100),G=p.some(P=>P.discount>0);k=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${a(t.documentTitle)}</strong> · ${a(t.seller.name||"—")} → ${a(t.buyer.name||"—")} · ${p.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${G?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${p.map(P=>`<tr>
							<td>${a(P.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${a(P.quantity)} ${a(P.unit)}</td>
							<td class="r">${D(P.unitPriceNet)}</td>
							${G?`<td class="r">${P.discount>0?`${a(P.discount)} %`:"–"}</td><td class="r">${P.discount>0?D(z(P.gross-P.net)):"–"}</td>`:""}
							<td class="r">${a(P.vatRate)} %</td><td class="r"><strong>${D(P.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${D(L)}</td></tr>
						${E.map(P=>`<tr class="sub"><td class="lbl">USt ${a(P.rate)} % auf ${D(P.net)}</td><td class="r">${D(P.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${D(M)}</td></tr>
						${!j(t.docType)&&t.skontoPercent>0?`<tr class="sub"><td class="lbl">${a(t.skontoPercent)} % Skonto bis ${a(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${D(H)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${D(M-H)}</td></tr>`:""}
					</tbody>
				</table>
				${j(t.docType)?`<p class="muted">${a(B(t.docType).validUntil)} ${a(t.validUntil||C(t.issueDate,K))} — ein Angebot ist keine E-Rechnung: es gibt kein XML und keine XSD-Prüfung.</p>
					<p class="muted">Ausstellen vergibt endgültig die Angebotsnummer aus dem eigenen Nummernkreis — die Rechnungsnummern bleiben davon unberührt.</p>`:`<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
					<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>`}
			</div>`}e.innerHTML=`${q()}${k}
			${t.error?`<div class="card error">${a(t.error)}</div>`:""}
			${t.step===3?'<div id="w-attachments"></div>':""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':`<button id="w-save">Entwurf speichern</button><button id="w-issue">${a(B(t.docType).issue)}</button>`}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`;const f=e.querySelector("#w-attachments");f&&(t.draftId?Ae(f,t.draftId,{readOnly:!1}):f.innerHTML=`<div class="card"><h3 style="margin:0">Anlagen</h3>
					<p class="muted">Belege wie Lieferschein oder Nachweis lassen sich nach dem Speichern des
					Entwurfs anhängen: erst „Entwurf speichern“, dann hier hochladen. Beim Ausstellen wandern die
					Anlagen in PDF und XML.</p></div>`),e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,N()}),e.querySelector("#w-terms-select")?.addEventListener("change",p=>{const S=p.target.value;if(S===ge)t.termsCustom=!0,Ne(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=S;const E=Pe(S);E!==null?(t.dueAuto=!0,t.dueDate=C(t.issueDate,E)):t.dueAuto=!1}N()}),e.querySelector("#w-due")?.addEventListener("change",()=>{w(),t.dueAuto=!1,N()}),e.querySelector("#w-doctype")?.addEventListener("change",p=>{const S=ae(p.target.value);S!==t.docType&&(w(),t.docType=S,t.dirty=!0,j(S)?(t.dueDate="",t.dueAuto=!1,t.skontoPercent=0,t.skontoDueDate="",t.paymentTerms="",t.termsCustom=!1,t.validUntil=C(t.issueDate,K)):(t.validUntil="",t.paymentTerms=V.defaultPaymentTerms,t.termsCustom=re(V.defaultPaymentTerms),t.dueAuto=!1),B(S).titles.includes(t.documentTitle)||(t.documentTitle=ie(S)),N())}),e.querySelector("#w-company")?.addEventListener("change",()=>{const p=e.querySelector("#w-company")?.value??"",S=l.find(E=>E.id===p);S?(t.seller={...t.seller,...S.profile},t.selectedCompany=S.id,N(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const p=e.querySelector("#w-customer")?.value??"",S=m.find(E=>E.id===p);S?(t.buyer={...t.buyer,...S.profile},t.selectedCustomer=S.id,N(!0)):t.selectedCustomer=null}),e.querySelector("#w-inv-tpl")?.addEventListener("change",p=>{const S=p.target.value,E=$.find(x=>x.id===S);if(!E||t.lines.length>0&&!window.confirm(`Positionen durch "${E.name}" ersetzen?`))return;const L=E.body;Array.isArray(L.lines)&&L.lines.length>0&&(t.lines=L.lines.map(x=>({..._(),...x}))),typeof L.paymentTerms=="string"&&(t.paymentTerms=L.paymentTerms),typeof L.notes=="string"&&(t.notes=L.notes),typeof L.documentTitle=="string"&&L.documentTitle&&(t.documentTitle=L.documentTitle),typeof L.skontoPercent=="number"&&L.skontoPercent>0&&(t.skontoPercent=L.skontoPercent),typeof L.dueDate=="string"&&(t.dueDate=L.dueDate),typeof L.deliveryDate=="string"&&(t.deliveryDate=L.deliveryDate),N(!0)}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,N()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(J),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{w(),t.dirty=!0,t.lines.push(_()),N()}),e.querySelector("#w-take")?.addEventListener("click",()=>{w();const p=e.querySelector("#w-catalog")?.value??"",S=T.find(E=>E.id===p);if(S){const E={description:S.name,sku:S.sku||void 0,details:S.details||void 0,quantity:1,unit:S.unit,unitPriceNet:S.unitPriceNet,vatRate:S.vatRate},L=t.lines.findIndex(x=>!x.description.trim()&&!(x.sku??"").trim()&&!(x.details??"").trim()&&x.unitPriceNet===0);L>=0?t.lines[L]=E:t.lines.push(E),t.dirty=!0}N(!0)}),e.querySelectorAll("[data-del]").forEach(p=>p.addEventListener("click",()=>{w(),t.dirty=!0,t.lines.splice(Number(p.dataset.del),1),t.lines.length===0&&t.lines.push(_()),N(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{i(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm(B(t.docType).issueConfirm)&&i(!0)})}async function i(d){if(!h){h=!0;try{w(),t.error="";const k={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",docType:t.docType,employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0,validUntil:j(t.docType)?t.validUntil||C(t.issueDate,K):void 0};try{if(t.employee.trim())try{localStorage.setItem(qe,t.employee.trim())}catch{}let f;t.draftId?f=await v.update(t.draftId,k):(f=await v.create(k),t.draftId=f.id),d&&(f=await v.issue(f.id));try{localStorage.removeItem(J)}catch{}location.hash=`#/invoices/${f.id}`}catch(f){t.error=f.message,N()}}finally{h=!1}}}e.addEventListener("input",()=>{try{s()}catch{}});function s(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(L=>{const x=L.dataset.p==="seller"?t.seller:t.buyer;x[L.dataset.f]=L.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(L=>{const[x,M]=L.dataset.l.split("."),H=t.lines[Number(x)];H&&(M==="quantity"||M==="unitPriceNet"||M==="vatRate"||M==="discountPercent"?H[M]=Number(L.value):H[M]=L.value)});const d=L=>e.querySelector(`#${L}`)?.value??"",k=t.issueDate,f=d("w-issue"),p=d("w-delivery"),S=d("w-delivery-to");f&&(t.issueDate=f),p&&(t.deliveryDate=S&&S!==p?`${p}..${S}`:p),e.querySelector("#w-due")&&(t.dueDate=d("w-due")),be(t),e.querySelector("#w-valid")&&(t.validUntil=d("w-valid")||t.validUntil),ye(t,k),e.querySelector("#w-employee")&&(t.employee=d("w-employee"));const E=d("w-title");if(E&&(t.documentTitle=E),e.querySelector("#w-skonto")){const L=Number(d("w-skonto"));t.skontoPercent=Number.isFinite(L)?Math.min(Math.max(L,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=d("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,b()}N()}const ht=document.querySelector("#app");function ft(e){const n=!!ce(),r=[["#/","Rechnungen"],["#/offers","Angebote"],["#/templates","Druckvorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/invoice-templates","Rechnungsvorlagen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];ht.innerHTML=`<header class="top"><nav>
		${r.map(([t,u])=>`<a href="${t}" class="${e===t||t==="#/"&&e.startsWith("#/invoices")?"active":""}">${u}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function xe(){const e=location.hash||"#/";ft(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await Fe(n):e==="#/offers"?await it(n):e==="#/new"||e==="#/new/quote"?Te(n,void 0,e==="#/new/quote"?"quote":"invoice"):e.startsWith("#/edit/")?Te(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await Ye(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await ot(n):e==="#/company"?await Oe(n):e==="#/customers"?await He(n):e==="#/products"?await st(n):e==="#/invoice-templates"?await tt(n):e==="#/backup"?await Me(n):e==="#/login"?nt(n):e==="#/logout"?at():e==="#/status"?await rt(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{xe()});xe();
