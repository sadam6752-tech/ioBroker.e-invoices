(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))s(c);new MutationObserver(c=>{for(const o of c)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&s(u)}).observe(document,{childList:!0,subtree:!0});function t(c){const o={};return c.integrity&&(o.integrity=c.integrity),c.referrerPolicy&&(o.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?o.credentials="include":c.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(c){if(c.ep)return;c.ep=!0;const o=t(c);fetch(c.href,o)}})();const C="einv-token";function V(){try{return localStorage.getItem(C)}catch{return null}}function K(e){try{e?localStorage.setItem(C,e):localStorage.removeItem(C)}catch{}}async function S(e,n){const t=await N(e,{headers:{"content-type":"application/json"},...n});if(!t.ok){const s=await t.json().catch(()=>({}));throw new Error(s.error??`HTTP ${t.status}`)}return await t.json()}async function N(e,n){const t={...n?.headers??{}},s=V();s&&(t.authorization=`Bearer ${s}`);const c=await fetch(e,{...n,headers:t});if(c.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return c}async function U(e,n){const t=await N(e);if(!t.ok){const u=await t.json().catch(()=>({}));throw new Error(u.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const s=await t.blob(),c=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(s),o.download=c?.[1]??n,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function ue(e){const n=await N(e);if(!n.ok){const c=await n.json().catch(()=>({}));throw new Error(c.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const t=await n.blob(),s=URL.createObjectURL(t);window.open(s,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(s),6e4)}const $={health:()=>S("/api/health"),settings:()=>S("/api/settings"),list:(e={})=>{const n=new URLSearchParams(e).toString();return S(`/api/invoices${n?`?${n}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),setPaid:(e,n,t)=>S(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:t})}),storno:(e,n)=>S(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),rerender:(e,n)=>S(`/api/invoices/${e}/rerender`,{method:"POST",body:JSON.stringify({reason:n})}),renders:e=>S(`/api/invoices/${e}/renders`),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,n)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:()=>S("/api/customers"),create:(e,n)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>S("/api/customers/number-assign",{method:"POST"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${n?`?${n}`:""}`}};function i(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function T(e){return`${Number(e).toFixed(2)} EUR`}function z(e){return e.split("/").pop()??e}async function me(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],t="",s=!1;async function c(){const u=await N("/api/backups");if(!u.ok)throw new Error("Backups konnten nicht geladen werden");n=await u.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${s?"error":""}">${i(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(u=>`<div class="row" style="margin-top:8px">
				<strong>${i(z(u.filename))}</strong>
				<span class="muted">${i(u.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(u.size/1024)} KB</span>
				<button class="secondary" data-dl="${i(u.filename)}">Download</button>
				<button class="secondary" data-restore="${i(u.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const u=await N("/api/backups",{method:"POST"});if(!u.ok)throw new Error((await u.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const f=await u.json();t=`Gesichert: ${z(f.filename)}`,s=!1,await c()}catch(u){t=u.message,s=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(u=>u.addEventListener("click",async()=>{const f=u.dataset.dl??"";try{await U(`/api/backups/file/${z(f)}`,z(f))}catch(p){t=p.message,s=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(u=>u.addEventListener("click",async()=>{const f=u.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${z(f)}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await N("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:f})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const b=await p.json();t=`Wiederhergestellt: ${b.invoices} Rechnungen, ${b.templates} Vorlagen${b.fileErrors.length>0?` (${b.fileErrors.length} Dateifehler)`:""}`,s=!1,await c()}catch(p){t=p.message,s=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const u=e.querySelector("#b-file")?.files?.[0];if(!u){t="Bitte zuerst eine ZIP-Datei wählen",s=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${u.name}? Die aktuelle Datenbank wird ersetzt.`))try{const f=await new Promise((w,a)=>{const l=new FileReader;l.onload=()=>w(String(l.result).split(",")[1]),l.onerror=()=>a(new Error("Datei nicht lesbar")),l.readAsDataURL(u)}),p=await N("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:f})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const b=await p.json();t=`Wiederhergestellt: ${b.invoices} Rechnungen, ${b.templates} Vorlagen`,s=!1,await c()}catch(f){t=f.message,s=!0,o()}})}try{await c()}catch(u){e.innerHTML=`<div class="card error">${i(u.message)}</div>`}}const Z=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function D(e,n,t){const s=e[n],c=Array.isArray(s)?s.join(`
`):s??"";return`<label>${t}<input data-f="${n}" value="${i(c)}" /></label>`}async function pe(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,t="",s=!1;try{n=await $.company.getDefault(),n||(n=(await $.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${i(o.message)}</div>`;return}function c(){const o=n?.profile??Z();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${i(n?.name??"Meine Firma")}" /></label>
			${D(o,"name","Firmenname")}
			${D(o,"street","Straße")}
			<div class="grid2">${D(o,"zip","PLZ")}${D(o,"city","Ort")}</div>
			<div class="grid2">${D(o,"country","Land")}${D(o,"email","E-Mail")}</div>
			<div class="grid2">${D(o,"phone","Telefon")}${D(o,"website","Webseite")}</div>
			<div class="grid2">${D(o,"vatId","USt-IdNr.")}${D(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${D(o,"bankName","Bankname")}${D(o,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${i(o.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(u=>`<div class="grid2"><label>Box ${u+1}<textarea data-fbox="${u}" rows="3">${i((o.footerBoxes??[])[u]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${u}">
					${["left","center","right"].map(f=>`<option value="${f}" ${(o.footerAlign??[])[u]===f||!(o.footerAlign??[])[u]&&f==="left"?"selected":""}>${f==="left"?"Links":f==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${s?"error":""}">${i(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const u={...Z()};e.querySelectorAll("input[data-f]").forEach(b=>{u[b.dataset.f]=b.value});const f=[0,1,2,3].map(b=>e.querySelector(`textarea[data-fbox="${b}"]`)?.value??"");f.some(b=>b.trim()!=="")?(u.footerBoxes=f,u.footerAlign=[0,1,2,3].map(b=>{const w=e.querySelector(`select[data-falign="${b}"]`)?.value;return w==="center"||w==="right"?w:"left"})):(delete u.footerBoxes,delete u.footerAlign);const p=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await $.company.update(n.id,{name:p,profile:u}):n=await $.company.create(p,u),t="Gespeichert.",s=!1,c()}catch(b){t=b.message,s=!0,c()}})}c()}const W=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),he=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function fe(e,n){const t=Number(e.replace(/\D+/g,"")),s=Number(n.replace(/\D+/g,"")),c=/\d/.test(e)&&Number.isFinite(t),o=/\d/.test(n)&&Number.isFinite(s);return c&&o&&t!==s?t-s:e.localeCompare(n,"de")}function be(e,n){const t=n.endsWith("desc")?-1:1,s=[...e];return s.sort((c,o)=>n.startsWith("number")?fe(c.profile.customerNumber?.trim()??"",o.profile.customerNumber?.trim()??"")*t:c.name.localeCompare(o.name,"de")*t),s}function R(e,n,t){const s=e[n],c=Array.isArray(s)?s.join(`
`):s??"";return`<label>${t}<input data-f="${n}" value="${i(c)}" /></label>`}async function ve(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],t=null,s=!1,c="",o=!1,u="name-asc";async function f(){n=await $.customers.list(),b()}function p(a,l){return`
		<label>Name (Anzeige)<input id="k-name" value="${i(l)}" /></label>
		${R(a,"name","Firmenname")}
		${R(a,"street","Straße")}
		<div class="grid2">${R(a,"zip","PLZ")}${R(a,"city","Ort")}</div>
		<div class="grid2">${R(a,"country","Land")}${R(a,"email","E-Mail")}</div>
		<div class="grid2">${R(a,"phone","Telefon")}${R(a,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${i(a.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function b(){const a=n.filter(r=>!r.profile.customerNumber?.trim()).length,l=be(n,u);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${he.map(r=>`<option value="${r.value}" ${r.value===u?"selected":""}>${r.label}</option>`).join("")}
			</select></label>
			${a>0?`<button class="secondary" id="k-number">${a} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${l.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${i(r.name)}</strong>
				${r.profile.customerNumber?.trim()?`<span class="badge">${i(r.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${i(r.profile.city||"")}</span>
				<button class="secondary" data-edit="${r.id}">Bearbeiten</button>
				<button class="danger" data-del="${r.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
			<p class="muted">${l.length} Kunden</p>
		</div>
		${t||s?`<div class="card"><h3>${s?"Neuer Kunde":i(t?.name??"")}</h3>
			${p(t?.profile??W(),t?.name??"")}
			${c?`<p class="${o?"error":""}">${i(c)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",r=>{u=r.target.value,b()}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{c=`${await $.customers.assignNumbers()} Kundennummer(n) vergeben.`,o=!1,await f()}catch(r){c=r.message,o=!0,b()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,s=!0,c="",b()}),e.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{t=n.find(y=>y.id===r.dataset.edit)??null,s=!1,c="",b()})),e.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(r.dataset.del??""),await f()}catch(y){c=y.message,o=!0,b()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,s=!1,c="",b()}),e.querySelector("#k-save")?.addEventListener("click",()=>{w()})}async function w(){const a={...W()};e.querySelectorAll("input[data-f]").forEach(r=>{a[r.dataset.f]=r.value});const l=e.querySelector("#k-name")?.value.trim()||a.name.trim()||"Kunde";try{s?await $.customers.create(l,a):t&&await $.customers.update(t.id,{name:l,profile:a}),t=null,s=!1,c="",await f()}catch(r){c=r.message,o=!0,b()}}try{await f()}catch(a){e.innerHTML=`<div class="card error">${i(a.message)}</div>`}}function ye(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function ge(e){return`<span class="badge ${e}">${e}</span>`}async function $e(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const n=e.querySelector("#f-status"),t=e.querySelector("#f-q"),s=e.querySelector("#list"),c=e.querySelector("#list-err");let o=0;function u(w){c.innerHTML=`<div class="card error">${i(w.message)}</div>`}async function f(w){const a=w.dataset.paid??"",l=w.checked;w.disabled=!0;try{await $.setPaid(a,l),c.innerHTML=`<div class="card muted">${l?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await p()}catch(r){w.checked=!l,u(r)}finally{w.disabled=!1}}async function p(){const w=++o,a={};n.value&&(a.status=n.value),t.value.trim()&&(a.q=t.value.trim());try{const l=await $.list(a);if(w!==o)return;s.innerHTML=l.map(r=>`<div class="card"><div class="row">
					${r.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${r.paid?`Ausgeglichen am ${i((r.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${i(r.id)}" ${r.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${i(r.number??"(Entwurf)")}</strong>${ge(r.status)}
					<span>${i(r.buyer.name||"—")}</span>
					<span>${T(r.totals.grossTotal)}</span>
					${r.skontoPercent>0&&!r.paid?`<span class="muted">${T(r.totals.grossTotal-ye(r))} bei ${i(r.skontoPercent)} % Skonto</span>`:""}
					${r.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					<a href="#/invoices/${i(r.id)}">Ansehen</a>
					${r.status==="draft"?`<a href="#/edit/${i(r.id)}">Bearbeiten</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',s.querySelectorAll("[data-paid]").forEach(r=>r.addEventListener("change",()=>{f(r)}))}catch(l){if(w!==o)return;s.innerHTML=`<div class="card error">${i(l.message)}</div>`}}n.onchange=()=>{p()};let b;t.oninput=()=>{b!==void 0&&clearTimeout(b),b=setTimeout(()=>{p()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const w={};n.value&&(w.status=n.value),t.value.trim()&&(w.q=t.value.trim());try{await U($.exportUrl(w),"export.xlsx")}catch(a){u(a)}}),await p()}function F(e){return Math.round((e+Number.EPSILON)*100)/100}function we(e){const n=(e??"").trim(),[t,s]=n.split(".."),c=o=>/^\d{4}-\d{2}-\d{2}$/.test(o??"")?`${o.slice(8,10)}.${o.slice(5,7)}.${o.slice(0,4)}`:o??"";return s?`${c(t)} – ${c(s)}`:c(t)}async function ke(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let s=await $.get(n);const o=(Array.isArray(s.lines)?s.lines:[]).map(a=>{const l=Math.min(Math.max(Number(a.discountPercent)||0,0),100),r=Number(a.quantity)||0,y=Number(a.unitPriceNet)||0;return{line:a,discount:l,gross:F(r*y),net:F(r*y*(1-l/100))}}),u=o.some(a=>a.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${i(s.number??"(Entwurf)")}</strong>
				<span class="badge ${s.status}">${s.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${i(s.seller.name)}<br />${i(s.seller.street)}<br />${i(s.seller.zip)} ${i(s.seller.city)}</div>
				<div><strong>Käufer</strong><br />${i(s.buyer.name)}<br />${i(s.buyer.street)}<br />${i(s.buyer.zip)} ${i(s.buyer.city)}${s.buyer.email?`<br />${i(s.buyer.email)}`:""}</div>
			</div>
			<p>Ausgestellt: ${i(s.issueDate)} · Leistung: ${i(we(s.deliveryDate))}${s.dueDate?` · Fällig: ${i(s.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${u?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${o.map((a,l)=>`<tr>
					<td>${l+1}</td><td>${i(a.line.description)}${a.line.sku?` (${i(a.line.sku)})`:""}</td>
					<td class="r">${i(a.line.quantity)} ${i(a.line.unit)}</td>
					<td class="r">${T(Number(a.line.unitPriceNet))}</td>
					${u?`<td class="r">${a.discount>0?`${i(a.discount)} %`:"–"}</td><td class="r">${a.discount>0?T(F(a.gross-a.net)):"–"}</td>`:""}
					<td class="r">${i(a.line.vatRate)} %</td><td class="r"><strong>${T(a.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${T(s.totals.grossTotal)}</strong> <span class="muted">(netto ${T(s.totals.netTotal)} + USt ${T(s.totals.taxTotal)})</span></p>
			${s.notes?`<p class="muted">Notiz: ${i(s.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${s.status==="draft"?`<a class="btn" href="#/edit/${i(s.id)}">Bearbeiten</a>`:""}
				${s.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${s.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${s.paid?"checked":""} /><span>bezahlt${s.paid&&s.paidAt?` (${i(s.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${s.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				${s.status!=="draft"&&s.pdfPath?'<button class="secondary" id="d-rerender" title="Erzeugt die PDF neu, z. B. nach einer Layout-Korrektur. Der Inhalt der Rechnung bleibt unverändert, das Original wird archiviert.">Neu rendern</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
			${s.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
			${s.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
			${s.status==="issued"&&s.pdfPath?'<button class="secondary" id="d-mail">E-Mail (PDF)</button>':""}
			${s.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
			${s.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div><div id="d-history"></div></div>`;const f=e.querySelector("#d-out"),p=a=>{f.innerHTML=`<p class="error">${i(a.message)}</p>`},b=e.querySelector("#d-history"),w=async()=>{if(s.status!=="draft")try{const a=await $.renders(s.id);if(!a.length){b.innerHTML="";return}b.innerHTML=`<details><summary>Neu gerendert (${a.length})</summary><ul>${a.map(l=>`<li>${i(l.createdAt.slice(0,16).replace("T"," "))} – ${i(l.artifact.toUpperCase())}${l.reason?` – ${i(l.reason)}`:""}${l.previousPath?` – Original: <code>${i(l.previousPath.split("/").pop()??"")}</code>`:""}</li>`).join("")}</ul></details>`}catch{}};await w(),e.querySelectorAll("[data-dl]").forEach(a=>a.addEventListener("click",async()=>{const l=a.dataset.dl,r=l==="pdf"?$.pdfUrl(s.id):l==="xml"?$.xmlUrl(s.id):$.xlsxUrl(s.id);try{await U(r,`${s.number??"rechnung"}.${l}`)}catch(y){p(y)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ue($.pdfUrl(s.id))}catch(a){p(a)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{f.innerHTML='<p class="muted">Validiere…</p>';try{const a=await $.validate(s.id);f.innerHTML=a.formatErrors.length+a.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...a.formatErrors,...a.businessErrors].map(l=>`<li class="error">${i(l)}</li>`).join("")}</ul>`}catch(a){f.innerHTML=`<p class="error">${i(a.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async a=>{const l=a.target,r=l.checked;l.disabled=!0;try{s=await $.setPaid(s.id,r),f.innerHTML=`<p style="color:var(--ok)">${r?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(y){l.checked=!r,f.innerHTML=`<p class="error">${i(y.message)}</p>`}finally{l.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const a=(s.buyer.email??"").trim(),l=`${s.documentTitle??"Rechnung"} ${s.number??""}`.trim(),r=`Guten Tag ${s.buyer.name||""},

anbei erhalten Sie ${l} vom ${s.issueDate}.
Gesamtbetrag: ${T(s.totals.grossTotal)}.
${s.dueDate?`Bitte überweisen bis ${s.dueDate}.
`:""}
Mit freundlichen Grüßen
${s.seller.name}
`;try{await U($.pdfUrl(s.id),`${s.number??"rechnung"}.pdf`)}catch(P){p(P);return}const y=`mailto:${a}?subject=${encodeURIComponent(l)}&body=${encodeURIComponent(r)}`;window.location.href=y,f.innerHTML=a?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${i(a)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-rerender")?.addEventListener("click",async()=>{const a=window.prompt('Grund für das Neu rendern (wird protokolliert, z. B. "Layout-Korrektur"):',"Layout-Korrektur");if(a!==null&&window.confirm("Die PDF wird aus den unveränderten Rechnungsdaten neu erzeugt. Nummer, Beträge und Daten der Rechnung ändern sich nicht. Das bisherige Dokument wird als .orig-1.pdf archiviert. Fortfahren?")){f.innerHTML='<p class="muted">Rendere neu…</p>';try{const l=await $.rerender(s.id,a.trim()||void 0);s=l.invoice,f.innerHTML=`<p style="color:var(--ok)">PDF neu erzeugt.${l.archivedPath?` Das Original liegt als <code>${i(l.archivedPath.split("/").pop()??"")}</code> daneben.`:""}</p>`,await w()}catch(l){f.innerHTML=`<p class="error">${i(l.message)}</p>`}}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const a=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(a!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:l}=await $.storno(s.id,a.trim()||void 0);location.hash=`#/edit/${l.id}`,location.reload()}catch(l){f.innerHTML=`<p class="error">${i(l.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const a=await $.issue(s.id);location.hash=`#/invoices/${a.id}`,location.reload()}catch(a){f.innerHTML=`<p class="error">${i(a.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${i(t.message)}</div>`}}function Se(e){const n=V();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${i(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";K(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{K(null),location.hash="#/login",location.reload()})}function Te(){K(null),location.hash="#/login"}async function Ee(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],t=null,s=!1,c="",o=!1;async function u(){n=await $.products.list(),p()}function f(a){const l=r=>i(r??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${l(a.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${l(a.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${l(a.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${l(a.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${a.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(r=>`<option ${r===(a.vatRate??19)?"selected":""}>${r}</option>`).join("")}
		</select></label>`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${n.map(a=>`<div class="row" style="margin-top:8px">
				<strong>${i(a.sku?`${a.sku} · `:"")}${i(a.name)}</strong>
				<span class="muted">${i(a.unit)} · ${Number(a.unitPriceNet).toFixed(2)} EUR · ${a.vatRate} %</span>
				<button class="secondary" data-edit="${a.id}">Bearbeiten</button>
				<button class="danger" data-del="${a.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||s?`<div class="card"><h3>${s?"Neue Position":i(t?.name??"")}</h3>
			${f(t??{})}
			${c?`<p class="${o?"error":""}">${i(c)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,s=!0,c="",p()}),e.querySelectorAll("[data-edit]").forEach(a=>a.addEventListener("click",()=>{t=n.find(l=>l.id===a.dataset.edit)??null,s=!1,c="",p()})),e.querySelectorAll("[data-del]").forEach(a=>a.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(a.dataset.del??""),await u()}catch(l){c=l.message,o=!0,p()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,s=!1,c="",p()}),e.querySelector("#p-save")?.addEventListener("click",()=>{w()})}function b(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function w(){const a=b();try{s?await $.products.create(a):t&&await $.products.update(t.id,a),t=null,s=!1,c="",await u()}catch(l){c=l.message,o=!0,p()}}try{await u()}catch(a){e.innerHTML=`<div class="card error">${i(a.message)}</div>`}}async function Le(e){try{const n=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${i(n.version)} · Schema: ${i(String(n.schemaVersion))}</p>
			<pre class="dump">${i(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${i(n.message)}</div>`}}const Ne=["title","meta","parties","positions","totals"],_=["payment","notes"],Pe=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function qe(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],t=null,s="",c=[];try{const a=await N("/api/company-profiles");a.ok&&(c=await a.json())}catch{}async function o(){n=await u(),p()}async function u(){const a=await N("/api/templates");if(!a.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await a.json()}function f(a){const l=a.definition,r=(y,P,m)=>`<label><input type="checkbox" data-f="blocks.${y}" ${l.blocks[y]?"checked":""} ${m?"disabled":""} style="width:auto" /> ${P}${m?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${i(a.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${c.map(y=>`<option value="${i(y.id)}" ${a.definition.companyId===y.id?"selected":""}>${i(y.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${i(l.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${i(l.colors.text)}" /></label>
		</div>
		<label class="pay" title="Aus: das Dokument bleibt schwarz/weiß, die Primärfarbe wird nirgends verwendet">
			<input type="checkbox" data-f="usePrimaryColor" ${l.usePrimaryColor!==!1?"checked":""} /><span>Primärfarbe verwenden</span>
		</label>
		<label class="pay" title="Ohne Haken: der Titel wird in der Textfarbe gesetzt">
			<input type="checkbox" data-f="titleAccent" ${l.titleAccent!==!1?"checked":""} /><span>Rechnungstitel in Akzentfarbe</span>
		</label>
		<label class="pay" title="Ohne Haken: nur die linke Hälfte der Kopfzeile ist eingefärbt, die rechte bleibt grau">
			<input type="checkbox" data-f="tableHeaderAccent" ${l.tableHeaderAccent===!0?"checked":""} /><span>Tabellenkopf komplett in Akzentfarbe</span>
		</label>
		${Ne.map(y=>r(y,`Block ${y}`,!0)).join("")}
		${_.map(y=>r(y,`Block ${y}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${l.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${l.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${l.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${l.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${l.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${l.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${l.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${i(l.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${i(l.closingText??"")}</textarea></label>
		<div class="grid2">
			<label title="Leer lassen: es wird kein Name gedruckt">Unterschrift (Name, optional)<input id="t-sign" value="${i(l.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${i(l.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${i(l.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${Pe.map(y=>`<option value="${y.value}" ${l.logo?.position===y.value?"selected":""}>${y.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${l.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${l.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${l.logo?`<p class="muted">Aktuell: ${i(l.logo.path)}</p>`:""}`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${n.map(a=>`<div class="row" style="margin-top:8px">
				<strong>${i(a.name)}</strong><span class="muted">v${a.version}</span>
				${a.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${a.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${a.id}">Vorschau</button>
				${a.isDefault?"":`<button class="secondary" data-def="${a.id}">Standard</button>`}
				${a.isDefault?"":`<button class="danger" data-del="${a.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${i(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${f(t)}
			${s?`<p class="error">${i(s)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const r=(await(await N("/api/templates")).json())[0];if(!r){s="Keine Basisvorlage vorhanden",p();return}t={...structuredClone(r),id:"neu",name:"Neu",version:1,isDefault:!1},s="",p()}catch(a){s=a.message,p()}}),e.querySelectorAll("[data-edit]").forEach(a=>a.addEventListener("click",()=>{const l=n.find(r=>r.id===a.dataset.edit);l&&(t=structuredClone(l),s="",p())})),e.querySelectorAll("[data-prev]").forEach(a=>a.addEventListener("click",async()=>{const l=n.find(r=>r.id===a.dataset.prev);if(l)try{const r=await N("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:l.definition})});if(!r.ok){const P=await r.json().catch(()=>({}));throw new Error(P.error??"Vorschau fehlgeschlagen")}const y=await r.blob();window.open(URL.createObjectURL(y),"_blank")}catch(r){s=r.message,p()}})),e.querySelectorAll("[data-def]").forEach(a=>a.addEventListener("click",async()=>{try{if(!(await N(`/api/templates/${a.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(l){s=l.message,p()}})),e.querySelectorAll("[data-del]").forEach(a=>a.addEventListener("click",async()=>{const l=await N(`/api/templates/${a.dataset.del}`,{method:"DELETE"});if(!l.ok){s=(await l.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,s="",p()}),e.querySelector("#t-save")?.addEventListener("click",()=>{w()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const a=b();if(a)try{const l=await N("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:a.definition})});if(!l.ok){const r=await l.json().catch(()=>({}));throw new Error(r.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await l.blob()),"_blank")}catch(l){s=l.message,p()}})}function b(){if(!t)return null;const a=structuredClone(t.definition);a.name=(e.querySelector("#t-name")?.value??a.name).trim(),a.colors.primary=e.querySelector("#t-c1")?.value??a.colors.primary,a.colors.text=e.querySelector("#t-c2")?.value??a.colors.text;for(const r of _)a.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??a.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])a[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;for(const r of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const y=e.querySelector(`[data-f="${r}"]`);y&&(a[r]=y.checked)}a.footerText=e.querySelector("#t-footer")?.value??"";const l=e.querySelector("#t-company")?.value??"";return l?a.companyId=l:delete a.companyId,a.introText=e.querySelector("#t-intro")?.value??"",a.closingText=e.querySelector("#t-closing")?.value??"",a.signatureName=e.querySelector("#t-sign")?.value??"",a.headerExtra=e.querySelector("#t-hextra")?.value??"",a.logo&&(a.logo.position=e.querySelector("#t-lpos")?.value??"right",a.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),a.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:a.name,definition:a}}async function w(){const a=b();if(!a)return;const l=a.definition;try{let r=t.id;if(r==="neu"){const P=await N("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!P.ok)throw new Error((await P.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await P.json()).id}else{const P=await N(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!P.ok)throw new Error((await P.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const y=e.querySelector("#t-logo")?.files?.[0];if(y){const P=await new Promise((L,d)=>{const h=new FileReader;h.onload=()=>L(String(h.result).split(",")[1]),h.onerror=()=>d(new Error("Datei nicht lesbar")),h.readAsDataURL(y)}),m=await N(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:y.name,mime:y.type,dataBase64:P})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,s="",await o()}catch(r){s=r.message,p()}}try{await o()}catch(a){e.innerHTML=`<div class="card error">${i(a.message)}</div>`}}const X=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),H=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:B.defaultVatRate});let B={defaultVatRate:19,defaultPaymentTerms:""};const J=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],Y="__own__";function se(e,n){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+n),t.toISOString().slice(0,10)}function ie(e){return!!e&&!re(e)}function re(e){return!!e&&J.some(n=>n.text===e)}function le(e){return J.find(n=>n.text===e)?.days??null}function Q(e){if(!e.dueAuto)return;const n=le(e.paymentTerms);n!==null&&(e.dueDate=se(e.issueDate,n))}function M(e){return Math.round((e+Number.EPSILON)*100)/100}function ee(e){const n=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,s=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(n*t*(1-s/100))}function De(e){return(e??"").trim().split("..")[0]??""}function xe(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const O="einv-wizard-v1",oe="einv-employee";function ce(){try{return localStorage.getItem(oe)??""}catch{return""}}function te(){return new Date().toISOString().slice(0,10)}function G(){return{step:0,seller:X(),buyer:X(),lines:[H()],issueDate:te(),deliveryDate:te(),dueDate:"",employee:ce(),documentTitle:"Rechnung",notes:"",paymentTerms:B.defaultPaymentTerms,termsCustom:ie(B.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function I(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function Ae(){try{const e=localStorage.getItem(O);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{...G(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function ae(e,n,t){return`
		<label>Name<input data-p="${e}" data-f="name" value="${i(n.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${i(n.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${i(n.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${i(n.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${i(n.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${i(n.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${e}" data-f="phone" value="${i(n.phone)}" /></label>
			${t?`<label>Webseite<input data-p="${e}" data-f="website" value="${i(n.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${i(n.contactName)}" /></label>`}
		</div>
		${t?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${i(n.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${i(n.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${i(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${i(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Me=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Re={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function ne(e,n){let t=G();const s=!!n;let c=[],o=[],u=[],f=!1;if($.settings().then(m=>{B={defaultVatRate:Number(m.defaultVatRate)||19,defaultPaymentTerms:m.defaultPaymentTerms??""}}).catch(()=>{}),n){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(n).then(m=>{if(m.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${i(m.status)}).</div>`;return}t={...G(),seller:m.seller,buyer:m.buyer,lines:m.lines.length>0?m.lines:[H()],issueDate:m.issueDate,deliveryDate:m.deliveryDate,dueDate:m.dueDate??"",employee:m.employeeCode??ce(),documentTitle:m.documentTitle,notes:m.notes??"",paymentTerms:m.paymentTerms??B.defaultPaymentTerms,termsCustom:ie(m.paymentTerms),skontoPercent:m.skontoPercent??0,skontoDueDate:m.skontoDueDate??"",draftId:m.id},b(),r()}).catch(m=>{e.innerHTML=`<div class="card error">${i(m.message)}</div>`});return}const p=Ae();if(p&&I(p)&&!p.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${i(p.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=p,b(),r()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(O),b(),r()});return}p&&I(p)&&(t=p),b(),I(t)||$.company.getDefault().then(m=>{m&&!t.seller.name.trim()&&m.profile.name.trim()&&(t.seller={...t.seller,...m.profile},t.selectedCompany=m.id,r(!0))}).catch(()=>{});function b(){$.company.list().then(m=>{c=m,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),$.customers.list().then(m=>{o=m,t.step===1&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),$.products.list().then(m=>{u=m,t.step===2&&!e.querySelector("#w-catalog")&&r()}).catch(()=>{})}function w(){try{if(s)return;if(!t.dirty){localStorage.removeItem(O);return}localStorage.setItem(O,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function a(){e.querySelectorAll("input[data-p]").forEach(v=>{const k=v.dataset.p==="seller"?t.seller:t.buyer;k[v.dataset.f]=v.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(v=>{const[k,E]=v.dataset.l.split("."),q=t.lines[Number(k)];if(q)if(E==="quantity"||E==="unitPriceNet"||E==="vatRate"||E==="discountPercent"){const A=Number(v.value),j=Number.isFinite(A)?A:0;q[E]=E==="discountPercent"?Math.min(Math.max(j,0),100):j}else q[E]=v.value});const m=v=>e.querySelector(`#${v}`)?.value??"",L=()=>{const v=m("w-delivery");if(!v)return;const k=m("w-delivery-to");t.deliveryDate=k&&k!==v?`${v}..${k}`:v};t.issueDate=m("w-issue")||t.issueDate,L(),e.querySelector("#w-due")&&(t.dueDate=m("w-due")),Q(t),e.querySelector("#w-employee")&&(t.employee=m("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=m("w-title")||t.documentTitle);const d=e.querySelector("#w-notes");d&&(t.notes=d.value);const h=e.querySelector("#w-terms");if(h&&(t.paymentTerms=h.value),e.querySelector("#w-skonto")){const v=Number(m("w-skonto"));t.skontoPercent=Number.isFinite(v)?Math.min(Math.max(v,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=m("w-skonto-due")),w()}function l(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((L,d)=>`<span class="${d===t.step?"on":""}">${d+1}. ${L}</span>`).join("")}</div>`}function r(m=!1){m||a();let L="";if(t.step===0&&(L=`<div class="card"><h3>Verkäufer</h3>
				${c.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${c.map(d=>`<option value="${i(d.id)}" ${t.selectedCompany===d.id?"selected":""}>${i(d.name)}${d.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ae("seller",t.seller,!0)}</div>`),t.step===1&&(L=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(d=>`<option value="${i(d.id)}" ${t.selectedCustomer===d.id?"selected":""}>${i(d.name)}${d.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ae("buyer",t.buyer,!1)}</div>`),t.step===2&&(L=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Me.map(d=>`<option ${d===t.documentTitle?"selected":""}>${d}</option>`).join("")}
				</select></label>
				${u.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${u.map(d=>`<option value="${i(d.id)}">${i(d.sku?`${d.sku} · `:"")}${i(d.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((d,h)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${h+1}</span><strong>Position ${h+1}</strong>
						<span class="line-sum">${T(ee(d))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${h}.description" value="${i(d.description)}" /></label>
						<label>Art.Nr.<input data-l="${h}.sku" value="${i(d.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${h}.details" rows="1">${i(d.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${h}.quantity" type="number" min="0" step="any" value="${i(d.quantity)}" /></label>
						<label>Einheit<input data-l="${h}.unit" value="${i(d.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${h}.unitPriceNet" type="number" min="0" step="0.01" value="${i(d.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${h}.discountPercent" type="number" min="0" max="100" step="0.1" value="${i(d.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${h}.vatRate">
							${[19,7,0].map(v=>`<option ${v===Number(d.vatRate)?"selected":""}>${v}</option>`).join("")}
						</select></label>
						${Number(d.vatRate)===0?`<label>Steuerbefreiung<select data-l="${h}.exemptionCategory">
								${["E","AE","K","G","O"].map(v=>`<option ${(d.exemptionCategory??"E")===v?"selected":""} value="${v}">${v} — ${Re[v]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${h}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${i(d.exemptionReason)}</textarea></label>`:""}
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
						<label>von<input id="w-delivery" type="date" value="${i(De(t.deliveryDate))}" /></label>
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
					${J.map(d=>`<option value="${i(d.text)}" ${!t.termsCustom&&t.paymentTerms===d.text?"selected":""}>${i(d.text)}</option>`).join("")}
					<option value="${Y}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${i(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const d=t.lines.map(g=>{const x=Math.min(Math.max(Number(g.discountPercent)||0,0),100);return{...g,discount:x,gross:M((Number(g.quantity)||0)*(Number(g.unitPriceNet)||0)),net:ee(g)}}).filter(g=>g.description.trim()!==""||g.gross>0),h=new Map;for(const g of d)h.set(Number(g.vatRate)||0,M((h.get(Number(g.vatRate)||0)??0)+g.net));const v=[...h.entries()].sort(([g],[x])=>g-x).map(([g,x])=>({rate:g,net:x,tax:M(x*g/100)})),k=M(v.reduce((g,x)=>g+x.net,0)),E=M(v.reduce((g,x)=>g+x.tax,0)),q=M(k+E),A=M(q*(Number(t.skontoPercent)||0)/100),j=d.some(g=>g.discount>0);L=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${i(t.documentTitle)}</strong> · ${i(t.seller.name||"—")} → ${i(t.buyer.name||"—")} · ${d.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${j?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${d.map(g=>`<tr>
							<td>${i(g.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${i(g.quantity)} ${i(g.unit)}</td>
							<td class="r">${T(g.unitPriceNet)}</td>
							${j?`<td class="r">${g.discount>0?`${i(g.discount)} %`:"–"}</td><td class="r">${g.discount>0?T(M(g.gross-g.net)):"–"}</td>`:""}
							<td class="r">${i(g.vatRate)} %</td><td class="r"><strong>${T(g.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${T(k)}</td></tr>
						${v.map(g=>`<tr class="sub"><td class="lbl">USt ${i(g.rate)} % auf ${T(g.net)}</td><td class="r">${T(g.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${T(q)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${i(t.skontoPercent)} % Skonto bis ${i(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${T(A)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${T(q-A)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${l()}${L}
			${t.error?`<div class="card error">${i(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,r()}),e.querySelector("#w-terms-select")?.addEventListener("change",d=>{const h=d.target.value;if(h===Y)t.termsCustom=!0,re(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=h;const v=le(h);v!==null?(t.dueAuto=!0,t.dueDate=se(t.issueDate,v)):t.dueAuto=!1}r()}),e.querySelector("#w-due")?.addEventListener("change",()=>{a(),t.dueAuto=!1,r()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const d=e.querySelector("#w-company")?.value??"",h=c.find(v=>v.id===d);h?(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,r(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const d=e.querySelector("#w-customer")?.value??"",h=o.find(v=>v.id===d);h?(t.buyer={...t.buyer,...h.profile},t.selectedCustomer=h.id,r(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,r()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(O),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{a(),t.dirty=!0,t.lines.push(H()),r()}),e.querySelector("#w-take")?.addEventListener("click",()=>{a();const d=e.querySelector("#w-catalog")?.value??"",h=u.find(v=>v.id===d);if(h){const v={description:h.name,sku:h.sku||void 0,details:h.details||void 0,quantity:1,unit:h.unit,unitPriceNet:h.unitPriceNet,vatRate:h.vatRate},k=t.lines.findIndex(E=>!E.description.trim()&&!(E.sku??"").trim()&&!(E.details??"").trim()&&E.unitPriceNet===0);k>=0?t.lines[k]=v:t.lines.push(v),t.dirty=!0}r(!0)}),e.querySelectorAll("[data-del]").forEach(d=>d.addEventListener("click",()=>{a(),t.dirty=!0,t.lines.splice(Number(d.dataset.del),1),t.lines.length===0&&t.lines.push(H()),r(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{y(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&y(!0)})}async function y(m){if(!f){f=!0;try{a(),t.error="";const L={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(oe,t.employee.trim())}catch{}let d;t.draftId?d=await $.update(t.draftId,L):(d=await $.create(L),t.draftId=d.id),m&&(d=await $.issue(d.id));try{localStorage.removeItem(O)}catch{}location.hash=`#/invoices/${d.id}`}catch(d){t.error=d.message,r()}}finally{f=!1}}}e.addEventListener("input",()=>{try{P()}catch{}});function P(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const E=k.dataset.p==="seller"?t.seller:t.buyer;E[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[E,q]=k.dataset.l.split("."),A=t.lines[Number(E)];A&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"||q==="discountPercent"?A[q]=Number(k.value):A[q]=k.value)});const m=k=>e.querySelector(`#${k}`)?.value??"",L=m("w-issue"),d=m("w-delivery"),h=m("w-delivery-to");L&&(t.issueDate=L),d&&(t.deliveryDate=h&&h!==d?`${d}..${h}`:d),e.querySelector("#w-due")&&(t.dueDate=m("w-due")),Q(t),e.querySelector("#w-employee")&&(t.employee=m("w-employee"));const v=m("w-title");if(v&&(t.documentTitle=v),e.querySelector("#w-skonto")){const k=Number(m("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=m("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,w()}r()}const Oe=document.querySelector("#app");function je(e){const n=!!V(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];Oe.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([s,c])=>`<a href="${s}" class="${e===s||s==="#/"&&e.startsWith("#/invoices")?"active":""}">${c}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function de(){const e=location.hash||"#/";je(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await $e(n):e==="#/new"?ne(n):e.startsWith("#/edit/")?ne(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ke(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await qe(n):e==="#/company"?await pe(n):e==="#/customers"?await ve(n):e==="#/products"?await Ee(n):e==="#/backup"?await me(n):e==="#/login"?Se(n):e==="#/logout"?Te():e==="#/status"?await Le(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{de()});de();
