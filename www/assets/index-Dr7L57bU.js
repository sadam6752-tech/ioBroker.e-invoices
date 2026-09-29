(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))i(d);new MutationObserver(d=>{for(const c of d)if(c.type==="childList")for(const m of c.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&i(m)}).observe(document,{childList:!0,subtree:!0});function t(d){const c={};return d.integrity&&(c.integrity=d.integrity),d.referrerPolicy&&(c.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?c.credentials="include":d.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function i(d){if(d.ep)return;d.ep=!0;const c=t(d);fetch(d.href,c)}})();const C="einv-token";function J(){try{return localStorage.getItem(C)}catch{return null}}function K(e){try{e?localStorage.setItem(C,e):localStorage.removeItem(C)}catch{}}async function k(e,a){const t=await P(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const i=await t.json().catch(()=>({}));throw new Error(i.error??`HTTP ${t.status}`)}return await t.json()}async function P(e,a){const t={...a?.headers??{}},i=J();i&&(t.authorization=`Bearer ${i}`);const d=await fetch(e,{...a,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function H(e,a){const t=await P(e);if(!t.ok){const m=await t.json().catch(()=>({}));throw new Error(m.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const i=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),c=document.createElement("a");c.href=URL.createObjectURL(i),c.download=d?.[1]??a,document.body.appendChild(c),c.click(),c.remove(),window.setTimeout(()=>URL.revokeObjectURL(c.href),1e4)}async function le(e){const a=await P(e);if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),i=URL.createObjectURL(t);window.open(i,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(i),6e4)}const w={health:()=>k("/api/health"),settings:()=>k("/api/settings"),list:(e={})=>{const a=new URLSearchParams(e).toString();return k(`/api/invoices${a?`?${a}`:""}`)},get:e=>k(`/api/invoices/${e}`),create:e=>k("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>k(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>k(`/api/invoices/${e}/issue`,{method:"POST"}),setPaid:(e,a,t)=>k(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:a,paidAt:t})}),storno:(e,a)=>k(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:a})}),validate:e=>k(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>k("/api/company-profiles"),getDefault:()=>k("/api/company-profiles/default"),create:(e,a)=>k("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>k("/api/customers"),create:(e,a)=>k("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>k(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>k("/api/customers/number-assign",{method:"POST"})},products:{list:()=>k("/api/products"),create:e=>k("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>k(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>k(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function s(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function L(e){return`${Number(e).toFixed(2)} EUR`}function B(e){return e.split("/").pop()??e}async function oe(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",i=!1;async function d(){const m=await P("/api/backups");if(!m.ok)throw new Error("Backups konnten nicht geladen werden");a=await m.json(),c()}function c(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${i?"error":""}">${s(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(m=>`<div class="row" style="margin-top:8px">
				<strong>${s(B(m.filename))}</strong>
				<span class="muted">${s(m.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(m.size/1024)} KB</span>
				<button class="secondary" data-dl="${s(m.filename)}">Download</button>
				<button class="secondary" data-restore="${s(m.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const m=await P("/api/backups",{method:"POST"});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const v=await m.json();t=`Gesichert: ${B(v.filename)}`,i=!1,await d()}catch(m){t=m.message,i=!0,c()}}),e.querySelectorAll("[data-dl]").forEach(m=>m.addEventListener("click",async()=>{const v=m.dataset.dl??"";try{await H(`/api/backups/file/${B(v)}`,B(v))}catch(f){t=f.message,i=!0,c()}})),e.querySelectorAll("[data-restore]").forEach(m=>m.addEventListener("click",async()=>{const v=m.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${B(v)}? Die aktuelle Datenbank wird ersetzt.`))try{const f=await P("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:v})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const o=await f.json();t=`Wiederhergestellt: ${o.invoices} Rechnungen, ${o.templates} Vorlagen${o.fileErrors.length>0?` (${o.fileErrors.length} Dateifehler)`:""}`,i=!1,await d()}catch(f){t=f.message,i=!0,c()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const m=e.querySelector("#b-file")?.files?.[0];if(!m){t="Bitte zuerst eine ZIP-Datei wählen",i=!0,c();return}if(window.confirm(`Wirklich wiederherstellen aus ${m.name}? Die aktuelle Datenbank wird ersetzt.`))try{const v=await new Promise(($,n)=>{const l=new FileReader;l.onload=()=>$(String(l.result).split(",")[1]),l.onerror=()=>n(new Error("Datei nicht lesbar")),l.readAsDataURL(m)}),f=await P("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:v})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const o=await f.json();t=`Wiederhergestellt: ${o.invoices} Rechnungen, ${o.templates} Vorlagen`,i=!1,await d()}catch(v){t=v.message,i=!0,c()}})}try{await d()}catch(m){e.innerHTML=`<div class="card error">${s(m.message)}</div>`}}const Z=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,a,t){const i=e[a],d=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${a}" value="${s(d)}" /></label>`}async function ce(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",i=!1;try{a=await w.company.getDefault(),a||(a=(await w.company.list())[0]??null)}catch(c){e.innerHTML=`<div class="card error">${s(c.message)}</div>`;return}function d(){const c=a?.profile??Z();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${s(a?.name??"Meine Firma")}" /></label>
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
			${[0,1,2,3].map(m=>`<div class="grid2"><label>Box ${m+1}<textarea data-fbox="${m}" rows="3">${s((c.footerBoxes??[])[m]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${m}">
					${["left","center","right"].map(v=>`<option value="${v}" ${(c.footerAlign??[])[m]===v||!(c.footerAlign??[])[m]&&v==="left"?"selected":""}>${v==="left"?"Links":v==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${i?"error":""}">${s(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const m={...Z()};e.querySelectorAll("input[data-f]").forEach(o=>{m[o.dataset.f]=o.value});const v=[0,1,2,3].map(o=>e.querySelector(`textarea[data-fbox="${o}"]`)?.value??"");v.some(o=>o.trim()!=="")?(m.footerBoxes=v,m.footerAlign=[0,1,2,3].map(o=>{const $=e.querySelector(`select[data-falign="${o}"]`)?.value;return $==="center"||$==="right"?$:"left"})):(delete m.footerBoxes,delete m.footerAlign);const f=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await w.company.update(a.id,{name:f,profile:m}):a=await w.company.create(f,m),t="Gespeichert.",i=!1,d()}catch(o){t=o.message,i=!0,d()}})}d()}const W=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),de=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function ue(e,a){const t=Number(e.replace(/\D+/g,"")),i=Number(a.replace(/\D+/g,"")),d=/\d/.test(e)&&Number.isFinite(t),c=/\d/.test(a)&&Number.isFinite(i);return d&&c&&t!==i?t-i:e.localeCompare(a,"de")}function me(e,a){const t=a.endsWith("desc")?-1:1,i=[...e];return i.sort((d,c)=>a.startsWith("number")?ue(d.profile.customerNumber?.trim()??"",c.profile.customerNumber?.trim()??"")*t:d.name.localeCompare(c.name,"de")*t),i}function R(e,a,t){const i=e[a],d=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${a}" value="${s(d)}" /></label>`}async function pe(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,i=!1,d="",c=!1,m="name-asc";async function v(){a=await w.customers.list(),o()}function f(n,l){return`
		<label>Name (Anzeige)<input id="k-name" value="${s(l)}" /></label>
		${R(n,"name","Firmenname")}
		${R(n,"street","Straße")}
		<div class="grid2">${R(n,"zip","PLZ")}${R(n,"city","Ort")}</div>
		<div class="grid2">${R(n,"country","Land")}${R(n,"email","E-Mail")}</div>
		<div class="grid2">${R(n,"phone","Telefon")}${R(n,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${s(n.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function o(){const n=a.filter(r=>!r.profile.customerNumber?.trim()).length,l=me(a,m);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${de.map(r=>`<option value="${r.value}" ${r.value===m?"selected":""}>${r.label}</option>`).join("")}
			</select></label>
			${n>0?`<button class="secondary" id="k-number">${n} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${l.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${s(r.name)}</strong>
				${r.profile.customerNumber?.trim()?`<span class="badge">${s(r.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${s(r.profile.city||"")}</span>
				<button class="secondary" data-edit="${r.id}">Bearbeiten</button>
				<button class="danger" data-del="${r.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${l.length} Kunden</p>
		</div>
		${t||i?`<div class="card"><h3>${i?"Neuer Kunde":s(t?.name??"")}</h3>
			${f(t?.profile??W(),t?.name??"")}
			${d?`<p class="${c?"error":""}">${s(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",r=>{m=r.target.value,o()}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{d=`${await w.customers.assignNumbers()} Kundennummer(n) vergeben.`,c=!1,await v()}catch(r){d=r.message,c=!0,o()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,i=!0,d="",o()}),e.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{t=a.find(p=>p.id===r.dataset.edit)??null,i=!1,d="",o()})),e.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await w.customers.remove(r.dataset.del??""),await v()}catch(p){d=p.message,c=!0,o()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,i=!1,d="",o()}),e.querySelector("#k-save")?.addEventListener("click",()=>{$()})}async function $(){const n={...W()};e.querySelectorAll("input[data-f]").forEach(r=>{n[r.dataset.f]=r.value});const l=e.querySelector("#k-name")?.value.trim()||n.name.trim()||"Kunde";try{i?await w.customers.create(l,n):t&&await w.customers.update(t.id,{name:l,profile:n}),t=null,i=!1,d="",await v()}catch(r){d=r.message,c=!0,o()}}try{await v()}catch(n){e.innerHTML=`<div class="card error">${s(n.message)}</div>`}}function he(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function fe(e){return`<span class="badge ${e}">${e}</span>`}async function be(e){e.innerHTML=`
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
			<button class="btn secondary" id="f-export">Excel</button>
		</div></div>
		<div id="list"></div>
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),i=e.querySelector("#list"),d=e.querySelector("#list-err");let c=0;function m(n){d.innerHTML=`<div class="card error">${s(n.message)}</div>`}async function v(n){const l=n.dataset.paid??"",r=n.checked;n.disabled=!0;try{await w.setPaid(l,r),d.innerHTML=`<div class="card muted">${r?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await o()}catch(p){n.checked=!r,m(p)}finally{n.disabled=!1}}async function f(n){const l=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(l!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:r}=await w.storno(n,l.trim()||void 0);location.hash=`#/edit/${r.id}`,location.reload()}catch(r){m(r)}}async function o(){const n=++c,l={};a.value&&(l.status=a.value),t.value.trim()&&(l.q=t.value.trim());try{const r=await w.list(l);if(n!==c)return;i.innerHTML=r.map(p=>`<div class="card"><div class="row">
					${p.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${p.paid?`Ausgeglichen am ${s((p.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${s(p.id)}" ${p.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${s(p.number??"(Entwurf)")}</strong>${fe(p.status)}
					<span>${s(p.buyer.name||"—")}</span>
					<span>${L(p.totals.grossTotal)}</span>
					${p.skontoPercent>0&&!p.paid?`<span class="muted">${L(p.totals.grossTotal-he(p))} bei ${s(p.skontoPercent)} % Skonto</span>`:""}
					${p.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					<a href="#/invoices/${s(p.id)}">Ansehen</a>
					${p.status==="draft"?`<a href="#/edit/${s(p.id)}">Bearbeiten</a>`:""}
					${p.status==="issued"?`<button class="secondary" data-storno="${s(p.id)}">Storno</button>`:""}
					${p.pdfPath?`<button class="secondary" data-dl="pdf:${s(p.id)}:${s(p.number??"rechnung")}">PDF ↓</button>`:""}
					${p.xml?`<button class="secondary" data-dl="xml:${s(p.id)}:${s(p.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',i.querySelectorAll("[data-paid]").forEach(p=>p.addEventListener("change",()=>{v(p)})),i.querySelectorAll("[data-storno]").forEach(p=>p.addEventListener("click",()=>{f(p.dataset.storno??"")})),i.querySelectorAll("[data-dl]").forEach(p=>p.addEventListener("click",async()=>{const[N,h,E]=(p.dataset.dl??"").split(":"),u=N==="pdf"?w.pdfUrl(h):w.xmlUrl(h);try{await H(u,`${E}.${N}`)}catch(b){m(b)}}))}catch(r){if(n!==c)return;i.innerHTML=`<div class="card error">${s(r.message)}</div>`}}a.onchange=()=>{o()};let $;t.oninput=()=>{$!==void 0&&clearTimeout($),$=setTimeout(()=>{o()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const n={};a.value&&(n.status=a.value),t.value.trim()&&(n.q=t.value.trim());try{await H(w.exportUrl(n),"export.xlsx")}catch(l){m(l)}}),await o()}function F(e){return Math.round((e+Number.EPSILON)*100)/100}function ve(e){const a=(e??"").trim(),[t,i]=a.split(".."),d=c=>/^\d{4}-\d{2}-\d{2}$/.test(c??"")?`${c.slice(8,10)}.${c.slice(5,7)}.${c.slice(0,4)}`:c??"";return i?`${d(t)} – ${d(i)}`:d(t)}async function ye(e,a){e.innerHTML='<div class="card">Lade…</div>';try{let i=await w.get(a);const c=(Array.isArray(i.lines)?i.lines:[]).map(o=>{const $=Math.min(Math.max(Number(o.discountPercent)||0,0),100),n=Number(o.quantity)||0,l=Number(o.unitPriceNet)||0;return{line:o,discount:$,gross:F(n*l),net:F(n*l*(1-$/100))}}),m=c.some(o=>o.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${s(i.number??"(Entwurf)")}</strong>
				<span class="badge ${i.status}">${i.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${s(i.seller.name)}<br />${s(i.seller.street)}<br />${s(i.seller.zip)} ${s(i.seller.city)}</div>
				<div><strong>Käufer</strong><br />${s(i.buyer.name)}<br />${s(i.buyer.street)}<br />${s(i.buyer.zip)} ${s(i.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${s(i.issueDate)} · Leistung: ${s(ve(i.deliveryDate))}${i.dueDate?` · Fällig: ${s(i.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${m?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${c.map((o,$)=>`<tr>
					<td>${$+1}</td><td>${s(o.line.description)}${o.line.sku?` (${s(o.line.sku)})`:""}</td>
					<td class="r">${s(o.line.quantity)} ${s(o.line.unit)}</td>
					<td class="r">${L(Number(o.line.unitPriceNet))}</td>
					${m?`<td class="r">${o.discount>0?`${s(o.discount)} %`:"–"}</td><td class="r">${o.discount>0?L(F(o.gross-o.net)):"–"}</td>`:""}
					<td class="r">${s(o.line.vatRate)} %</td><td class="r"><strong>${L(o.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${L(i.totals.grossTotal)}</strong> <span class="muted">(netto ${L(i.totals.netTotal)} + USt ${L(i.totals.taxTotal)})</span></p>
			${i.notes?`<p class="muted">Notiz: ${s(i.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${i.status==="draft"?`<a class="btn" href="#/edit/${s(i.id)}">Bearbeiten</a>`:""}
				${i.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${i.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${i.paid?"checked":""} /><span>bezahlt${i.paid&&i.paidAt?` (${s(i.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${i.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${i.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
				${i.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
				${i.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
				${i.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div></div>`;const v=e.querySelector("#d-out"),f=o=>{v.innerHTML=`<p class="error">${s(o.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(o=>o.addEventListener("click",async()=>{const $=o.dataset.dl,n=$==="pdf"?w.pdfUrl(i.id):$==="xml"?w.xmlUrl(i.id):w.xlsxUrl(i.id);try{await H(n,`${i.number??"rechnung"}.${$}`)}catch(l){f(l)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await le(w.pdfUrl(i.id))}catch(o){f(o)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{v.innerHTML='<p class="muted">Validiere…</p>';try{const o=await w.validate(i.id);v.innerHTML=o.formatErrors.length+o.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...o.formatErrors,...o.businessErrors].map($=>`<li class="error">${s($)}</li>`).join("")}</ul>`}catch(o){v.innerHTML=`<p class="error">${s(o.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async o=>{const $=o.target,n=$.checked;$.disabled=!0;try{i=await w.setPaid(i.id,n),v.innerHTML=`<p style="color:var(--ok)">${n?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(l){$.checked=!n,v.innerHTML=`<p class="error">${s(l.message)}</p>`}finally{$.disabled=!1}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const o=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(o!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:$}=await w.storno(i.id,o.trim()||void 0);location.hash=`#/edit/${$.id}`,location.reload()}catch($){v.innerHTML=`<p class="error">${s($.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const o=await w.issue(i.id);location.hash=`#/invoices/${o.id}`,location.reload()}catch(o){v.innerHTML=`<p class="error">${s(o.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${s(t.message)}</div>`}}function ge(e){const a=J();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${s(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";K(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{K(null),location.hash="#/login",location.reload()})}function $e(){K(null),location.hash="#/login"}async function we(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,i=!1,d="",c=!1;async function m(){a=await w.products.list(),f()}function v(n){const l=r=>s(r??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${l(n.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${l(n.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${l(n.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${l(n.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${n.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(r=>`<option ${r===(n.vatRate??19)?"selected":""}>${r}</option>`).join("")}
		</select></label>`}function f(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${a.map(n=>`<div class="row" style="margin-top:8px">
				<strong>${s(n.sku?`${n.sku} · `:"")}${s(n.name)}</strong>
				<span class="muted">${s(n.unit)} · ${Number(n.unitPriceNet).toFixed(2)} EUR · ${n.vatRate} %</span>
				<button class="secondary" data-edit="${n.id}">Bearbeiten</button>
				<button class="danger" data-del="${n.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||i?`<div class="card"><h3>${i?"Neue Position":s(t?.name??"")}</h3>
			${v(t??{})}
			${d?`<p class="${c?"error":""}">${s(d)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,i=!0,d="",f()}),e.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{t=a.find(l=>l.id===n.dataset.edit)??null,i=!1,d="",f()})),e.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await w.products.remove(n.dataset.del??""),await m()}catch(l){d=l.message,c=!0,f()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,i=!1,d="",f()}),e.querySelector("#p-save")?.addEventListener("click",()=>{$()})}function o(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function $(){const n=o();try{i?await w.products.create(n):t&&await w.products.update(t.id,n),t=null,i=!1,d="",await m()}catch(l){d=l.message,c=!0,f()}}try{await m()}catch(n){e.innerHTML=`<div class="card error">${s(n.message)}</div>`}}async function Se(e){try{const a=await w.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(a.version)} · Schema: ${s(String(a.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(a.message)}</div>`}}const ke=["title","meta","parties","positions","totals"],_=["payment","notes"];async function Ee(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,i="",d=[];try{const n=await P("/api/company-profiles");n.ok&&(d=await n.json())}catch{}async function c(){a=await m(),f()}async function m(){const n=await P("/api/templates");if(!n.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await n.json()}function v(n){const l=n.definition,r=(p,N,h)=>`<label><input type="checkbox" data-f="blocks.${p}" ${l.blocks[p]?"checked":""} ${h?"disabled":""} style="width:auto" /> ${N}${h?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(n.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${d.map(p=>`<option value="${s(p.id)}" ${n.definition.companyId===p.id?"selected":""}>${s(p.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${s(l.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${s(l.colors.text)}" /></label>
		</div>
		${ke.map(p=>r(p,`Block ${p}`,!0)).join("")}
		${_.map(p=>r(p,`Block ${p}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${l.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${l.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${l.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${l.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${l.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${l.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${l.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${s(l.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${s(l.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${s(l.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${s(l.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${s(l.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(p=>`<option ${l.logo?.position===p?"selected":""}>${p}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${l.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${l.logo?`<p class="muted">Aktuell: ${s(l.logo.path)}</p>`:""}`}function f(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${a.map(n=>`<div class="row" style="margin-top:8px">
				<strong>${s(n.name)}</strong><span class="muted">v${n.version}</span>
				${n.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${n.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${n.id}">Vorschau</button>
				${n.isDefault?"":`<button class="secondary" data-def="${n.id}">Standard</button>`}
				${n.isDefault?"":`<button class="danger" data-del="${n.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${s(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${v(t)}
			${i?`<p class="error">${s(i)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const r=(await(await P("/api/templates")).json())[0];if(!r){i="Keine Basisvorlage vorhanden",f();return}t={...structuredClone(r),id:"neu",name:"Neu",version:1,isDefault:!1},i="",f()}catch(n){i=n.message,f()}}),e.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{const l=a.find(r=>r.id===n.dataset.edit);l&&(t=structuredClone(l),i="",f())})),e.querySelectorAll("[data-prev]").forEach(n=>n.addEventListener("click",async()=>{const l=a.find(r=>r.id===n.dataset.prev);if(l)try{const r=await P("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:l.definition})});if(!r.ok){const N=await r.json().catch(()=>({}));throw new Error(N.error??"Vorschau fehlgeschlagen")}const p=await r.blob();window.open(URL.createObjectURL(p),"_blank")}catch(r){i=r.message,f()}})),e.querySelectorAll("[data-def]").forEach(n=>n.addEventListener("click",async()=>{try{if(!(await P(`/api/templates/${n.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await c()}catch(l){i=l.message,f()}})),e.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{const l=await P(`/api/templates/${n.dataset.del}`,{method:"DELETE"});if(!l.ok){i=(await l.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",f();return}await c()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,i="",f()}),e.querySelector("#t-save")?.addEventListener("click",()=>{$()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const n=o();if(n)try{const l=await P("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:n.definition})});if(!l.ok){const r=await l.json().catch(()=>({}));throw new Error(r.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await l.blob()),"_blank")}catch(l){i=l.message,f()}})}function o(){if(!t)return null;const n=structuredClone(t.definition);n.name=(e.querySelector("#t-name")?.value??n.name).trim(),n.colors.primary=e.querySelector("#t-c1")?.value??n.colors.primary,n.colors.text=e.querySelector("#t-c2")?.value??n.colors.text;for(const r of _)n.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??n.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])n[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;n.footerText=e.querySelector("#t-footer")?.value??"";const l=e.querySelector("#t-company")?.value??"";return l?n.companyId=l:delete n.companyId,n.introText=e.querySelector("#t-intro")?.value??"",n.closingText=e.querySelector("#t-closing")?.value??"",n.signatureName=e.querySelector("#t-sign")?.value??"",n.headerExtra=e.querySelector("#t-hextra")?.value??"",n.logo&&(n.logo.position=e.querySelector("#t-lpos")?.value??"right",n.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:n.name,definition:n}}async function $(){const n=o();if(!n)return;const l=n.definition;try{let r=t.id;if(r==="neu"){const N=await P("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await N.json()).id}else{const N=await P(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const p=e.querySelector("#t-logo")?.files?.[0];if(p){const N=await new Promise((E,u)=>{const b=new FileReader;b.onload=()=>E(String(b.result).split(",")[1]),b.onerror=()=>u(new Error("Datei nicht lesbar")),b.readAsDataURL(p)}),h=await P(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p.name,mime:p.type,dataBase64:N})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,i="",await c()}catch(r){i=r.message,f()}}try{await c()}catch(n){e.innerHTML=`<div class="card error">${s(n.message)}</div>`}}const X=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),U=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:z.defaultVatRate});let z={defaultVatRate:19,defaultPaymentTerms:""};const V=["Der Rechnungsbetrag ist sofort ohne Abzug fällig.","Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.","Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug."],Y="__own__";function ne(e){return!!e&&!V.includes(e)}function M(e){return Math.round((e+Number.EPSILON)*100)/100}function Q(e){const a=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,i=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(a*t*(1-i/100))}function Te(e){return(e??"").trim().split("..")[0]??""}function Le(e){const a=(e??"").trim().split("..");return a.length>1?a[1]:""}const j="einv-wizard-v1",se="einv-employee";function ie(){try{return localStorage.getItem(se)??""}catch{return""}}function ee(){return new Date().toISOString().slice(0,10)}function G(){return{step:0,seller:X(),buyer:X(),lines:[U()],issueDate:ee(),deliveryDate:ee(),dueDate:"",employee:ie(),documentTitle:"Rechnung",notes:"",paymentTerms:z.defaultPaymentTerms,termsCustom:ne(z.defaultPaymentTerms),skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function I(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function Ne(){try{const e=localStorage.getItem(j);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...G(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function te(e,a,t){return`
		<label>Name<input data-p="${e}" data-f="name" value="${s(a.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${s(a.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${s(a.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${s(a.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${s(a.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${s(a.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${e}" data-f="phone" value="${s(a.phone)}" /></label>
			${t?`<label>Webseite<input data-p="${e}" data-f="website" value="${s(a.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${s(a.contactName)}" /></label>`}
		</div>
		${t?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${s(a.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${s(a.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(a.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${s(a.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Pe=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],qe={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function ae(e,a){let t=G();const i=!!a;let d=[],c=[],m=[],v=!1;if(w.settings().then(h=>{z={defaultVatRate:Number(h.defaultVatRate)||19,defaultPaymentTerms:h.defaultPaymentTerms??""}}).catch(()=>{}),a){e.innerHTML='<div class="card">Lade Entwurf…</div>',w.get(a).then(h=>{if(h.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${s(h.status)}).</div>`;return}t={...G(),seller:h.seller,buyer:h.buyer,lines:h.lines.length>0?h.lines:[U()],issueDate:h.issueDate,deliveryDate:h.deliveryDate,dueDate:h.dueDate??"",employee:h.employeeCode??ie(),documentTitle:h.documentTitle,notes:h.notes??"",paymentTerms:h.paymentTerms??z.defaultPaymentTerms,termsCustom:ne(h.paymentTerms),skontoPercent:h.skontoPercent??0,skontoDueDate:h.skontoDueDate??"",draftId:h.id},o(),r()}).catch(h=>{e.innerHTML=`<div class="card error">${s(h.message)}</div>`});return}const f=Ne();if(f&&I(f)&&!f.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${s(f.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=f,o(),r()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(j),o(),r()});return}f&&I(f)&&(t=f),o(),I(t)||w.company.getDefault().then(h=>{h&&!t.seller.name.trim()&&h.profile.name.trim()&&(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,r(!0))}).catch(()=>{});function o(){w.company.list().then(h=>{d=h,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),w.customers.list().then(h=>{c=h,t.step===1&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),w.products.list().then(h=>{m=h,t.step===2&&!e.querySelector("#w-catalog")&&r()}).catch(()=>{})}function $(){try{if(i)return;if(!t.dirty){localStorage.removeItem(j);return}localStorage.setItem(j,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function n(){e.querySelectorAll("input[data-p]").forEach(y=>{const S=y.dataset.p==="seller"?t.seller:t.buyer;S[y.dataset.f]=y.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(y=>{const[S,T]=y.dataset.l.split("."),q=t.lines[Number(S)];if(q)if(T==="quantity"||T==="unitPriceNet"||T==="vatRate"||T==="discountPercent"){const A=Number(y.value),O=Number.isFinite(A)?A:0;q[T]=T==="discountPercent"?Math.min(Math.max(O,0),100):O}else q[T]=y.value});const h=y=>e.querySelector(`#${y}`)?.value??"",E=()=>{const y=h("w-delivery");if(!y)return;const S=h("w-delivery-to");t.deliveryDate=S&&S!==y?`${y}..${S}`:y};t.issueDate=h("w-issue")||t.issueDate,E(),e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=h("w-title")||t.documentTitle);const u=e.querySelector("#w-notes");u&&(t.notes=u.value);const b=e.querySelector("#w-terms");if(b&&(t.paymentTerms=b.value),e.querySelector("#w-terms-select")?.addEventListener("change",y=>{const S=y.target.value;S===Y?(t.termsCustom=!0,V.includes(t.paymentTerms)&&(t.paymentTerms="")):(t.termsCustom=!1,t.paymentTerms=S),r()}),e.querySelector("#w-skonto")){const y=Number(h("w-skonto"));t.skontoPercent=Number.isFinite(y)?Math.min(Math.max(y,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=h("w-skonto-due")),$()}function l(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((E,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${E}</span>`).join("")}</div>`}function r(h=!1){h||n();let E="";if(t.step===0&&(E=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(u=>`<option value="${s(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${s(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${te("seller",t.seller,!0)}</div>`),t.step===1&&(E=`<div class="card"><h3>Käufer</h3>
				${c.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${c.map(u=>`<option value="${s(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${s(u.name)}${u.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${te("buyer",t.buyer,!1)}</div>`),t.step===2&&(E=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Pe.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${m.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${m.map(u=>`<option value="${s(u.id)}">${s(u.sku?`${u.sku} · `:"")}${s(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,b)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${b+1}</span><strong>Position ${b+1}</strong>
						<span class="line-sum">${L(Q(u))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${b}.description" value="${s(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${b}.sku" value="${s(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${b}.details" rows="1">${s(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${b}.quantity" type="number" min="0" step="any" value="${s(u.quantity)}" /></label>
						<label>Einheit<input data-l="${b}.unit" value="${s(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${b}.unitPriceNet" type="number" min="0" step="0.01" value="${s(u.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${b}.discountPercent" type="number" min="0" max="100" step="0.1" value="${s(u.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${b}.vatRate">
							${[19,7,0].map(y=>`<option ${y===Number(u.vatRate)?"selected":""}>${y}</option>`).join("")}
						</select></label>
						${Number(u.vatRate)===0?`<label>Steuerbefreiung<select data-l="${b}.exemptionCategory">
								${["E","AE","K","G","O"].map(y=>`<option ${(u.exemptionCategory??"E")===y?"selected":""} value="${y}">${y} — ${qe[y]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${b}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${s(u.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${b}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${s(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${s(t.dueDate)}" /></label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${s(Te(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${s(Le(t.deliveryDate))}" /></label>
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
					${V.map(u=>`<option value="${s(u)}" ${!t.termsCustom&&t.paymentTerms===u?"selected":""}>${s(u)}</option>`).join("")}
					<option value="${Y}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${s(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const u=t.lines.map(g=>{const D=Math.min(Math.max(Number(g.discountPercent)||0,0),100);return{...g,discount:D,gross:M((Number(g.quantity)||0)*(Number(g.unitPriceNet)||0)),net:Q(g)}}).filter(g=>g.description.trim()!==""||g.gross>0),b=new Map;for(const g of u)b.set(Number(g.vatRate)||0,M((b.get(Number(g.vatRate)||0)??0)+g.net));const y=[...b.entries()].sort(([g],[D])=>g-D).map(([g,D])=>({rate:g,net:D,tax:M(D*g/100)})),S=M(y.reduce((g,D)=>g+D.net,0)),T=M(y.reduce((g,D)=>g+D.tax,0)),q=M(S+T),A=M(q*(Number(t.skontoPercent)||0)/100),O=u.some(g=>g.discount>0);E=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${s(t.documentTitle)}</strong> · ${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${O?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(g=>`<tr>
							<td>${s(g.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${s(g.quantity)} ${s(g.unit)}</td>
							<td class="r">${L(g.unitPriceNet)}</td>
							${O?`<td class="r">${g.discount>0?`${s(g.discount)} %`:"–"}</td><td class="r">${g.discount>0?L(M(g.gross-g.net)):"–"}</td>`:""}
							<td class="r">${s(g.vatRate)} %</td><td class="r"><strong>${L(g.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${L(S)}</td></tr>
						${y.map(g=>`<tr class="sub"><td class="lbl">USt ${s(g.rate)} % auf ${L(g.net)}</td><td class="r">${L(g.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${L(q)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${s(t.skontoPercent)} % Skonto bis ${s(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${L(A)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${L(q-A)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${l()}${E}
			${t.error?`<div class="card error">${s(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,r()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",b=d.find(y=>y.id===u);b?(t.seller={...t.seller,...b.profile},t.selectedCompany=b.id,r(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",b=c.find(y=>y.id===u);b?(t.buyer={...t.buyer,...b.profile},t.selectedCustomer=b.id,r(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,r()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(j),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{n(),t.dirty=!0,t.lines.push(U()),r()}),e.querySelector("#w-take")?.addEventListener("click",()=>{n();const u=e.querySelector("#w-catalog")?.value??"",b=m.find(y=>y.id===u);if(b){const y={description:b.name,sku:b.sku||void 0,details:b.details||void 0,quantity:1,unit:b.unit,unitPriceNet:b.unitPriceNet,vatRate:b.vatRate},S=t.lines.findIndex(T=>!T.description.trim()&&!(T.sku??"").trim()&&!(T.details??"").trim()&&T.unitPriceNet===0);S>=0?t.lines[S]=y:t.lines.push(y),t.dirty=!0}r(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{n(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(U()),r(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{p(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&p(!0)})}async function p(h){if(!v){v=!0;try{n(),t.error="";const E={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(se,t.employee.trim())}catch{}let u;t.draftId?u=await w.update(t.draftId,E):(u=await w.create(E),t.draftId=u.id),h&&(u=await w.issue(u.id));try{localStorage.removeItem(j)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,r()}}finally{v=!1}}}e.addEventListener("input",()=>{try{N()}catch{}});function N(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(S=>{const T=S.dataset.p==="seller"?t.seller:t.buyer;T[S.dataset.f]=S.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(S=>{const[T,q]=S.dataset.l.split("."),A=t.lines[Number(T)];A&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"||q==="discountPercent"?A[q]=Number(S.value):A[q]=S.value)});const h=S=>e.querySelector(`#${S}`)?.value??"",E=h("w-issue"),u=h("w-delivery"),b=h("w-delivery-to");E&&(t.issueDate=E),u&&(t.deliveryDate=b&&b!==u?`${u}..${b}`:u),e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee"));const y=h("w-title");if(y&&(t.documentTitle=y),e.querySelector("#w-skonto")){const S=Number(h("w-skonto"));t.skontoPercent=Number.isFinite(S)?Math.min(Math.max(S,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=h("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,$()}r()}const xe=document.querySelector("#app");function De(e){const a=!!J(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];xe.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([i,d])=>`<a href="${i}" class="${e===i||i==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function re(){const e=location.hash||"#/";De(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await be(a):e==="#/new"?ae(a):e.startsWith("#/edit/")?ae(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ye(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await Ee(a):e==="#/company"?await ce(a):e==="#/customers"?await pe(a):e==="#/products"?await we(a):e==="#/backup"?await oe(a):e==="#/login"?ge(a):e==="#/logout"?$e():e==="#/status"?await Se(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{re()});re();
