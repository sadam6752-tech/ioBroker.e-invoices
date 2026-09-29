(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))i(d);new MutationObserver(d=>{for(const c of d)if(c.type==="childList")for(const u of c.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&i(u)}).observe(document,{childList:!0,subtree:!0});function t(d){const c={};return d.integrity&&(c.integrity=d.integrity),d.referrerPolicy&&(c.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?c.credentials="include":d.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function i(d){if(d.ep)return;d.ep=!0;const c=t(d);fetch(d.href,c)}})();const F="einv-token";function C(){try{return localStorage.getItem(F)}catch{return null}}function I(e){try{e?localStorage.setItem(F,e):localStorage.removeItem(F)}catch{}}async function S(e,a){const t=await T(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const i=await t.json().catch(()=>({}));throw new Error(i.error??`HTTP ${t.status}`)}return await t.json()}async function T(e,a){const t={...a?.headers??{}},i=C();i&&(t.authorization=`Bearer ${i}`);const d=await fetch(e,{...a,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function z(e,a){const t=await T(e);if(!t.ok){const u=await t.json().catch(()=>({}));throw new Error(u.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const i=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),c=document.createElement("a");c.href=URL.createObjectURL(i),c.download=d?.[1]??a,document.body.appendChild(c),c.click(),c.remove(),window.setTimeout(()=>URL.revokeObjectURL(c.href),1e4)}async function ne(e){const a=await T(e);if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),i=URL.createObjectURL(t);window.open(i,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(i),6e4)}const $={health:()=>S("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return S(`/api/invoices${a?`?${a}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),setPaid:(e,a,t)=>S(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:a,paidAt:t})}),storno:(e,a)=>S(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:a})}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,a)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>S("/api/customers"),create:(e,a)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>S("/api/customers/number-assign",{method:"POST"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function s(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function L(e){return`${Number(e).toFixed(2)} EUR`}function O(e){return e.split("/").pop()??e}async function se(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",i=!1;async function d(){const u=await T("/api/backups");if(!u.ok)throw new Error("Backups konnten nicht geladen werden");a=await u.json(),c()}function c(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${i?"error":""}">${s(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(u=>`<div class="row" style="margin-top:8px">
				<strong>${s(O(u.filename))}</strong>
				<span class="muted">${s(u.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(u.size/1024)} KB</span>
				<button class="secondary" data-dl="${s(u.filename)}">Download</button>
				<button class="secondary" data-restore="${s(u.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const u=await T("/api/backups",{method:"POST"});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const v=await u.json();t=`Gesichert: ${O(v.filename)}`,i=!1,await d()}catch(u){t=u.message,i=!0,c()}}),e.querySelectorAll("[data-dl]").forEach(u=>u.addEventListener("click",async()=>{const v=u.dataset.dl??"";try{await z(`/api/backups/file/${O(v)}`,O(v))}catch(b){t=b.message,i=!0,c()}})),e.querySelectorAll("[data-restore]").forEach(u=>u.addEventListener("click",async()=>{const v=u.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${O(v)}? Die aktuelle Datenbank wird ersetzt.`))try{const b=await T("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:v})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const o=await b.json();t=`Wiederhergestellt: ${o.invoices} Rechnungen, ${o.templates} Vorlagen${o.fileErrors.length>0?` (${o.fileErrors.length} Dateifehler)`:""}`,i=!1,await d()}catch(b){t=b.message,i=!0,c()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const u=e.querySelector("#b-file")?.files?.[0];if(!u){t="Bitte zuerst eine ZIP-Datei wählen",i=!0,c();return}if(window.confirm(`Wirklich wiederherstellen aus ${u.name}? Die aktuelle Datenbank wird ersetzt.`))try{const v=await new Promise((g,n)=>{const l=new FileReader;l.onload=()=>g(String(l.result).split(",")[1]),l.onerror=()=>n(new Error("Datei nicht lesbar")),l.readAsDataURL(u)}),b=await T("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:v})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const o=await b.json();t=`Wiederhergestellt: ${o.invoices} Rechnungen, ${o.templates} Vorlagen`,i=!1,await d()}catch(v){t=v.message,i=!0,c()}})}try{await d()}catch(u){e.innerHTML=`<div class="card error">${s(u.message)}</div>`}}const J=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,a,t){const i=e[a],d=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${a}" value="${s(d)}" /></label>`}async function ie(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",i=!1;try{a=await $.company.getDefault(),a||(a=(await $.company.list())[0]??null)}catch(c){e.innerHTML=`<div class="card error">${s(c.message)}</div>`;return}function d(){const c=a?.profile??J();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
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
			${[0,1,2,3].map(u=>`<div class="grid2"><label>Box ${u+1}<textarea data-fbox="${u}" rows="3">${s((c.footerBoxes??[])[u]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${u}">
					${["left","center","right"].map(v=>`<option value="${v}" ${(c.footerAlign??[])[u]===v||!(c.footerAlign??[])[u]&&v==="left"?"selected":""}>${v==="left"?"Links":v==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${i?"error":""}">${s(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const u={...J()};e.querySelectorAll("input[data-f]").forEach(o=>{u[o.dataset.f]=o.value});const v=[0,1,2,3].map(o=>e.querySelector(`textarea[data-fbox="${o}"]`)?.value??"");v.some(o=>o.trim()!=="")?(u.footerBoxes=v,u.footerAlign=[0,1,2,3].map(o=>{const g=e.querySelector(`select[data-falign="${o}"]`)?.value;return g==="center"||g==="right"?g:"left"})):(delete u.footerBoxes,delete u.footerAlign);const b=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await $.company.update(a.id,{name:b,profile:u}):a=await $.company.create(b,u),t="Gespeichert.",i=!1,d()}catch(o){t=o.message,i=!0,d()}})}d()}const V=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),re=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function le(e,a){const t=Number(e.replace(/\D+/g,"")),i=Number(a.replace(/\D+/g,"")),d=/\d/.test(e)&&Number.isFinite(t),c=/\d/.test(a)&&Number.isFinite(i);return d&&c&&t!==i?t-i:e.localeCompare(a,"de")}function oe(e,a){const t=a.endsWith("desc")?-1:1,i=[...e];return i.sort((d,c)=>a.startsWith("number")?le(d.profile.customerNumber?.trim()??"",c.profile.customerNumber?.trim()??"")*t:d.name.localeCompare(c.name,"de")*t),i}function R(e,a,t){const i=e[a],d=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${a}" value="${s(d)}" /></label>`}async function ce(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,i=!1,d="",c=!1,u="name-asc";async function v(){a=await $.customers.list(),o()}function b(n,l){return`
		<label>Name (Anzeige)<input id="k-name" value="${s(l)}" /></label>
		${R(n,"name","Firmenname")}
		${R(n,"street","Straße")}
		<div class="grid2">${R(n,"zip","PLZ")}${R(n,"city","Ort")}</div>
		<div class="grid2">${R(n,"country","Land")}${R(n,"email","E-Mail")}</div>
		<div class="grid2">${R(n,"phone","Telefon")}${R(n,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${s(n.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function o(){const n=a.filter(r=>!r.profile.customerNumber?.trim()).length,l=oe(a,u);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${re.map(r=>`<option value="${r.value}" ${r.value===u?"selected":""}>${r.label}</option>`).join("")}
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
			${b(t?.profile??V(),t?.name??"")}
			${d?`<p class="${c?"error":""}">${s(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",r=>{u=r.target.value,o()}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{d=`${await $.customers.assignNumbers()} Kundennummer(n) vergeben.`,c=!1,await v()}catch(r){d=r.message,c=!0,o()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,i=!0,d="",o()}),e.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{t=a.find(p=>p.id===r.dataset.edit)??null,i=!1,d="",o()})),e.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(r.dataset.del??""),await v()}catch(p){d=p.message,c=!0,o()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,i=!1,d="",o()}),e.querySelector("#k-save")?.addEventListener("click",()=>{g()})}async function g(){const n={...V()};e.querySelectorAll("input[data-f]").forEach(r=>{n[r.dataset.f]=r.value});const l=e.querySelector("#k-name")?.value.trim()||n.name.trim()||"Kunde";try{i?await $.customers.create(l,n):t&&await $.customers.update(t.id,{name:l,profile:n}),t=null,i=!1,d="",await v()}catch(r){d=r.message,c=!0,o()}}try{await v()}catch(n){e.innerHTML=`<div class="card error">${s(n.message)}</div>`}}function de(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function ue(e){return`<span class="badge ${e}">${e}</span>`}async function me(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),i=e.querySelector("#list"),d=e.querySelector("#list-err");let c=0;function u(n){d.innerHTML=`<div class="card error">${s(n.message)}</div>`}async function v(n){const l=n.dataset.paid??"",r=n.checked;n.disabled=!0;try{await $.setPaid(l,r),d.innerHTML=`<div class="card muted">${r?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await o()}catch(p){n.checked=!r,u(p)}finally{n.disabled=!1}}async function b(n){const l=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(l!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:r}=await $.storno(n,l.trim()||void 0);location.hash=`#/edit/${r.id}`,location.reload()}catch(r){u(r)}}async function o(){const n=++c,l={};a.value&&(l.status=a.value),t.value.trim()&&(l.q=t.value.trim());try{const r=await $.list(l);if(n!==c)return;i.innerHTML=r.map(p=>`<div class="card"><div class="row">
					${p.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${p.paid?`Ausgeglichen am ${s((p.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${s(p.id)}" ${p.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${s(p.number??"(Entwurf)")}</strong>${ue(p.status)}
					<span>${s(p.buyer.name||"—")}</span>
					<span>${L(p.totals.grossTotal)}</span>
					${p.skontoPercent>0&&!p.paid?`<span class="muted">${L(p.totals.grossTotal-de(p))} bei ${s(p.skontoPercent)} % Skonto</span>`:""}
					${p.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					<a href="#/invoices/${s(p.id)}">Ansehen</a>
					${p.status==="draft"?`<a href="#/edit/${s(p.id)}">Bearbeiten</a>`:""}
					${p.status==="issued"?`<button class="secondary" data-storno="${s(p.id)}">Storno</button>`:""}
					${p.pdfPath?`<button class="secondary" data-dl="pdf:${s(p.id)}:${s(p.number??"rechnung")}">PDF ↓</button>`:""}
					${p.xml?`<button class="secondary" data-dl="xml:${s(p.id)}:${s(p.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',i.querySelectorAll("[data-paid]").forEach(p=>p.addEventListener("change",()=>{v(p)})),i.querySelectorAll("[data-storno]").forEach(p=>p.addEventListener("click",()=>{b(p.dataset.storno??"")})),i.querySelectorAll("[data-dl]").forEach(p=>p.addEventListener("click",async()=>{const[N,f,E]=(p.dataset.dl??"").split(":"),m=N==="pdf"?$.pdfUrl(f):$.xmlUrl(f);try{await z(m,`${E}.${N}`)}catch(h){u(h)}}))}catch(r){if(n!==c)return;i.innerHTML=`<div class="card error">${s(r.message)}</div>`}}a.onchange=()=>{o()};let g;t.oninput=()=>{g!==void 0&&clearTimeout(g),g=setTimeout(()=>{o()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const n={};a.value&&(n.status=a.value),t.value.trim()&&(n.q=t.value.trim());try{await z($.exportUrl(n),"export.xlsx")}catch(l){u(l)}}),await o()}function U(e){return Math.round((e+Number.EPSILON)*100)/100}function pe(e){const a=(e??"").trim(),[t,i]=a.split(".."),d=c=>/^\d{4}-\d{2}-\d{2}$/.test(c??"")?`${c.slice(8,10)}.${c.slice(5,7)}.${c.slice(0,4)}`:c??"";return i?`${d(t)} – ${d(i)}`:d(t)}async function he(e,a){e.innerHTML='<div class="card">Lade…</div>';try{let i=await $.get(a);const c=(Array.isArray(i.lines)?i.lines:[]).map(o=>{const g=Math.min(Math.max(Number(o.discountPercent)||0,0),100),n=Number(o.quantity)||0,l=Number(o.unitPriceNet)||0;return{line:o,discount:g,gross:U(n*l),net:U(n*l*(1-g/100))}}),u=c.some(o=>o.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${s(i.number??"(Entwurf)")}</strong>
				<span class="badge ${i.status}">${i.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${s(i.seller.name)}<br />${s(i.seller.street)}<br />${s(i.seller.zip)} ${s(i.seller.city)}</div>
				<div><strong>Käufer</strong><br />${s(i.buyer.name)}<br />${s(i.buyer.street)}<br />${s(i.buyer.zip)} ${s(i.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${s(i.issueDate)} · Leistung: ${s(pe(i.deliveryDate))}${i.dueDate?` · Fällig: ${s(i.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${u?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${c.map((o,g)=>`<tr>
					<td>${g+1}</td><td>${s(o.line.description)}${o.line.sku?` (${s(o.line.sku)})`:""}</td>
					<td class="r">${s(o.line.quantity)} ${s(o.line.unit)}</td>
					<td class="r">${L(Number(o.line.unitPriceNet))}</td>
					${u?`<td class="r">${o.discount>0?`${s(o.discount)} %`:"–"}</td><td class="r">${o.discount>0?L(U(o.gross-o.net)):"–"}</td>`:""}
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
			</div><div id="d-out"></div></div>`;const v=e.querySelector("#d-out"),b=o=>{v.innerHTML=`<p class="error">${s(o.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(o=>o.addEventListener("click",async()=>{const g=o.dataset.dl,n=g==="pdf"?$.pdfUrl(i.id):g==="xml"?$.xmlUrl(i.id):$.xlsxUrl(i.id);try{await z(n,`${i.number??"rechnung"}.${g}`)}catch(l){b(l)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ne($.pdfUrl(i.id))}catch(o){b(o)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{v.innerHTML='<p class="muted">Validiere…</p>';try{const o=await $.validate(i.id);v.innerHTML=o.formatErrors.length+o.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...o.formatErrors,...o.businessErrors].map(g=>`<li class="error">${s(g)}</li>`).join("")}</ul>`}catch(o){v.innerHTML=`<p class="error">${s(o.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async o=>{const g=o.target,n=g.checked;g.disabled=!0;try{i=await $.setPaid(i.id,n),v.innerHTML=`<p style="color:var(--ok)">${n?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(l){g.checked=!n,v.innerHTML=`<p class="error">${s(l.message)}</p>`}finally{g.disabled=!1}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const o=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(o!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:g}=await $.storno(i.id,o.trim()||void 0);location.hash=`#/edit/${g.id}`,location.reload()}catch(g){v.innerHTML=`<p class="error">${s(g.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const o=await $.issue(i.id);location.hash=`#/invoices/${o.id}`,location.reload()}catch(o){v.innerHTML=`<p class="error">${s(o.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${s(t.message)}</div>`}}function fe(e){const a=C();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${s(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";I(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{I(null),location.hash="#/login",location.reload()})}function be(){I(null),location.hash="#/login"}async function ve(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,i=!1,d="",c=!1;async function u(){a=await $.products.list(),b()}function v(n){const l=r=>s(r??"");return`
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
		</select></label>`}function b(){e.innerHTML=`
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
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,i=!0,d="",b()}),e.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{t=a.find(l=>l.id===n.dataset.edit)??null,i=!1,d="",b()})),e.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(n.dataset.del??""),await u()}catch(l){d=l.message,c=!0,b()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,i=!1,d="",b()}),e.querySelector("#p-save")?.addEventListener("click",()=>{g()})}function o(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function g(){const n=o();try{i?await $.products.create(n):t&&await $.products.update(t.id,n),t=null,i=!1,d="",await u()}catch(l){d=l.message,c=!0,b()}}try{await u()}catch(n){e.innerHTML=`<div class="card error">${s(n.message)}</div>`}}async function ye(e){try{const a=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(a.version)} · Schema: ${s(String(a.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(a.message)}</div>`}}const ge=["title","meta","parties","positions","totals"],W=["payment","notes"];async function $e(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,i="",d=[];try{const n=await T("/api/company-profiles");n.ok&&(d=await n.json())}catch{}async function c(){a=await u(),b()}async function u(){const n=await T("/api/templates");if(!n.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await n.json()}function v(n){const l=n.definition,r=(p,N,f)=>`<label><input type="checkbox" data-f="blocks.${p}" ${l.blocks[p]?"checked":""} ${f?"disabled":""} style="width:auto" /> ${N}${f?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(n.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${d.map(p=>`<option value="${s(p.id)}" ${n.definition.companyId===p.id?"selected":""}>${s(p.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${s(l.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${s(l.colors.text)}" /></label>
		</div>
		${ge.map(p=>r(p,`Block ${p}`,!0)).join("")}
		${W.map(p=>r(p,`Block ${p}`,!1)).join("")}
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
		${l.logo?`<p class="muted">Aktuell: ${s(l.logo.path)}</p>`:""}`}function b(){e.innerHTML=`
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
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const r=(await(await T("/api/templates")).json())[0];if(!r){i="Keine Basisvorlage vorhanden",b();return}t={...structuredClone(r),id:"neu",name:"Neu",version:1,isDefault:!1},i="",b()}catch(n){i=n.message,b()}}),e.querySelectorAll("[data-edit]").forEach(n=>n.addEventListener("click",()=>{const l=a.find(r=>r.id===n.dataset.edit);l&&(t=structuredClone(l),i="",b())})),e.querySelectorAll("[data-prev]").forEach(n=>n.addEventListener("click",async()=>{const l=a.find(r=>r.id===n.dataset.prev);if(l)try{const r=await T("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:l.definition})});if(!r.ok){const N=await r.json().catch(()=>({}));throw new Error(N.error??"Vorschau fehlgeschlagen")}const p=await r.blob();window.open(URL.createObjectURL(p),"_blank")}catch(r){i=r.message,b()}})),e.querySelectorAll("[data-def]").forEach(n=>n.addEventListener("click",async()=>{try{if(!(await T(`/api/templates/${n.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await c()}catch(l){i=l.message,b()}})),e.querySelectorAll("[data-del]").forEach(n=>n.addEventListener("click",async()=>{const l=await T(`/api/templates/${n.dataset.del}`,{method:"DELETE"});if(!l.ok){i=(await l.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",b();return}await c()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,i="",b()}),e.querySelector("#t-save")?.addEventListener("click",()=>{g()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const n=o();if(n)try{const l=await T("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:n.definition})});if(!l.ok){const r=await l.json().catch(()=>({}));throw new Error(r.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await l.blob()),"_blank")}catch(l){i=l.message,b()}})}function o(){if(!t)return null;const n=structuredClone(t.definition);n.name=(e.querySelector("#t-name")?.value??n.name).trim(),n.colors.primary=e.querySelector("#t-c1")?.value??n.colors.primary,n.colors.text=e.querySelector("#t-c2")?.value??n.colors.text;for(const r of W)n.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??n.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])n[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;n.footerText=e.querySelector("#t-footer")?.value??"";const l=e.querySelector("#t-company")?.value??"";return l?n.companyId=l:delete n.companyId,n.introText=e.querySelector("#t-intro")?.value??"",n.closingText=e.querySelector("#t-closing")?.value??"",n.signatureName=e.querySelector("#t-sign")?.value??"",n.headerExtra=e.querySelector("#t-hextra")?.value??"",n.logo&&(n.logo.position=e.querySelector("#t-lpos")?.value??"right",n.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:n.name,definition:n}}async function g(){const n=o();if(!n)return;const l=n.definition;try{let r=t.id;if(r==="neu"){const N=await T("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await N.json()).id}else{const N=await T(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const p=e.querySelector("#t-logo")?.files?.[0];if(p){const N=await new Promise((E,m)=>{const h=new FileReader;h.onload=()=>E(String(h.result).split(",")[1]),h.onerror=()=>m(new Error("Datei nicht lesbar")),h.readAsDataURL(p)}),f=await T(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p.name,mime:p.type,dataBase64:N})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,i="",await c()}catch(r){i=r.message,b()}}try{await c()}catch(n){e.innerHTML=`<div class="card error">${s(n.message)}</div>`}}const Z=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),B=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19});function M(e){return Math.round((e+Number.EPSILON)*100)/100}function X(e){const a=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,i=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(a*t*(1-i/100))}function we(e){return(e??"").trim().split("..")[0]??""}function ke(e){const a=(e??"").trim().split("..");return a.length>1?a[1]:""}const j="einv-wizard-v1",ee="einv-employee";function te(){try{return localStorage.getItem(ee)??""}catch{return""}}function _(){return new Date().toISOString().slice(0,10)}function K(){return{step:0,seller:Z(),buyer:Z(),lines:[B()],issueDate:_(),deliveryDate:_(),dueDate:"",employee:te(),documentTitle:"Rechnung",notes:"",skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function H(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function Se(){try{const e=localStorage.getItem(j);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...K(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function Y(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(a.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${s(a.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Ee=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Le={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function Q(e,a){let t=K();const i=!!a;let d=[],c=[],u=[],v=!1;if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(a).then(f=>{if(f.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${s(f.status)}).</div>`;return}t={...K(),seller:f.seller,buyer:f.buyer,lines:f.lines.length>0?f.lines:[B()],issueDate:f.issueDate,deliveryDate:f.deliveryDate,dueDate:f.dueDate??"",employee:f.employeeCode??te(),documentTitle:f.documentTitle,notes:f.notes??"",skontoPercent:f.skontoPercent??0,skontoDueDate:f.skontoDueDate??"",draftId:f.id},o(),r()}).catch(f=>{e.innerHTML=`<div class="card error">${s(f.message)}</div>`});return}const b=Se();if(b&&H(b)&&!b.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${s(b.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=b,o(),r()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(j),o(),r()});return}b&&H(b)&&(t=b),o(),H(t)||$.company.getDefault().then(f=>{f&&!t.seller.name.trim()&&f.profile.name.trim()&&(t.seller={...t.seller,...f.profile},t.selectedCompany=f.id,r(!0))}).catch(()=>{});function o(){$.company.list().then(f=>{d=f,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),$.customers.list().then(f=>{c=f,t.step===1&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),$.products.list().then(f=>{u=f,t.step===2&&!e.querySelector("#w-catalog")&&r()}).catch(()=>{})}function g(){try{if(i)return;if(!t.dirty){localStorage.removeItem(j);return}localStorage.setItem(j,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function n(){e.querySelectorAll("input[data-p]").forEach(h=>{const w=h.dataset.p==="seller"?t.seller:t.buyer;w[h.dataset.f]=h.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(h=>{const[w,k]=h.dataset.l.split("."),P=t.lines[Number(w)];if(P)if(k==="quantity"||k==="unitPriceNet"||k==="vatRate"||k==="discountPercent"){const q=Number(h.value),A=Number.isFinite(q)?q:0;P[k]=k==="discountPercent"?Math.min(Math.max(A,0),100):A}else P[k]=h.value});const f=h=>e.querySelector(`#${h}`)?.value??"",E=()=>{const h=f("w-delivery");if(!h)return;const w=f("w-delivery-to");t.deliveryDate=w&&w!==h?`${h}..${w}`:h};t.issueDate=f("w-issue")||t.issueDate,E(),e.querySelector("#w-due")&&(t.dueDate=f("w-due")),e.querySelector("#w-employee")&&(t.employee=f("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=f("w-title")||t.documentTitle);const m=e.querySelector("#w-notes");if(m&&(t.notes=m.value),e.querySelector("#w-skonto")){const h=Number(f("w-skonto"));t.skontoPercent=Number.isFinite(h)?Math.min(Math.max(h,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=f("w-skonto-due")),g()}function l(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((E,m)=>`<span class="${m===t.step?"on":""}">${m+1}. ${E}</span>`).join("")}</div>`}function r(f=!1){f||n();let E="";if(t.step===0&&(E=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(m=>`<option value="${s(m.id)}" ${t.selectedCompany===m.id?"selected":""}>${s(m.name)}${m.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("seller",t.seller,!0)}</div>`),t.step===1&&(E=`<div class="card"><h3>Käufer</h3>
				${c.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${c.map(m=>`<option value="${s(m.id)}" ${t.selectedCustomer===m.id?"selected":""}>${s(m.name)}${m.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("buyer",t.buyer,!1)}</div>`),t.step===2&&(E=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Ee.map(m=>`<option ${m===t.documentTitle?"selected":""}>${m}</option>`).join("")}
				</select></label>
				${u.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${u.map(m=>`<option value="${s(m.id)}">${s(m.sku?`${m.sku} · `:"")}${s(m.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((m,h)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${h+1}</span><strong>Position ${h+1}</strong>
						<span class="line-sum">${L(X(m))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${h}.description" value="${s(m.description)}" /></label>
						<label>Art.Nr.<input data-l="${h}.sku" value="${s(m.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${h}.details" rows="1">${s(m.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${h}.quantity" type="number" min="0" step="any" value="${s(m.quantity)}" /></label>
						<label>Einheit<input data-l="${h}.unit" value="${s(m.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${h}.unitPriceNet" type="number" min="0" step="0.01" value="${s(m.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${h}.discountPercent" type="number" min="0" max="100" step="0.1" value="${s(m.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${h}.vatRate">
							${[19,7,0].map(w=>`<option ${w===Number(m.vatRate)?"selected":""}>${w}</option>`).join("")}
						</select></label>
						${Number(m.vatRate)===0?`<label>Steuerbefreiung<select data-l="${h}.exemptionCategory">
								${["E","AE","K","G","O"].map(w=>`<option ${(m.exemptionCategory??"E")===w?"selected":""} value="${w}">${w} — ${Le[w]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${h}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${s(m.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${h}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${s(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${s(t.dueDate)}" /></label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${s(we(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${s(ke(t.deliveryDate))}" /></label>
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
			</div>`),t.step===3){const m=t.lines.map(y=>{const D=Math.min(Math.max(Number(y.discountPercent)||0,0),100);return{...y,discount:D,gross:M((Number(y.quantity)||0)*(Number(y.unitPriceNet)||0)),net:X(y)}}).filter(y=>y.description.trim()!==""||y.gross>0),h=new Map;for(const y of m)h.set(Number(y.vatRate)||0,M((h.get(Number(y.vatRate)||0)??0)+y.net));const w=[...h.entries()].sort(([y],[D])=>y-D).map(([y,D])=>({rate:y,net:D,tax:M(D*y/100)})),k=M(w.reduce((y,D)=>y+D.net,0)),P=M(w.reduce((y,D)=>y+D.tax,0)),q=M(k+P),A=M(q*(Number(t.skontoPercent)||0)/100),G=m.some(y=>y.discount>0);E=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${s(t.documentTitle)}</strong> · ${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${m.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${G?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${m.map(y=>`<tr>
							<td>${s(y.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${s(y.quantity)} ${s(y.unit)}</td>
							<td class="r">${L(y.unitPriceNet)}</td>
							${G?`<td class="r">${y.discount>0?`${s(y.discount)} %`:"–"}</td><td class="r">${y.discount>0?L(M(y.gross-y.net)):"–"}</td>`:""}
							<td class="r">${s(y.vatRate)} %</td><td class="r"><strong>${L(y.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${L(k)}</td></tr>
						${w.map(y=>`<tr class="sub"><td class="lbl">USt ${s(y.rate)} % auf ${L(y.net)}</td><td class="r">${L(y.tax)}</td></tr>`).join("")}
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
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,r()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const m=e.querySelector("#w-company")?.value??"",h=d.find(w=>w.id===m);h?(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,r(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const m=e.querySelector("#w-customer")?.value??"",h=c.find(w=>w.id===m);h?(t.buyer={...t.buyer,...h.profile},t.selectedCustomer=h.id,r(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,r()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(j),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{n(),t.dirty=!0,t.lines.push(B()),r()}),e.querySelector("#w-take")?.addEventListener("click",()=>{n();const m=e.querySelector("#w-catalog")?.value??"",h=u.find(w=>w.id===m);if(h){const w={description:h.name,sku:h.sku||void 0,details:h.details||void 0,quantity:1,unit:h.unit,unitPriceNet:h.unitPriceNet,vatRate:h.vatRate},k=t.lines.findIndex(P=>!P.description.trim()&&!(P.sku??"").trim()&&!(P.details??"").trim()&&P.unitPriceNet===0);k>=0?t.lines[k]=w:t.lines.push(w),t.dirty=!0}r(!0)}),e.querySelectorAll("[data-del]").forEach(m=>m.addEventListener("click",()=>{n(),t.dirty=!0,t.lines.splice(Number(m.dataset.del),1),t.lines.length===0&&t.lines.push(B()),r(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{p(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&p(!0)})}async function p(f){if(!v){v=!0;try{n(),t.error="";const E={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(ee,t.employee.trim())}catch{}let m;t.draftId?m=await $.update(t.draftId,E):(m=await $.create(E),t.draftId=m.id),f&&(m=await $.issue(m.id));try{localStorage.removeItem(j)}catch{}location.hash=`#/invoices/${m.id}`}catch(m){t.error=m.message,r()}}finally{v=!1}}}e.addEventListener("input",()=>{try{N()}catch{}});function N(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const P=k.dataset.p==="seller"?t.seller:t.buyer;P[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[P,q]=k.dataset.l.split("."),A=t.lines[Number(P)];A&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"||q==="discountPercent"?A[q]=Number(k.value):A[q]=k.value)});const f=k=>e.querySelector(`#${k}`)?.value??"",E=f("w-issue"),m=f("w-delivery"),h=f("w-delivery-to");E&&(t.issueDate=E),m&&(t.deliveryDate=h&&h!==m?`${m}..${h}`:m),e.querySelector("#w-due")&&(t.dueDate=f("w-due")),e.querySelector("#w-employee")&&(t.employee=f("w-employee"));const w=f("w-title");if(w&&(t.documentTitle=w),e.querySelector("#w-skonto")){const k=Number(f("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=f("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,g()}r()}const Ne=document.querySelector("#app");function Te(e){const a=!!C(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];Ne.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([i,d])=>`<a href="${i}" class="${e===i||i==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function ae(){const e=location.hash||"#/";Te(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await me(a):e==="#/new"?Q(a):e.startsWith("#/edit/")?Q(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await he(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await $e(a):e==="#/company"?await ie(a):e==="#/customers"?await ce(a):e==="#/products"?await ve(a):e==="#/backup"?await se(a):e==="#/login"?fe(a):e==="#/logout"?be():e==="#/status"?await ye(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{ae()});ae();
