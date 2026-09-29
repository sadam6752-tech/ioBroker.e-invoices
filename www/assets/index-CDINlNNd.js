(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))i(c);new MutationObserver(c=>{for(const o of c)if(o.type==="childList")for(const d of o.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&i(d)}).observe(document,{childList:!0,subtree:!0});function t(c){const o={};return c.integrity&&(o.integrity=c.integrity),c.referrerPolicy&&(o.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?o.credentials="include":c.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(c){if(c.ep)return;c.ep=!0;const o=t(c);fetch(c.href,o)}})();const I="einv-token";function C(){try{return localStorage.getItem(I)}catch{return null}}function F(e){try{e?localStorage.setItem(I,e):localStorage.removeItem(I)}catch{}}async function S(e,a){const t=await T(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const i=await t.json().catch(()=>({}));throw new Error(i.error??`HTTP ${t.status}`)}return await t.json()}async function T(e,a){const t={...a?.headers??{}},i=C();i&&(t.authorization=`Bearer ${i}`);const c=await fetch(e,{...a,headers:t});if(c.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return c}async function z(e,a){const t=await T(e);if(!t.ok){const d=await t.json().catch(()=>({}));throw new Error(d.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const i=await t.blob(),c=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(i),o.download=c?.[1]??a,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function ne(e){const a=await T(e);if(!a.ok){const c=await a.json().catch(()=>({}));throw new Error(c.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),i=URL.createObjectURL(t);window.open(i,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(i),6e4)}const $={health:()=>S("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return S(`/api/invoices${a?`?${a}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),setPaid:(e,a,t)=>S(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:a,paidAt:t})}),storno:(e,a)=>S(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:a})}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,a)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>S("/api/customers"),create:(e,a)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function L(e){return`${Number(e).toFixed(2)} EUR`}function O(e){return e.split("/").pop()??e}async function se(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",i=!1;async function c(){const d=await T("/api/backups");if(!d.ok)throw new Error("Backups konnten nicht geladen werden");a=await d.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${i?"error":""}">${n(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(d=>`<div class="row" style="margin-top:8px">
				<strong>${n(O(d.filename))}</strong>
				<span class="muted">${n(d.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(d.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(d.filename)}">Download</button>
				<button class="secondary" data-restore="${n(d.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const d=await T("/api/backups",{method:"POST"});if(!d.ok)throw new Error((await d.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const y=await d.json();t=`Gesichert: ${O(y.filename)}`,i=!1,await c()}catch(d){t=d.message,i=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(d=>d.addEventListener("click",async()=>{const y=d.dataset.dl??"";try{await z(`/api/backups/file/${O(y)}`,O(y))}catch(b){t=b.message,i=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(d=>d.addEventListener("click",async()=>{const y=d.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${O(y)}? Die aktuelle Datenbank wird ersetzt.`))try{const b=await T("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:y})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const l=await b.json();t=`Wiederhergestellt: ${l.invoices} Rechnungen, ${l.templates} Vorlagen${l.fileErrors.length>0?` (${l.fileErrors.length} Dateifehler)`:""}`,i=!1,await c()}catch(b){t=b.message,i=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const d=e.querySelector("#b-file")?.files?.[0];if(!d){t="Bitte zuerst eine ZIP-Datei wählen",i=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${d.name}? Die aktuelle Datenbank wird ersetzt.`))try{const y=await new Promise((m,s)=>{const r=new FileReader;r.onload=()=>m(String(r.result).split(",")[1]),r.onerror=()=>s(new Error("Datei nicht lesbar")),r.readAsDataURL(d)}),b=await T("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:y})});if(!b.ok)throw new Error((await b.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const l=await b.json();t=`Wiederhergestellt: ${l.invoices} Rechnungen, ${l.templates} Vorlagen`,i=!1,await c()}catch(y){t=y.message,i=!0,o()}})}try{await c()}catch(d){e.innerHTML=`<div class="card error">${n(d.message)}</div>`}}const J=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,a,t){const i=e[a],c=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${a}" value="${n(c)}" /></label>`}async function ie(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",i=!1;try{a=await $.company.getDefault(),a||(a=(await $.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${n(o.message)}</div>`;return}function c(){const o=a?.profile??J();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${x(o,"name","Firmenname")}
			${x(o,"street","Straße")}
			<div class="grid2">${x(o,"zip","PLZ")}${x(o,"city","Ort")}</div>
			<div class="grid2">${x(o,"country","Land")}${x(o,"email","E-Mail")}</div>
			<div class="grid2">${x(o,"phone","Telefon")}${x(o,"website","Webseite")}</div>
			<div class="grid2">${x(o,"vatId","USt-IdNr.")}${x(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${x(o,"bankName","Bankname")}${x(o,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(o.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(d=>`<div class="grid2"><label>Box ${d+1}<textarea data-fbox="${d}" rows="3">${n((o.footerBoxes??[])[d]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${d}">
					${["left","center","right"].map(y=>`<option value="${y}" ${(o.footerAlign??[])[d]===y||!(o.footerAlign??[])[d]&&y==="left"?"selected":""}>${y==="left"?"Links":y==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${i?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const d={...J()};e.querySelectorAll("input[data-f]").forEach(l=>{d[l.dataset.f]=l.value});const y=[0,1,2,3].map(l=>e.querySelector(`textarea[data-fbox="${l}"]`)?.value??"");y.some(l=>l.trim()!=="")?(d.footerBoxes=y,d.footerAlign=[0,1,2,3].map(l=>{const m=e.querySelector(`select[data-falign="${l}"]`)?.value;return m==="center"||m==="right"?m:"left"})):(delete d.footerBoxes,delete d.footerAlign);const b=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await $.company.update(a.id,{name:b,profile:d}):a=await $.company.create(b,d),t="Gespeichert.",i=!1,c()}catch(l){t=l.message,i=!0,c()}})}c()}const V=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function R(e,a,t){const i=e[a],c=Array.isArray(i)?i.join(`
`):i??"";return`<label>${t}<input data-f="${a}" value="${n(c)}" /></label>`}async function re(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,i=!1,c="",o=!1;async function d(){a=await $.customers.list(),b()}function y(m,s){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(s)}" /></label>
		${R(m,"name","Firmenname")}
		${R(m,"street","Straße")}
		<div class="grid2">${R(m,"zip","PLZ")}${R(m,"city","Ort")}</div>
		<div class="grid2">${R(m,"country","Land")}${R(m,"email","E-Mail")}</div>
		<div class="grid2">${R(m,"phone","Telefon")}${R(m,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(m.customerNumber)}" /></label>`}function b(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(m=>`<div class="row" style="margin-top:8px">
				<strong>${n(m.name)}</strong>
				<span class="muted">${n(m.profile.city||"")}</span>
				<button class="secondary" data-edit="${m.id}">Bearbeiten</button>
				<button class="danger" data-del="${m.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||i?`<div class="card"><h3>${i?"Neuer Kunde":n(t?.name??"")}</h3>
			${y(t?.profile??V(),t?.name??"")}
			${c?`<p class="${o?"error":""}">${n(c)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,i=!0,c="",b()}),e.querySelectorAll("[data-edit]").forEach(m=>m.addEventListener("click",()=>{t=a.find(s=>s.id===m.dataset.edit)??null,i=!1,c="",b()})),e.querySelectorAll("[data-del]").forEach(m=>m.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(m.dataset.del??""),await d()}catch(s){c=s.message,o=!0,b()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,i=!1,c="",b()}),e.querySelector("#k-save")?.addEventListener("click",()=>{l()})}async function l(){const m={...V()};e.querySelectorAll("input[data-f]").forEach(r=>{m[r.dataset.f]=r.value});const s=e.querySelector("#k-name")?.value.trim()||m.name.trim()||"Kunde";try{i?await $.customers.create(s,m):t&&await $.customers.update(t.id,{name:s,profile:m}),t=null,i=!1,c="",await d()}catch(r){c=r.message,o=!0,b()}}try{await d()}catch(m){e.innerHTML=`<div class="card error">${n(m.message)}</div>`}}function le(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function oe(e){return`<span class="badge ${e}">${e}</span>`}async function ce(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),i=e.querySelector("#list"),c=e.querySelector("#list-err");let o=0;function d(s){c.innerHTML=`<div class="card error">${n(s.message)}</div>`}async function y(s){const r=s.dataset.paid??"",p=s.checked;s.disabled=!0;try{await $.setPaid(r,p),c.innerHTML=`<div class="card muted">${p?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await l()}catch(h){s.checked=!p,d(h)}finally{s.disabled=!1}}async function b(s){const r=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(r!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:p}=await $.storno(s,r.trim()||void 0);location.hash=`#/edit/${p.id}`,location.reload()}catch(p){d(p)}}async function l(){const s=++o,r={};a.value&&(r.status=a.value),t.value.trim()&&(r.q=t.value.trim());try{const p=await $.list(r);if(s!==o)return;i.innerHTML=p.map(h=>`<div class="card"><div class="row">
					${h.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${h.paid?`Ausgeglichen am ${n((h.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${n(h.id)}" ${h.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${n(h.number??"(Entwurf)")}</strong>${oe(h.status)}
					<span>${n(h.buyer.name||"—")}</span>
					<span>${L(h.totals.grossTotal)}</span>
					${h.skontoPercent>0&&!h.paid?`<span class="muted">${L(h.totals.grossTotal-le(h))} bei ${n(h.skontoPercent)} % Skonto</span>`:""}
					${h.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					<a href="#/invoices/${n(h.id)}">Ansehen</a>
					${h.status==="draft"?`<a href="#/edit/${n(h.id)}">Bearbeiten</a>`:""}
					${h.status==="issued"?`<button class="secondary" data-storno="${n(h.id)}">Storno</button>`:""}
					${h.pdfPath?`<button class="secondary" data-dl="pdf:${n(h.id)}:${n(h.number??"rechnung")}">PDF ↓</button>`:""}
					${h.xml?`<button class="secondary" data-dl="xml:${n(h.id)}:${n(h.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',i.querySelectorAll("[data-paid]").forEach(h=>h.addEventListener("change",()=>{y(h)})),i.querySelectorAll("[data-storno]").forEach(h=>h.addEventListener("click",()=>{b(h.dataset.storno??"")})),i.querySelectorAll("[data-dl]").forEach(h=>h.addEventListener("click",async()=>{const[N,v,E]=(h.dataset.dl??"").split(":"),u=N==="pdf"?$.pdfUrl(v):$.xmlUrl(v);try{await z(u,`${E}.${N}`)}catch(f){d(f)}}))}catch(p){if(s!==o)return;i.innerHTML=`<div class="card error">${n(p.message)}</div>`}}a.onchange=()=>{l()};let m;t.oninput=()=>{m!==void 0&&clearTimeout(m),m=setTimeout(()=>{l()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const s={};a.value&&(s.status=a.value),t.value.trim()&&(s.q=t.value.trim());try{await z($.exportUrl(s),"export.xlsx")}catch(r){d(r)}}),await l()}function U(e){return Math.round((e+Number.EPSILON)*100)/100}function de(e){const a=(e??"").trim(),[t,i]=a.split(".."),c=o=>/^\d{4}-\d{2}-\d{2}$/.test(o??"")?`${o.slice(8,10)}.${o.slice(5,7)}.${o.slice(0,4)}`:o??"";return i?`${c(t)} – ${c(i)}`:c(t)}async function ue(e,a){e.innerHTML='<div class="card">Lade…</div>';try{let i=await $.get(a);const o=(Array.isArray(i.lines)?i.lines:[]).map(l=>{const m=Math.min(Math.max(Number(l.discountPercent)||0,0),100),s=Number(l.quantity)||0,r=Number(l.unitPriceNet)||0;return{line:l,discount:m,gross:U(s*r),net:U(s*r*(1-m/100))}}),d=o.some(l=>l.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${n(i.number??"(Entwurf)")}</strong>
				<span class="badge ${i.status}">${i.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${n(i.seller.name)}<br />${n(i.seller.street)}<br />${n(i.seller.zip)} ${n(i.seller.city)}</div>
				<div><strong>Käufer</strong><br />${n(i.buyer.name)}<br />${n(i.buyer.street)}<br />${n(i.buyer.zip)} ${n(i.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${n(i.issueDate)} · Leistung: ${n(de(i.deliveryDate))}${i.dueDate?` · Fällig: ${n(i.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${d?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${o.map((l,m)=>`<tr>
					<td>${m+1}</td><td>${n(l.line.description)}${l.line.sku?` (${n(l.line.sku)})`:""}</td>
					<td class="r">${n(l.line.quantity)} ${n(l.line.unit)}</td>
					<td class="r">${L(Number(l.line.unitPriceNet))}</td>
					${d?`<td class="r">${l.discount>0?`${n(l.discount)} %`:"–"}</td><td class="r">${l.discount>0?L(U(l.gross-l.net)):"–"}</td>`:""}
					<td class="r">${n(l.line.vatRate)} %</td><td class="r"><strong>${L(l.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${L(i.totals.grossTotal)}</strong> <span class="muted">(netto ${L(i.totals.netTotal)} + USt ${L(i.totals.taxTotal)})</span></p>
			${i.notes?`<p class="muted">Notiz: ${n(i.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${i.status==="draft"?`<a class="btn" href="#/edit/${n(i.id)}">Bearbeiten</a>`:""}
				${i.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${i.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${i.paid?"checked":""} /><span>bezahlt${i.paid&&i.paidAt?` (${n(i.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${i.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${i.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
				${i.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
				${i.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
				${i.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div></div>`;const y=e.querySelector("#d-out"),b=l=>{y.innerHTML=`<p class="error">${n(l.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(l=>l.addEventListener("click",async()=>{const m=l.dataset.dl,s=m==="pdf"?$.pdfUrl(i.id):m==="xml"?$.xmlUrl(i.id):$.xlsxUrl(i.id);try{await z(s,`${i.number??"rechnung"}.${m}`)}catch(r){b(r)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ne($.pdfUrl(i.id))}catch(l){b(l)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{y.innerHTML='<p class="muted">Validiere…</p>';try{const l=await $.validate(i.id);y.innerHTML=l.formatErrors.length+l.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...l.formatErrors,...l.businessErrors].map(m=>`<li class="error">${n(m)}</li>`).join("")}</ul>`}catch(l){y.innerHTML=`<p class="error">${n(l.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async l=>{const m=l.target,s=m.checked;m.disabled=!0;try{i=await $.setPaid(i.id,s),y.innerHTML=`<p style="color:var(--ok)">${s?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(r){m.checked=!s,y.innerHTML=`<p class="error">${n(r.message)}</p>`}finally{m.disabled=!1}}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const l=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(l!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:m}=await $.storno(i.id,l.trim()||void 0);location.hash=`#/edit/${m.id}`,location.reload()}catch(m){y.innerHTML=`<p class="error">${n(m.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const l=await $.issue(i.id);location.hash=`#/invoices/${l.id}`,location.reload()}catch(l){y.innerHTML=`<p class="error">${n(l.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function pe(e){const a=C();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";F(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{F(null),location.hash="#/login",location.reload()})}function me(){F(null),location.hash="#/login"}async function he(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,i=!1,c="",o=!1;async function d(){a=await $.products.list(),b()}function y(s){const r=p=>n(p??"");return`
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
			${[19,7,0].map(p=>`<option ${p===(s.vatRate??19)?"selected":""}>${p}</option>`).join("")}
		</select></label>`}function b(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Positionen</strong>
			<button id="p-new">+ Neu</button></div>
			<p class="muted">Produkte und Dienstleistungen für die Rechnungsstellung.</p>
			${a.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${n(s.sku?`${s.sku} · `:"")}${n(s.name)}</strong>
				<span class="muted">${n(s.unit)} · ${Number(s.unitPriceNet).toFixed(2)} EUR · ${s.vatRate} %</span>
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="danger" data-del="${s.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Positionen.</p>'}
		</div>
		${t||i?`<div class="card"><h3>${i?"Neue Position":n(t?.name??"")}</h3>
			${y(t??{})}
			${c?`<p class="${o?"error":""}">${n(c)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,i=!0,c="",b()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(r=>r.id===s.dataset.edit)??null,i=!1,c="",b()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(s.dataset.del??""),await d()}catch(r){c=r.message,o=!0,b()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,i=!1,c="",b()}),e.querySelector("#p-save")?.addEventListener("click",()=>{m()})}function l(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function m(){const s=l();try{i?await $.products.create(s):t&&await $.products.update(t.id,s),t=null,i=!1,c="",await d()}catch(r){c=r.message,o=!0,b()}}try{await d()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}async function fe(e){try{const a=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const ve=["title","meta","parties","positions","totals"],W=["payment","notes"];async function be(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,i="",c=[];try{const s=await T("/api/company-profiles");s.ok&&(c=await s.json())}catch{}async function o(){a=await d(),b()}async function d(){const s=await T("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function y(s){const r=s.definition,p=(h,N,v)=>`<label><input type="checkbox" data-f="blocks.${h}" ${r.blocks[h]?"checked":""} ${v?"disabled":""} style="width:auto" /> ${N}${v?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${c.map(h=>`<option value="${n(h.id)}" ${s.definition.companyId===h.id?"selected":""}>${n(h.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${ve.map(h=>p(h,`Block ${h}`,!0)).join("")}
		${W.map(h=>p(h,`Block ${h}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${r.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${r.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${r.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${r.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showFooterBoxes" ${r.showFooterBoxes!==!1?"checked":""} style="width:auto" /> Firmen-Fußzeile (4 Boxen)</label>
		<label><input type="checkbox" data-f="showPageNumbers" ${r.showPageNumbers?"checked":""} style="width:auto" /> Seitenzahlen (ab 2 Seiten)</label>
		<label><input type="checkbox" data-f="showTagline" ${r.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${n(r.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${n(r.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${n(r.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${n(r.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${n(r.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(h=>`<option ${r.logo?.position===h?"selected":""}>${h}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${n(r.logo.path)}</p>`:""}`}function b(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${a.map(s=>`<div class="row" style="margin-top:8px">
				<strong>${n(s.name)}</strong><span class="muted">v${s.version}</span>
				${s.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${s.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${s.id}">Vorschau</button>
				${s.isDefault?"":`<button class="secondary" data-def="${s.id}">Standard</button>`}
				${s.isDefault?"":`<button class="danger" data-del="${s.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${t?`<div class="card"><h3>${n(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${y(t)}
			${i?`<p class="error">${n(i)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const p=(await(await T("/api/templates")).json())[0];if(!p){i="Keine Basisvorlage vorhanden",b();return}t={...structuredClone(p),id:"neu",name:"Neu",version:1,isDefault:!1},i="",b()}catch(s){i=s.message,b()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const r=a.find(p=>p.id===s.dataset.edit);r&&(t=structuredClone(r),i="",b())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const r=a.find(p=>p.id===s.dataset.prev);if(r)try{const p=await T("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!p.ok){const N=await p.json().catch(()=>({}));throw new Error(N.error??"Vorschau fehlgeschlagen")}const h=await p.blob();window.open(URL.createObjectURL(h),"_blank")}catch(p){i=p.message,b()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await T(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(r){i=r.message,b()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const r=await T(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!r.ok){i=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",b();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,i="",b()}),e.querySelector("#t-save")?.addEventListener("click",()=>{m()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=l();if(s)try{const r=await T("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!r.ok){const p=await r.json().catch(()=>({}));throw new Error(p.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){i=r.message,b()}})}function l(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const p of W)s.blocks[p]=e.querySelector(`[data-f="blocks.${p}"]`)?.checked??s.blocks[p];for(const p of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[p]=e.querySelector(`[data-f="${p}"]`)?.checked??!1;s.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?s.companyId=r:delete s.companyId,s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:s.name,definition:s}}async function m(){const s=l();if(!s)return;const r=s.definition;try{let p=t.id;if(p==="neu"){const N=await T("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");p=(await N.json()).id}else{const N=await T(`/api/templates/${p}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const h=e.querySelector("#t-logo")?.files?.[0];if(h){const N=await new Promise((E,u)=>{const f=new FileReader;f.onload=()=>E(String(f.result).split(",")[1]),f.onerror=()=>u(new Error("Datei nicht lesbar")),f.readAsDataURL(h)}),v=await T(`/api/templates/${p}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:h.name,mime:h.type,dataBase64:N})});if(!v.ok)throw new Error((await v.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,i="",await o()}catch(p){i=p.message,b()}}try{await o()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const Z=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),B=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19});function M(e){return Math.round((e+Number.EPSILON)*100)/100}function X(e){const a=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,i=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(a*t*(1-i/100))}function ye(e){return(e??"").trim().split("..")[0]??""}function ge(e){const a=(e??"").trim().split("..");return a.length>1?a[1]:""}const j="einv-wizard-v1",ee="einv-employee";function te(){try{return localStorage.getItem(ee)??""}catch{return""}}function _(){return new Date().toISOString().slice(0,10)}function K(){return{step:0,seller:Z(),buyer:Z(),lines:[B()],issueDate:_(),deliveryDate:_(),dueDate:"",employee:te(),documentTitle:"Rechnung",notes:"",skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function H(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function $e(){try{const e=localStorage.getItem(j);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...K(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function Y(e,a,t){return`
		<label>Name<input data-p="${e}" data-f="name" value="${n(a.name)}" /></label>
		<label>Straße<input data-p="${e}" data-f="street" value="${n(a.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${e}" data-f="zip" value="${n(a.zip)}" /></label>
			<label>Ort<input data-p="${e}" data-f="city" value="${n(a.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${e}" data-f="country" value="${n(a.country)}" /></label>
			<label>E-Mail<input data-p="${e}" data-f="email" value="${n(a.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${e}" data-f="phone" value="${n(a.phone)}" /></label>
			${t?`<label>Webseite<input data-p="${e}" data-f="website" value="${n(a.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${e}" data-f="contactName" value="${n(a.contactName)}" /></label>`}
		</div>
		${t?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${e}" data-f="vatId" value="${n(a.vatId)}" /></label>
			<label>Steuernummer<input data-p="${e}" data-f="taxNumber" value="${n(a.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const we=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],ke={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function Q(e,a){let t=K();const i=!!a;let c=[],o=[],d=[],y=!1;if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(a).then(v=>{if(v.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(v.status)}).</div>`;return}t={...K(),seller:v.seller,buyer:v.buyer,lines:v.lines.length>0?v.lines:[B()],issueDate:v.issueDate,deliveryDate:v.deliveryDate,dueDate:v.dueDate??"",employee:v.employeeCode??te(),documentTitle:v.documentTitle,notes:v.notes??"",skontoPercent:v.skontoPercent??0,skontoDueDate:v.skontoDueDate??"",draftId:v.id},l(),p()}).catch(v=>{e.innerHTML=`<div class="card error">${n(v.message)}</div>`});return}const b=$e();if(b&&H(b)&&!b.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(b.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=b,l(),p()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(j),l(),p()});return}b&&H(b)&&(t=b),l(),H(t)||$.company.getDefault().then(v=>{v&&!t.seller.name.trim()&&v.profile.name.trim()&&(t.seller={...t.seller,...v.profile},t.selectedCompany=v.id,p(!0))}).catch(()=>{});function l(){$.company.list().then(v=>{c=v,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&p()}).catch(()=>{}),$.customers.list().then(v=>{o=v,t.step===1&&!e.querySelector("#w-customer")&&p()}).catch(()=>{}),$.products.list().then(v=>{d=v,t.step===2&&!e.querySelector("#w-catalog")&&p()}).catch(()=>{})}function m(){try{if(i)return;if(!t.dirty){localStorage.removeItem(j);return}localStorage.setItem(j,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function s(){e.querySelectorAll("input[data-p]").forEach(f=>{const w=f.dataset.p==="seller"?t.seller:t.buyer;w[f.dataset.f]=f.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(f=>{const[w,k]=f.dataset.l.split("."),P=t.lines[Number(w)];if(P)if(k==="quantity"||k==="unitPriceNet"||k==="vatRate"||k==="discountPercent"){const q=Number(f.value),A=Number.isFinite(q)?q:0;P[k]=k==="discountPercent"?Math.min(Math.max(A,0),100):A}else P[k]=f.value});const v=f=>e.querySelector(`#${f}`)?.value??"",E=()=>{const f=v("w-delivery");if(!f)return;const w=v("w-delivery-to");t.deliveryDate=w&&w!==f?`${f}..${w}`:f};t.issueDate=v("w-issue")||t.issueDate,E(),e.querySelector("#w-due")&&(t.dueDate=v("w-due")),e.querySelector("#w-employee")&&(t.employee=v("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=v("w-title")||t.documentTitle);const u=e.querySelector("#w-notes");if(u&&(t.notes=u.value),e.querySelector("#w-skonto")){const f=Number(v("w-skonto"));t.skontoPercent=Number.isFinite(f)?Math.min(Math.max(f,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=v("w-skonto-due")),m()}function r(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((E,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${E}</span>`).join("")}</div>`}function p(v=!1){v||s();let E="";if(t.step===0&&(E=`<div class="card"><h3>Verkäufer</h3>
				${c.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${c.map(u=>`<option value="${n(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${n(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("seller",t.seller,!0)}</div>`),t.step===1&&(E=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(u=>`<option value="${n(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${n(u.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${Y("buyer",t.buyer,!1)}</div>`),t.step===2&&(E=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${we.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${d.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${d.map(u=>`<option value="${n(u.id)}">${n(u.sku?`${u.sku} · `:"")}${n(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,f)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${f+1}</span><strong>Position ${f+1}</strong>
						<span class="line-sum">${L(X(u))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${f}.description" value="${n(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${f}.sku" value="${n(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${f}.details" rows="1">${n(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${f}.quantity" type="number" min="0" step="any" value="${n(u.quantity)}" /></label>
						<label>Einheit<input data-l="${f}.unit" value="${n(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${f}.unitPriceNet" type="number" min="0" step="0.01" value="${n(u.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${f}.discountPercent" type="number" min="0" max="100" step="0.1" value="${n(u.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${f}.vatRate">
							${[19,7,0].map(w=>`<option ${w===Number(u.vatRate)?"selected":""}>${w}</option>`).join("")}
						</select></label>
						${Number(u.vatRate)===0?`<label>Steuerbefreiung<select data-l="${f}.exemptionCategory">
								${["E","AE","K","G","O"].map(w=>`<option ${(u.exemptionCategory??"E")===w?"selected":""} value="${w}">${w} — ${ke[w]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${f}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${n(u.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${f}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${n(t.dueDate)}" /></label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${n(ye(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${n(ge(t.deliveryDate))}" /></label>
					</div>
					<p class="muted">Nur „von" angeben, wenn die Leistung an einem Tag erbracht wurde. Mit „bis" wird der Zeitraum als BT-74/BT-75 in die Rechnung geschrieben.</p>
				</fieldset>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(t.employee)}" /></label>
				<fieldset class="period">
					<legend>Skonto (Rabatt bei früher Zahlung)</legend>
					<div class="grid2">
						<label>Skonto %<input id="w-skonto" type="number" min="0" max="100" step="0.01" value="${n(t.skontoPercent)}" /></label>
						<label>Skonto bis<input id="w-skonto-due" type="date" value="${n(t.skontoDueDate)}" /></label>
					</div>
					<p class="muted">Bei 0 % kein Skonto. Ohne eigenes Datum gilt das Fälligkeitsdatum. Der Skonto mindert den Zahlbetrag (BT-9) und steht als Bedingung mit Subject-Code AAK im XML.</p>
				</fieldset>
				<label>Notizen<textarea id="w-notes">${n(t.notes)}</textarea></label>
			</div>`),t.step===3){const u=t.lines.map(g=>{const D=Math.min(Math.max(Number(g.discountPercent)||0,0),100);return{...g,discount:D,gross:M((Number(g.quantity)||0)*(Number(g.unitPriceNet)||0)),net:X(g)}}).filter(g=>g.description.trim()!==""||g.gross>0),f=new Map;for(const g of u)f.set(Number(g.vatRate)||0,M((f.get(Number(g.vatRate)||0)??0)+g.net));const w=[...f.entries()].sort(([g],[D])=>g-D).map(([g,D])=>({rate:g,net:D,tax:M(D*g/100)})),k=M(w.reduce((g,D)=>g+D.net,0)),P=M(w.reduce((g,D)=>g+D.tax,0)),q=M(k+P),A=M(q*(Number(t.skontoPercent)||0)/100),G=u.some(g=>g.discount>0);E=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${G?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(g=>`<tr>
							<td>${n(g.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${n(g.quantity)} ${n(g.unit)}</td>
							<td class="r">${L(g.unitPriceNet)}</td>
							${G?`<td class="r">${g.discount>0?`${n(g.discount)} %`:"–"}</td><td class="r">${g.discount>0?L(M(g.gross-g.net)):"–"}</td>`:""}
							<td class="r">${n(g.vatRate)} %</td><td class="r"><strong>${L(g.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${L(k)}</td></tr>
						${w.map(g=>`<tr class="sub"><td class="lbl">USt ${n(g.rate)} % auf ${L(g.net)}</td><td class="r">${L(g.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${L(q)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${n(t.skontoPercent)} % Skonto bis ${n(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${L(A)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${L(q-A)}</td></tr>`:""}
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${r()}${E}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,p()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",f=c.find(w=>w.id===u);f?(t.seller={...t.seller,...f.profile},t.selectedCompany=f.id,p(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",f=o.find(w=>w.id===u);f?(t.buyer={...t.buyer,...f.profile},t.selectedCustomer=f.id,p(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,p()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(j),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.push(B()),p()}),e.querySelector("#w-take")?.addEventListener("click",()=>{s();const u=e.querySelector("#w-catalog")?.value??"",f=d.find(w=>w.id===u);if(f){const w={description:f.name,sku:f.sku||void 0,details:f.details||void 0,quantity:1,unit:f.unit,unitPriceNet:f.unitPriceNet,vatRate:f.vatRate},k=t.lines.findIndex(P=>!P.description.trim()&&!(P.sku??"").trim()&&!(P.details??"").trim()&&P.unitPriceNet===0);k>=0?t.lines[k]=w:t.lines.push(w),t.dirty=!0}p(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(B()),p(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{h(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&h(!0)})}async function h(v){if(!y){y=!0;try{s(),t.error="";const E={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(ee,t.employee.trim())}catch{}let u;t.draftId?u=await $.update(t.draftId,E):(u=await $.create(E),t.draftId=u.id),v&&(u=await $.issue(u.id));try{localStorage.removeItem(j)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,p()}}finally{y=!1}}}e.addEventListener("input",()=>{try{N()}catch{}});function N(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const P=k.dataset.p==="seller"?t.seller:t.buyer;P[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[P,q]=k.dataset.l.split("."),A=t.lines[Number(P)];A&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"||q==="discountPercent"?A[q]=Number(k.value):A[q]=k.value)});const v=k=>e.querySelector(`#${k}`)?.value??"",E=v("w-issue"),u=v("w-delivery"),f=v("w-delivery-to");E&&(t.issueDate=E),u&&(t.deliveryDate=f&&f!==u?`${u}..${f}`:u),e.querySelector("#w-due")&&(t.dueDate=v("w-due")),e.querySelector("#w-employee")&&(t.employee=v("w-employee"));const w=v("w-title");if(w&&(t.documentTitle=w),e.querySelector("#w-skonto")){const k=Number(v("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=v("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,m()}p()}const Se=document.querySelector("#app");function Ee(e){const a=!!C(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];Se.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([i,c])=>`<a href="${i}" class="${e===i||i==="#/"&&e.startsWith("#/invoices")?"active":""}">${c}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function ae(){const e=location.hash||"#/";Ee(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await ce(a):e==="#/new"?Q(a):e.startsWith("#/edit/")?Q(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ue(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await be(a):e==="#/company"?await ie(a):e==="#/customers"?await re(a):e==="#/products"?await he(a):e==="#/backup"?await se(a):e==="#/login"?pe(a):e==="#/logout"?me():e==="#/status"?await fe(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{ae()});ae();
