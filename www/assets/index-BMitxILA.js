(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))i(c);new MutationObserver(c=>{for(const o of c)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function t(c){const o={};return c.integrity&&(o.integrity=c.integrity),c.referrerPolicy&&(o.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?o.credentials="include":c.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(c){if(c.ep)return;c.ep=!0;const o=t(c);fetch(c.href,o)}})();const I="einv-token";function C(){try{return localStorage.getItem(I)}catch{return null}}function F(e){try{e?localStorage.setItem(I,e):localStorage.removeItem(I)}catch{}}async function S(e,n){const t=await T(e,{headers:{"content-type":"application/json"},...n});if(!t.ok){const i=await t.json().catch(()=>({}));throw new Error(i.error??`HTTP ${t.status}`)}return await t.json()}async function T(e,n){const t={...n?.headers??{}},i=C();i&&(t.authorization=`Bearer ${i}`);const c=await fetch(e,{...n,headers:t});if(c.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return c}async function z(e,n){const t=await T(e);if(!t.ok){const d=await t.json().catch(()=>({}));throw new Error(d.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const i=await t.blob(),c=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(i),o.download=c?.[1]??n,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function ne(e){const n=await T(e);if(!n.ok){const c=await n.json().catch(()=>({}));throw new Error(c.error??`Öffnen fehlgeschlagen (HTTP ${n.status})`)}const t=await n.blob(),i=URL.createObjectURL(t);window.open(i,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(i),6e4)}const $={health:()=>S("/api/health"),list:(e={})=>{const n=new URLSearchParams(e).toString();return S(`/api/invoices${n?`?${n}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(n)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),setPaid:(e,n,t)=>S(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:n,paidAt:t})}),storno:(e,n)=>S(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:n})}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,n)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(n)})},customers:{list:()=>S("/api/customers"),create:(e,n)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:n})}),update:(e,n)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>S("/api/customers/number-assign",{method:"POST"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,n)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(n)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const n=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${n?`?${n}`:""}`}};function s(e){return String(e??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]??n)}function L(e){return`${Number(e).toFixed(2)} EUR`}function O(e){return e.split("/").pop()??e}async function se(e){e.innerHTML='<div class="card">Lade Backups…</div>';let n=[],t="",i=!1;async function c(){const d=await T("/api/backups");if(!d.ok)throw new Error("Backups konnten nicht geladen werden");n=await d.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${i?"error":""}">${s(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${n.map(d=>`<div class="row" style="margin-top:8px">
				<strong>${s(O(d.filename))}</strong>
				<span class="muted">${s(d.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(d.size/1024)} KB</span>
				<button class="secondary" data-dl="${s(d.filename)}">Download</button>
				<button class="secondary" data-restore="${s(d.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const d=await T("/api/backups",{method:"POST"});if(!d.ok)throw new Error((await d.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const y=await d.json();t=`Gesichert: ${O(y.filename)}`,i=!1,await c()}catch(d){t=d.message,i=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(d=>d.addEventListener("click",async()=>{const y=d.dataset.dl??"";try{await z(`/api/backups/file/${O(y)}`,O(y))}catch(v){t=v.message,i=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(d=>d.addEventListener("click",async()=>{const y=d.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${O(y)}? Die aktuelle Datenbank wird ersetzt.`))try{const v=await T("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:y})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const l=await v.json();t=`Wiederhergestellt: ${l.invoices} Rechnungen, ${l.templates} Vorlagen${l.fileErrors.length>0?` (${l.fileErrors.length} Dateifehler)`:""}`,i=!1,await c()}catch(v){t=v.message,i=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const d=e.querySelector("#b-file")?.files?.[0];if(!d){t="Bitte zuerst eine ZIP-Datei wählen",i=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${d.name}? Die aktuelle Datenbank wird ersetzt.`))try{const y=await new Promise((b,a)=>{const r=new FileReader;r.onload=()=>b(String(r.result).split(",")[1]),r.onerror=()=>a(new Error("Datei nicht lesbar")),r.readAsDataURL(d)}),v=await T("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:y})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const l=await v.json();t=`Wiederhergestellt: ${l.invoices} Rechnungen, ${l.templates} Vorlagen`,i=!1,await c()}catch(y){t=y.message,i=!0,o()}})}try{await c()}catch(d){e.innerHTML=`<div class="card error">${s(d.message)}</div>`}}const J=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,n,t){const i=e[n],c=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${n}" value="${s(c)}" /></label>`}async function ie(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let n=null,t="",i=!1;try{n=await $.company.getDefault(),n||(n=(await $.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${s(o.message)}</div>`;return}function c(){const o=n?.profile??J();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
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
			${[0,1,2,3].map(d=>`<div class="grid2"><label>Box ${d+1}<textarea data-fbox="${d}" rows="3">${s((o.footerBoxes??[])[d]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${d}">
					${["left","center","right"].map(y=>`<option value="${y}" ${(o.footerAlign??[])[d]===y||!(o.footerAlign??[])[d]&&y==="left"?"selected":""}>${y==="left"?"Links":y==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${i?"error":""}">${s(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const d={...J()};e.querySelectorAll("input[data-f]").forEach(l=>{d[l.dataset.f]=l.value});const y=[0,1,2,3].map(l=>e.querySelector(`textarea[data-fbox="${l}"]`)?.value??"");y.some(l=>l.trim()!=="")?(d.footerBoxes=y,d.footerAlign=[0,1,2,3].map(l=>{const b=e.querySelector(`select[data-falign="${l}"]`)?.value;return b==="center"||b==="right"?b:"left"})):(delete d.footerBoxes,delete d.footerAlign);const v=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{n?n=await $.company.update(n.id,{name:v,profile:d}):n=await $.company.create(v,d),t="Gespeichert.",i=!1,c()}catch(l){t=l.message,i=!0,c()}})}c()}const V=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function R(e,n,t){const i=e[n],c=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${n}" value="${s(c)}" /></label>`}async function re(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let n=[],t=null,i=!1,c="",o=!1;async function d(){n=await $.customers.list(),v()}function y(b,a){return`
		<label>Name (Anzeige)<input id="k-name" value="${s(a)}" /></label>
		${R(b,"name","Firmenname")}
		${R(b,"street","Straße")}
		<div class="grid2">${R(b,"zip","PLZ")}${R(b,"city","Ort")}</div>
		<div class="grid2">${R(b,"country","Land")}${R(b,"email","E-Mail")}</div>
		<div class="grid2">${R(b,"phone","Telefon")}${R(b,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${s(b.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function v(){const b=n.filter(a=>!a.profile.customerNumber?.trim()).length;e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button>
			${b>0?`<button class="secondary" id="k-number">${b} ohne Nummer: automatisch vergeben</button>`:""}
		</div>
			${n.map(a=>`<div class="row" style="margin-top:8px">
				<strong>${s(a.name)}</strong>
				${a.profile.customerNumber?.trim()?`<span class="badge">${s(a.profile.customerNumber)}</span>`:'<span class="badge cancelled">keine Nummer</span>'}
				<span class="muted">${s(a.profile.city||"")}</span>
				<button class="secondary" data-edit="${a.id}">Bearbeiten</button>
				<button class="danger" data-del="${a.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||i?`<div class="card"><h3>${i?"Neuer Kunde":s(t?.name??"")}</h3>
			${y(t?.profile??V(),t?.name??"")}
			${c?`<p class="${o?"error":""}">${s(c)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-number")?.addEventListener("click",async()=>{try{c=`${await $.customers.assignNumbers()} Kundennummer(n) vergeben.`,o=!1,await d()}catch(a){c=a.message,o=!0,v()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,i=!0,c="",v()}),e.querySelectorAll("[data-edit]").forEach(a=>a.addEventListener("click",()=>{t=n.find(r=>r.id===a.dataset.edit)??null,i=!1,c="",v()})),e.querySelectorAll("[data-del]").forEach(a=>a.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(a.dataset.del??""),await d()}catch(r){c=r.message,o=!0,v()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,i=!1,c="",v()}),e.querySelector("#k-save")?.addEventListener("click",()=>{l()})}async function l(){const b={...V()};e.querySelectorAll("input[data-f]").forEach(r=>{b[r.dataset.f]=r.value});const a=e.querySelector("#k-name")?.value.trim()||b.name.trim()||"Kunde";try{i?await $.customers.create(a,b):t&&await $.customers.update(t.id,{name:a,profile:b}),t=null,i=!1,c="",await d()}catch(r){c=r.message,o=!0,v()}}try{await d()}catch(b){e.innerHTML=`<div class="card error">${s(b.message)}</div>`}}function le(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function oe(e){return`<span class="badge ${e}">${e}</span>`}async function ce(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const n=e.querySelector("#f-status"),t=e.querySelector("#f-q"),i=e.querySelector("#list"),c=e.querySelector("#list-err");let o=0;function d(a){c.innerHTML=`<div class="card error">${s(a.message)}</div>`}async function y(a){const r=a.dataset.paid??"",m=a.checked;a.disabled=!0;try{await $.setPaid(r,m),c.innerHTML=`<div class="card muted">${m?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await l()}catch(p){a.checked=!m,d(p)}finally{a.disabled=!1}}async function v(a){const r=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(r!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:m}=await $.storno(a,r.trim()||void 0);location.hash=`#/edit/${m.id}`,location.reload()}catch(m){d(m)}}async function l(){const a=++o,r={};n.value&&(r.status=n.value),t.value.trim()&&(r.q=t.value.trim());try{const m=await $.list(r);if(a!==o)return;i.innerHTML=m.map(p=>`<div class="card"><div class="row">
					${p.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${p.paid?`Ausgeglichen am ${s((p.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${s(p.id)}" ${p.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${s(p.number??"(Entwurf)")}</strong>${oe(p.status)}
					<span>${s(p.buyer.name||"—")}</span>
					<span>${L(p.totals.grossTotal)}</span>
					${p.skontoPercent>0&&!p.paid?`<span class="muted">${L(p.totals.grossTotal-le(p))} bei ${s(p.skontoPercent)} % Skonto</span>`:""}
					${p.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					<a href="#/invoices/${s(p.id)}">Ansehen</a>
					${p.status==="draft"?`<a href="#/edit/${s(p.id)}">Bearbeiten</a>`:""}
					${p.status==="issued"?`<button class="secondary" data-storno="${s(p.id)}">Storno</button>`:""}
					${p.pdfPath?`<button class="secondary" data-dl="pdf:${s(p.id)}:${s(p.number??"rechnung")}">PDF ↓</button>`:""}
					${p.xml?`<button class="secondary" data-dl="xml:${s(p.id)}:${s(p.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',i.querySelectorAll("[data-paid]").forEach(p=>p.addEventListener("change",()=>{y(p)})),i.querySelectorAll("[data-storno]").forEach(p=>p.addEventListener("click",()=>{v(p.dataset.storno??"")})),i.querySelectorAll("[data-dl]").forEach(p=>p.addEventListener("click",async()=>{const[N,f,E]=(p.dataset.dl??"").split(":"),u=N==="pdf"?$.pdfUrl(f):$.xmlUrl(f);try{await z(u,`${E}.${N}`)}catch(h){d(h)}}))}catch(m){if(a!==o)return;i.innerHTML=`<div class="card error">${s(m.message)}</div>`}}n.onchange=()=>{l()};let b;t.oninput=()=>{b!==void 0&&clearTimeout(b),b=setTimeout(()=>{l()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const a={};n.value&&(a.status=n.value),t.value.trim()&&(a.q=t.value.trim());try{await z($.exportUrl(a),"export.xlsx")}catch(r){d(r)}}),await l()}function U(e){return Math.round((e+Number.EPSILON)*100)/100}function de(e){const n=(e??"").trim(),[t,i]=n.split(".."),c=o=>/^\d{4}-\d{2}-\d{2}$/.test(o??"")?`${o.slice(8,10)}.${o.slice(5,7)}.${o.slice(0,4)}`:o??"";return i?`${c(t)} – ${c(i)}`:c(t)}async function ue(e,n){e.innerHTML='<div class="card">Lade…</div>';try{let i=await $.get(n);const o=(Array.isArray(i.lines)?i.lines:[]).map(l=>{const b=Math.min(Math.max(Number(l.discountPercent)||0,0),100),a=Number(l.quantity)||0,r=Number(l.unitPriceNet)||0;return{line:l,discount:b,gross:U(a*r),net:U(a*r*(1-b/100))}}),d=o.some(l=>l.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${s(i.number??"(Entwurf)")}</strong>
				<span class="badge ${i.status}">${i.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${s(i.seller.name)}<br />${s(i.seller.street)}<br />${s(i.seller.zip)} ${s(i.seller.city)}</div>
				<div><strong>Käufer</strong><br />${s(i.buyer.name)}<br />${s(i.buyer.street)}<br />${s(i.buyer.zip)} ${s(i.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${s(i.issueDate)} · Leistung: ${s(de(i.deliveryDate))}${i.dueDate?` · Fällig: ${s(i.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${d?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${o.map((l,b)=>`<tr>
					<td>${b+1}</td><td>${s(l.line.description)}${l.line.sku?` (${s(l.line.sku)})`:""}</td>
					<td class="r">${s(l.line.quantity)} ${s(l.line.unit)}</td>
					<td class="r">${L(Number(l.line.unitPriceNet))}</td>
					${d?`<td class="r">${l.discount>0?`${s(l.discount)} %`:"–"}</td><td class="r">${l.discount>0?L(U(l.gross-l.net)):"–"}</td>`:""}
					<td class="r">${s(l.line.vatRate)} %</td><td class="r"><strong>${L(l.net)}</strong></td>
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
			</div><div id="d-out"></div></div>`;const y=e.querySelector("#d-out"),v=l=>{y.innerHTML=`<p class="error">${s(l.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(l=>l.addEventListener("click",async()=>{const b=l.dataset.dl,a=b==="pdf"?$.pdfUrl(i.id):b==="xml"?$.xmlUrl(i.id):$.xlsxUrl(i.id);try{await z(a,`${i.number??"rechnung"}.${b}`)}catch(r){v(r)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ne($.pdfUrl(i.id))}catch(l){v(l)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{y.innerHTML='<p class="muted">Validiere…</p>';try{const l=await $.validate(i.id);y.innerHTML=l.formatErrors.length+l.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...l.formatErrors,...l.businessErrors].map(b=>`<li class="error">${s(b)}</li>`).join("")}</ul>`}catch(l){y.innerHTML=`<p class="error">${s(l.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async l=>{const b=l.target,a=b.checked;b.disabled=!0;try{i=await $.setPaid(i.id,a),y.innerHTML=`<p style="color:var(--ok)">${a?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(r){b.checked=!a,y.innerHTML=`<p class="error">${s(r.message)}</p>`}finally{b.disabled=!1}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const l=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(l!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:b}=await $.storno(i.id,l.trim()||void 0);location.hash=`#/edit/${b.id}`,location.reload()}catch(b){y.innerHTML=`<p class="error">${s(b.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const l=await $.issue(i.id);location.hash=`#/invoices/${l.id}`,location.reload()}catch(l){y.innerHTML=`<p class="error">${s(l.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${s(t.message)}</div>`}}function me(e){const n=C();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${s(n??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${n?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";F(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{F(null),location.hash="#/login",location.reload()})}function pe(){F(null),location.hash="#/login"}async function he(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let n=[],t=null,i=!1,c="",o=!1;async function d(){n=await $.products.list(),v()}function y(a){const r=m=>s(m??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${r(a.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${r(a.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${r(a.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${r(a.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${a.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(m=>`<option ${m===(a.vatRate??19)?"selected":""}>${m}</option>`).join("")}
		</select></label>`}function v(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${n.map(a=>`<div class="row" style="margin-top:8px">
				<strong>${s(a.sku?`${a.sku} · `:"")}${s(a.name)}</strong>
				<span class="muted">${s(a.unit)} · ${Number(a.unitPriceNet).toFixed(2)} EUR · ${a.vatRate} %</span>
				<button class="secondary" data-edit="${a.id}">Bearbeiten</button>
				<button class="danger" data-del="${a.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||i?`<div class="card"><h3>${i?"Neue Position":s(t?.name??"")}</h3>
			${y(t??{})}
			${c?`<p class="${o?"error":""}">${s(c)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,i=!0,c="",v()}),e.querySelectorAll("[data-edit]").forEach(a=>a.addEventListener("click",()=>{t=n.find(r=>r.id===a.dataset.edit)??null,i=!1,c="",v()})),e.querySelectorAll("[data-del]").forEach(a=>a.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(a.dataset.del??""),await d()}catch(r){c=r.message,o=!0,v()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,i=!1,c="",v()}),e.querySelector("#p-save")?.addEventListener("click",()=>{b()})}function l(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function b(){const a=l();try{i?await $.products.create(a):t&&await $.products.update(t.id,a),t=null,i=!1,c="",await d()}catch(r){c=r.message,o=!0,v()}}try{await d()}catch(a){e.innerHTML=`<div class="card error">${s(a.message)}</div>`}}async function fe(e){try{const n=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${s(n.version)} · Schema: ${s(String(n.schemaVersion))}</p>
			<pre class="dump">${s(JSON.stringify(n.counts,null,2))}</pre></div>`}catch(n){e.innerHTML=`<div class="card error">API nicht erreichbar: ${s(n.message)}</div>`}}const be=["title","meta","parties","positions","totals"],W=["payment","notes"];async function ve(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let n=[],t=null,i="",c=[];try{const a=await T("/api/company-profiles");a.ok&&(c=await a.json())}catch{}async function o(){n=await d(),v()}async function d(){const a=await T("/api/templates");if(!a.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await a.json()}function y(a){const r=a.definition,m=(p,N,f)=>`<label><input type="checkbox" data-f="blocks.${p}" ${r.blocks[p]?"checked":""} ${f?"disabled":""} style="width:auto" /> ${N}${f?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${s(a.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${c.map(p=>`<option value="${s(p.id)}" ${a.definition.companyId===p.id?"selected":""}>${s(p.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${s(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${s(r.colors.text)}" /></label>
		</div>
		${be.map(p=>m(p,`Block ${p}`,!0)).join("")}
		${W.map(p=>m(p,`Block ${p}`,!1)).join("")}
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
			<label>Unterschrift (Name)<input id="t-sign" value="${s(r.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${s(r.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${s(r.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(p=>`<option ${r.logo?.position===p?"selected":""}>${p}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${s(r.logo.path)}</p>`:""}`}function v(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${n.map(a=>`<div class="row" style="margin-top:8px">
				<strong>${s(a.name)}</strong><span class="muted">v${a.version}</span>
				${a.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${a.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${a.id}">Vorschau</button>
				${a.isDefault?"":`<button class="secondary" data-def="${a.id}">Standard</button>`}
				${a.isDefault?"":`<button class="danger" data-del="${a.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${s(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${y(t)}
			${i?`<p class="error">${s(i)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const m=(await(await T("/api/templates")).json())[0];if(!m){i="Keine Basisvorlage vorhanden",v();return}t={...structuredClone(m),id:"neu",name:"Neu",version:1,isDefault:!1},i="",v()}catch(a){i=a.message,v()}}),e.querySelectorAll("[data-edit]").forEach(a=>a.addEventListener("click",()=>{const r=n.find(m=>m.id===a.dataset.edit);r&&(t=structuredClone(r),i="",v())})),e.querySelectorAll("[data-prev]").forEach(a=>a.addEventListener("click",async()=>{const r=n.find(m=>m.id===a.dataset.prev);if(r)try{const m=await T("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!m.ok){const N=await m.json().catch(()=>({}));throw new Error(N.error??"Vorschau fehlgeschlagen")}const p=await m.blob();window.open(URL.createObjectURL(p),"_blank")}catch(m){i=m.message,v()}})),e.querySelectorAll("[data-def]").forEach(a=>a.addEventListener("click",async()=>{try{if(!(await T(`/api/templates/${a.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(r){i=r.message,v()}})),e.querySelectorAll("[data-del]").forEach(a=>a.addEventListener("click",async()=>{const r=await T(`/api/templates/${a.dataset.del}`,{method:"DELETE"});if(!r.ok){i=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",v();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,i="",v()}),e.querySelector("#t-save")?.addEventListener("click",()=>{b()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const a=l();if(a)try{const r=await T("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:a.definition})});if(!r.ok){const m=await r.json().catch(()=>({}));throw new Error(m.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){i=r.message,v()}})}function l(){if(!t)return null;const a=structuredClone(t.definition);a.name=(e.querySelector("#t-name")?.value??a.name).trim(),a.colors.primary=e.querySelector("#t-c1")?.value??a.colors.primary,a.colors.text=e.querySelector("#t-c2")?.value??a.colors.text;for(const m of W)a.blocks[m]=e.querySelector(`[data-f="blocks.${m}"]`)?.checked??a.blocks[m];for(const m of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])a[m]=e.querySelector(`[data-f="${m}"]`)?.checked??!1;a.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?a.companyId=r:delete a.companyId,a.introText=e.querySelector("#t-intro")?.value??"",a.closingText=e.querySelector("#t-closing")?.value??"",a.signatureName=e.querySelector("#t-sign")?.value??"",a.headerExtra=e.querySelector("#t-hextra")?.value??"",a.logo&&(a.logo.position=e.querySelector("#t-lpos")?.value??"right",a.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:a.name,definition:a}}async function b(){const a=l();if(!a)return;const r=a.definition;try{let m=t.id;if(m==="neu"){const N=await T("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");m=(await N.json()).id}else{const N=await T(`/api/templates/${m}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const p=e.querySelector("#t-logo")?.files?.[0];if(p){const N=await new Promise((E,u)=>{const h=new FileReader;h.onload=()=>E(String(h.result).split(",")[1]),h.onerror=()=>u(new Error("Datei nicht lesbar")),h.readAsDataURL(p)}),f=await T(`/api/templates/${m}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:p.name,mime:p.type,dataBase64:N})});if(!f.ok)throw new Error((await f.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,i="",await o()}catch(m){i=m.message,v()}}try{await o()}catch(a){e.innerHTML=`<div class="card error">${s(a.message)}</div>`}}const Z=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),B=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19});function M(e){return Math.round((e+Number.EPSILON)*100)/100}function X(e){const n=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,i=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(n*t*(1-i/100))}function ye(e){return(e??"").trim().split("..")[0]??""}function ge(e){const n=(e??"").trim().split("..");return n.length>1?n[1]:""}const j="einv-wizard-v1",ee="einv-employee";function te(){try{return localStorage.getItem(ee)??""}catch{return""}}function _(){return new Date().toISOString().slice(0,10)}function K(){return{step:0,seller:Z(),buyer:Z(),lines:[B()],issueDate:_(),deliveryDate:_(),dueDate:"",employee:te(),documentTitle:"Rechnung",notes:"",skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function H(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(n=>n.description.trim()!==""||n.unitPriceNet!==0))}function $e(){try{const e=localStorage.getItem(j);if(!e)return null;const n=JSON.parse(e);return!n||!Array.isArray(n.lines)||!n.seller||!n.buyer?null:{...K(),...n,error:"",step:Math.min(Number(n.step)||0,3)}}catch{return null}}function Y(e,n,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${s(n.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${s(n.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const we=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],ke={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function Q(e,n){let t=K();const i=!!n;let c=[],o=[],d=[],y=!1;if(n){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(n).then(f=>{if(f.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${s(f.status)}).</div>`;return}t={...K(),seller:f.seller,buyer:f.buyer,lines:f.lines.length>0?f.lines:[B()],issueDate:f.issueDate,deliveryDate:f.deliveryDate,dueDate:f.dueDate??"",employee:f.employeeCode??te(),documentTitle:f.documentTitle,notes:f.notes??"",skontoPercent:f.skontoPercent??0,skontoDueDate:f.skontoDueDate??"",draftId:f.id},l(),m()}).catch(f=>{e.innerHTML=`<div class="card error">${s(f.message)}</div>`});return}const v=$e();if(v&&H(v)&&!v.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${s(v.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=v,l(),m()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(j),l(),m()});return}v&&H(v)&&(t=v),l(),H(t)||$.company.getDefault().then(f=>{f&&!t.seller.name.trim()&&f.profile.name.trim()&&(t.seller={...t.seller,...f.profile},t.selectedCompany=f.id,m(!0))}).catch(()=>{});function l(){$.company.list().then(f=>{c=f,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&m()}).catch(()=>{}),$.customers.list().then(f=>{o=f,t.step===1&&!e.querySelector("#w-customer")&&m()}).catch(()=>{}),$.products.list().then(f=>{d=f,t.step===2&&!e.querySelector("#w-catalog")&&m()}).catch(()=>{})}function b(){try{if(i)return;if(!t.dirty){localStorage.removeItem(j);return}localStorage.setItem(j,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function a(){e.querySelectorAll("input[data-p]").forEach(h=>{const w=h.dataset.p==="seller"?t.seller:t.buyer;w[h.dataset.f]=h.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(h=>{const[w,k]=h.dataset.l.split("."),P=t.lines[Number(w)];if(P)if(k==="quantity"||k==="unitPriceNet"||k==="vatRate"||k==="discountPercent"){const q=Number(h.value),A=Number.isFinite(q)?q:0;P[k]=k==="discountPercent"?Math.min(Math.max(A,0),100):A}else P[k]=h.value});const f=h=>e.querySelector(`#${h}`)?.value??"",E=()=>{const h=f("w-delivery");if(!h)return;const w=f("w-delivery-to");t.deliveryDate=w&&w!==h?`${h}..${w}`:h};t.issueDate=f("w-issue")||t.issueDate,E(),e.querySelector("#w-due")&&(t.dueDate=f("w-due")),e.querySelector("#w-employee")&&(t.employee=f("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=f("w-title")||t.documentTitle);const u=e.querySelector("#w-notes");if(u&&(t.notes=u.value),e.querySelector("#w-skonto")){const h=Number(f("w-skonto"));t.skontoPercent=Number.isFinite(h)?Math.min(Math.max(h,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=f("w-skonto-due")),b()}function r(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((E,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${E}</span>`).join("")}</div>`}function m(f=!1){f||a();let E="";if(t.step===0&&(E=`<div class="card"><h3>Verkäufer</h3>
				${c.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${c.map(u=>`<option value="${s(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${s(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("seller",t.seller,!0)}</div>`),t.step===1&&(E=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(u=>`<option value="${s(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${s(u.name)}${u.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("buyer",t.buyer,!1)}</div>`),t.step===2&&(E=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${we.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${d.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${d.map(u=>`<option value="${s(u.id)}">${s(u.sku?`${u.sku} · `:"")}${s(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,h)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${h+1}</span><strong>Position ${h+1}</strong>
						<span class="line-sum">${L(X(u))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${h}.description" value="${s(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${h}.sku" value="${s(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${h}.details" rows="1">${s(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${h}.quantity" type="number" min="0" step="any" value="${s(u.quantity)}" /></label>
						<label>Einheit<input data-l="${h}.unit" value="${s(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${h}.unitPriceNet" type="number" min="0" step="0.01" value="${s(u.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${h}.discountPercent" type="number" min="0" max="100" step="0.1" value="${s(u.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${h}.vatRate">
							${[19,7,0].map(w=>`<option ${w===Number(u.vatRate)?"selected":""}>${w}</option>`).join("")}
						</select></label>
						${Number(u.vatRate)===0?`<label>Steuerbefreiung<select data-l="${h}.exemptionCategory">
								${["E","AE","K","G","O"].map(w=>`<option ${(u.exemptionCategory??"E")===w?"selected":""} value="${w}">${w} — ${ke[w]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${h}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${s(u.exemptionReason)}</textarea></label>`:""}
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
						<label>von<input id="w-delivery" type="date" value="${s(ye(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${s(ge(t.deliveryDate))}" /></label>
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
			</div>`),t.step===3){const u=t.lines.map(g=>{const D=Math.min(Math.max(Number(g.discountPercent)||0,0),100);return{...g,discount:D,gross:M((Number(g.quantity)||0)*(Number(g.unitPriceNet)||0)),net:X(g)}}).filter(g=>g.description.trim()!==""||g.gross>0),h=new Map;for(const g of u)h.set(Number(g.vatRate)||0,M((h.get(Number(g.vatRate)||0)??0)+g.net));const w=[...h.entries()].sort(([g],[D])=>g-D).map(([g,D])=>({rate:g,net:D,tax:M(D*g/100)})),k=M(w.reduce((g,D)=>g+D.net,0)),P=M(w.reduce((g,D)=>g+D.tax,0)),q=M(k+P),A=M(q*(Number(t.skontoPercent)||0)/100),G=u.some(g=>g.discount>0);E=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${s(t.documentTitle)}</strong> · ${s(t.seller.name||"—")} → ${s(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${G?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(g=>`<tr>
							<td>${s(g.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${s(g.quantity)} ${s(g.unit)}</td>
							<td class="r">${L(g.unitPriceNet)}</td>
							${G?`<td class="r">${g.discount>0?`${s(g.discount)} %`:"–"}</td><td class="r">${g.discount>0?L(M(g.gross-g.net)):"–"}</td>`:""}
							<td class="r">${s(g.vatRate)} %</td><td class="r"><strong>${L(g.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${L(k)}</td></tr>
						${w.map(g=>`<tr class="sub"><td class="lbl">USt ${s(g.rate)} % auf ${L(g.net)}</td><td class="r">${L(g.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${L(q)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${s(t.skontoPercent)} % Skonto bis ${s(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${L(A)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${L(q-A)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${r()}${E}
			${t.error?`<div class="card error">${s(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,m()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",h=c.find(w=>w.id===u);h?(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,m(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",h=o.find(w=>w.id===u);h?(t.buyer={...t.buyer,...h.profile},t.selectedCustomer=h.id,m(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,m()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(j),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{a(),t.dirty=!0,t.lines.push(B()),m()}),e.querySelector("#w-take")?.addEventListener("click",()=>{a();const u=e.querySelector("#w-catalog")?.value??"",h=d.find(w=>w.id===u);if(h){const w={description:h.name,sku:h.sku||void 0,details:h.details||void 0,quantity:1,unit:h.unit,unitPriceNet:h.unitPriceNet,vatRate:h.vatRate},k=t.lines.findIndex(P=>!P.description.trim()&&!(P.sku??"").trim()&&!(P.details??"").trim()&&P.unitPriceNet===0);k>=0?t.lines[k]=w:t.lines.push(w),t.dirty=!0}m(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{a(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(B()),m(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{p(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&p(!0)})}async function p(f){if(!y){y=!0;try{a(),t.error="";const E={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(ee,t.employee.trim())}catch{}let u;t.draftId?u=await $.update(t.draftId,E):(u=await $.create(E),t.draftId=u.id),f&&(u=await $.issue(u.id));try{localStorage.removeItem(j)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,m()}}finally{y=!1}}}e.addEventListener("input",()=>{try{N()}catch{}});function N(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const P=k.dataset.p==="seller"?t.seller:t.buyer;P[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[P,q]=k.dataset.l.split("."),A=t.lines[Number(P)];A&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"||q==="discountPercent"?A[q]=Number(k.value):A[q]=k.value)});const f=k=>e.querySelector(`#${k}`)?.value??"",E=f("w-issue"),u=f("w-delivery"),h=f("w-delivery-to");E&&(t.issueDate=E),u&&(t.deliveryDate=h&&h!==u?`${u}..${h}`:u),e.querySelector("#w-due")&&(t.dueDate=f("w-due")),e.querySelector("#w-employee")&&(t.employee=f("w-employee"));const w=f("w-title");if(w&&(t.documentTitle=w),e.querySelector("#w-skonto")){const k=Number(f("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=f("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,b()}m()}const Se=document.querySelector("#app");function Ee(e){const n=!!C(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[n?"#/logout":"#/login",n?"Logout":"Login"]];Se.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([i,c])=>`<a href="${i}" class="${e===i||i==="#/"&&e.startsWith("#/invoices")?"active":""}">${c}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function ae(){const e=location.hash||"#/";Ee(e);const n=document.querySelector("#view");e==="#/"||e==="#"?await ce(n):e==="#/new"?Q(n):e.startsWith("#/edit/")?Q(n,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ue(n,decodeURIComponent(e.slice(11))):e==="#/templates"?await ve(n):e==="#/company"?await ie(n):e==="#/customers"?await re(n):e==="#/products"?await he(n):e==="#/backup"?await se(n):e==="#/login"?me(n):e==="#/logout"?pe():e==="#/status"?await fe(n):n.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{ae()});ae();
