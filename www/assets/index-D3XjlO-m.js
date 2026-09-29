(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))n(d);new MutationObserver(d=>{for(const o of d)if(o.type==="childList")for(const m of o.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&n(m)}).observe(document,{childList:!0,subtree:!0});function t(d){const o={};return d.integrity&&(o.integrity=d.integrity),d.referrerPolicy&&(o.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?o.credentials="include":d.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(d){if(d.ep)return;d.ep=!0;const o=t(d);fetch(d.href,o)}})();const C="einv-token";function G(){try{return localStorage.getItem(C)}catch{return null}}function K(e){try{e?localStorage.setItem(C,e):localStorage.removeItem(C)}catch{}}async function S(e,a){const t=await N(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const n=await t.json().catch(()=>({}));throw new Error(n.error??`HTTP ${t.status}`)}return await t.json()}async function N(e,a){const t={...a?.headers??{}},n=G();n&&(t.authorization=`Bearer ${n}`);const d=await fetch(e,{...a,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function U(e,a){const t=await N(e);if(!t.ok){const m=await t.json().catch(()=>({}));throw new Error(m.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const n=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(n),o.download=d?.[1]??a,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function ue(e){const a=await N(e);if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),n=URL.createObjectURL(t);window.open(n,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(n),6e4)}const $={health:()=>S("/api/health"),settings:()=>S("/api/settings"),list:(e={})=>{const a=new URLSearchParams(e).toString();return S(`/api/invoices${a?`?${a}`:""}`)},get:e=>S(`/api/invoices/${e}`),create:e=>S("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>S(`/api/invoices/${e}/issue`,{method:"POST"}),setPaid:(e,a,t)=>S(`/api/invoices/${e}/paid`,{method:"POST",body:JSON.stringify({paid:a,paidAt:t})}),storno:(e,a)=>S(`/api/invoices/${e}/storno`,{method:"POST",body:JSON.stringify({reason:a})}),validate:e=>S(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>S("/api/company-profiles"),getDefault:()=>S("/api/company-profiles/default"),create:(e,a)=>S("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>S("/api/customers"),create:(e,a)=>S("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>S(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/customers/${e}`,{method:"DELETE"}),assignNumbers:()=>S("/api/customers/number-assign",{method:"POST"})},products:{list:()=>S("/api/products"),create:e=>S("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>S(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>S(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function i(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function E(e){return`${Number(e).toFixed(2)} EUR`}function z(e){return e.split("/").pop()??e}async function me(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",n=!1;async function d(){const m=await N("/api/backups");if(!m.ok)throw new Error("Backups konnten nicht geladen werden");a=await m.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${n?"error":""}">${i(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(m=>`<div class="row" style="margin-top:8px">
				<strong>${i(z(m.filename))}</strong>
				<span class="muted">${i(m.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(m.size/1024)} KB</span>
				<button class="secondary" data-dl="${i(m.filename)}">Download</button>
				<button class="secondary" data-restore="${i(m.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const m=await N("/api/backups",{method:"POST"});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const v=await m.json();t=`Gesichert: ${z(v.filename)}`,n=!1,await d()}catch(m){t=m.message,n=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(m=>m.addEventListener("click",async()=>{const v=m.dataset.dl??"";try{await U(`/api/backups/file/${z(v)}`,z(v))}catch(h){t=h.message,n=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(m=>m.addEventListener("click",async()=>{const v=m.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${z(v)}? Die aktuelle Datenbank wird ersetzt.`))try{const h=await N("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:v})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const c=await h.json();t=`Wiederhergestellt: ${c.invoices} Rechnungen, ${c.templates} Vorlagen${c.fileErrors.length>0?` (${c.fileErrors.length} Dateifehler)`:""}`,n=!1,await d()}catch(h){t=h.message,n=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const m=e.querySelector("#b-file")?.files?.[0];if(!m){t="Bitte zuerst eine ZIP-Datei wählen",n=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${m.name}? Die aktuelle Datenbank wird ersetzt.`))try{const v=await new Promise((b,s)=>{const l=new FileReader;l.onload=()=>b(String(l.result).split(",")[1]),l.onerror=()=>s(new Error("Datei nicht lesbar")),l.readAsDataURL(m)}),h=await N("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:v})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const c=await h.json();t=`Wiederhergestellt: ${c.invoices} Rechnungen, ${c.templates} Vorlagen`,n=!1,await d()}catch(v){t=v.message,n=!0,o()}})}try{await d()}catch(m){e.innerHTML=`<div class="card error">${i(m.message)}</div>`}}const Z=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function D(e,a,t){const n=e[a],d=Array.isArray(n)?n.join(`
`):n??"";return`<label>${t}<input data-f="${a}" value="${i(d)}" /></label>`}async function pe(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",n=!1;try{a=await $.company.getDefault(),a||(a=(await $.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${i(o.message)}</div>`;return}function d(){const o=a?.profile??Z();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${i(a?.name??"Meine Firma")}" /></label>
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
			${[0,1,2,3].map(m=>`<div class="grid2"><label>Box ${m+1}<textarea data-fbox="${m}" rows="3">${i((o.footerBoxes??[])[m]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${m}">
					${["left","center","right"].map(v=>`<option value="${v}" ${(o.footerAlign??[])[m]===v||!(o.footerAlign??[])[m]&&v==="left"?"selected":""}>${v==="left"?"Links":v==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${n?"error":""}">${i(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const m={...Z()};e.querySelectorAll("input[data-f]").forEach(c=>{m[c.dataset.f]=c.value});const v=[0,1,2,3].map(c=>e.querySelector(`textarea[data-fbox="${c}"]`)?.value??"");v.some(c=>c.trim()!=="")?(m.footerBoxes=v,m.footerAlign=[0,1,2,3].map(c=>{const b=e.querySelector(`select[data-falign="${c}"]`)?.value;return b==="center"||b==="right"?b:"left"})):(delete m.footerBoxes,delete m.footerAlign);const h=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await $.company.update(a.id,{name:h,profile:m}):a=await $.company.create(h,m),t="Gespeichert.",n=!1,d()}catch(c){t=c.message,n=!0,d()}})}d()}const W=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),he=[{value:"name-asc",label:"Name A–Z"},{value:"name-desc",label:"Name Z–A"},{value:"number-asc",label:"Nummer aufsteigend"},{value:"number-desc",label:"Nummer absteigend"}];function be(e,a){const t=Number(e.replace(/\D+/g,"")),n=Number(a.replace(/\D+/g,"")),d=/\d/.test(e)&&Number.isFinite(t),o=/\d/.test(a)&&Number.isFinite(n);return d&&o&&t!==n?t-n:e.localeCompare(a,"de")}function fe(e,a){const t=a.endsWith("desc")?-1:1,n=[...e];return n.sort((d,o)=>a.startsWith("number")?be(d.profile.customerNumber?.trim()??"",o.profile.customerNumber?.trim()??"")*t:d.name.localeCompare(o.name,"de")*t),n}function R(e,a,t){const n=e[a],d=Array.isArray(n)?n.join(`
`):n??"";return`<label>${t}<input data-f="${a}" value="${i(d)}" /></label>`}async function ve(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,n=!1,d="",o=!1,m="name-asc";async function v(){a=await $.customers.list(),c()}function h(s,l){return`
		<label>Name (Anzeige)<input id="k-name" value="${i(l)}" /></label>
		${R(s,"name","Firmenname")}
		${R(s,"street","Straße")}
		<div class="grid2">${R(s,"zip","PLZ")}${R(s,"city","Ort")}</div>
		<div class="grid2">${R(s,"country","Land")}${R(s,"email","E-Mail")}</div>
		<div class="grid2">${R(s,"phone","Telefon")}${R(s,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${i(s.customerNumber)}" placeholder="wird beim Speichern automatisch vergeben" /></label>`}function c(){const s=a.filter(r=>!r.profile.customerNumber?.trim()).length,l=fe(a,m);e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button>
			<label class="sortsel">Sortieren<select id="k-sort">
				${he.map(r=>`<option value="${r.value}" ${r.value===m?"selected":""}>${r.label}</option>`).join("")}
			</select></label>
			${s>0?`<button class="secondary" id="k-number">${s} ohne Nummer: automatisch vergeben</button>`:""}
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
		${t||n?`<div class="card"><h3>${n?"Neuer Kunde":i(t?.name??"")}</h3>
			${h(t?.profile??W(),t?.name??"")}
			${d?`<p class="${o?"error":""}">${i(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-sort")?.addEventListener("change",r=>{m=r.target.value,c()}),e.querySelector("#k-number")?.addEventListener("click",async()=>{try{d=`${await $.customers.assignNumbers()} Kundennummer(n) vergeben.`,o=!1,await v()}catch(r){d=r.message,o=!0,c()}}),e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,n=!0,d="",c()}),e.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{t=a.find(w=>w.id===r.dataset.edit)??null,n=!1,d="",c()})),e.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(r.dataset.del??""),await v()}catch(w){d=w.message,o=!0,c()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,n=!1,d="",c()}),e.querySelector("#k-save")?.addEventListener("click",()=>{b()})}async function b(){const s={...W()};e.querySelectorAll("input[data-f]").forEach(r=>{s[r.dataset.f]=r.value});const l=e.querySelector("#k-name")?.value.trim()||s.name.trim()||"Kunde";try{n?await $.customers.create(l,s):t&&await $.customers.update(t.id,{name:l,profile:s}),t=null,n=!1,d="",await v()}catch(r){d=r.message,o=!0,c()}}try{await v()}catch(s){e.innerHTML=`<div class="card error">${i(s.message)}</div>`}}function ye(e){return Math.round(e.totals.grossTotal*(Number(e.skontoPercent)||0)/100*100)/100}function ge(e){return`<span class="badge ${e}">${e}</span>`}async function $e(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),n=e.querySelector("#list"),d=e.querySelector("#list-err");let o=0;function m(b){d.innerHTML=`<div class="card error">${i(b.message)}</div>`}async function v(b){const s=b.dataset.paid??"",l=b.checked;b.disabled=!0;try{await $.setPaid(s,l),d.innerHTML=`<div class="card muted">${l?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</div>`,await h()}catch(r){b.checked=!l,m(r)}finally{b.disabled=!1}}async function h(){const b=++o,s={};a.value&&(s.status=a.value),t.value.trim()&&(s.q=t.value.trim());try{const l=await $.list(s);if(b!==o)return;n.innerHTML=l.map(r=>`<div class="card"><div class="row">
					${r.status==="draft"?'<span class="pay-box" title="Entwurf kann nicht als bezahlt markiert werden"></span>':`<label class="pay" title="${r.paid?`Ausgeglichen am ${i((r.paidAt??"").slice(0,10))}`:"Als bezahlt markieren"}">
								<input type="checkbox" data-paid="${i(r.id)}" ${r.paid?"checked":""} /><span>bezahlt</span></label>`}
					<strong>${i(r.number??"(Entwurf)")}</strong>${ge(r.status)}
					<span>${i(r.buyer.name||"—")}</span>
					<span>${E(r.totals.grossTotal)}</span>
					${r.skontoPercent>0&&!r.paid?`<span class="muted">${E(r.totals.grossTotal-ye(r))} bei ${i(r.skontoPercent)} % Skonto</span>`:""}
					${r.stornoOfId?'<span class="badge cancelled">Storno</span>':""}
					<a href="#/invoices/${i(r.id)}">Ansehen</a>
					${r.status==="draft"?`<a href="#/edit/${i(r.id)}">Bearbeiten</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',n.querySelectorAll("[data-paid]").forEach(r=>r.addEventListener("change",()=>{v(r)}))}catch(l){if(b!==o)return;n.innerHTML=`<div class="card error">${i(l.message)}</div>`}}a.onchange=()=>{h()};let c;t.oninput=()=>{c!==void 0&&clearTimeout(c),c=setTimeout(()=>{h()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const b={};a.value&&(b.status=a.value),t.value.trim()&&(b.q=t.value.trim());try{await U($.exportUrl(b),"export.xlsx")}catch(s){m(s)}}),await h()}function F(e){return Math.round((e+Number.EPSILON)*100)/100}function we(e){const a=(e??"").trim(),[t,n]=a.split(".."),d=o=>/^\d{4}-\d{2}-\d{2}$/.test(o??"")?`${o.slice(8,10)}.${o.slice(5,7)}.${o.slice(0,4)}`:o??"";return n?`${d(t)} – ${d(n)}`:d(t)}async function ke(e,a){e.innerHTML='<div class="card">Lade…</div>';try{let n=await $.get(a);const o=(Array.isArray(n.lines)?n.lines:[]).map(c=>{const b=Math.min(Math.max(Number(c.discountPercent)||0,0),100),s=Number(c.quantity)||0,l=Number(c.unitPriceNet)||0;return{line:c,discount:b,gross:F(s*l),net:F(s*l*(1-b/100))}}),m=o.some(c=>c.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${i(n.number??"(Entwurf)")}</strong>
				<span class="badge ${n.status}">${n.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${i(n.seller.name)}<br />${i(n.seller.street)}<br />${i(n.seller.zip)} ${i(n.seller.city)}</div>
				<div><strong>Käufer</strong><br />${i(n.buyer.name)}<br />${i(n.buyer.street)}<br />${i(n.buyer.zip)} ${i(n.buyer.city)}${n.buyer.email?`<br />${i(n.buyer.email)}`:""}</div>
			</div>
			<p>Ausgestellt: ${i(n.issueDate)} · Leistung: ${i(we(n.deliveryDate))}${n.dueDate?` · Fällig: ${i(n.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${m?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${o.map((c,b)=>`<tr>
					<td>${b+1}</td><td>${i(c.line.description)}${c.line.sku?` (${i(c.line.sku)})`:""}</td>
					<td class="r">${i(c.line.quantity)} ${i(c.line.unit)}</td>
					<td class="r">${E(Number(c.line.unitPriceNet))}</td>
					${m?`<td class="r">${c.discount>0?`${i(c.discount)} %`:"–"}</td><td class="r">${c.discount>0?E(F(c.gross-c.net)):"–"}</td>`:""}
					<td class="r">${i(c.line.vatRate)} %</td><td class="r"><strong>${E(c.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${E(n.totals.grossTotal)}</strong> <span class="muted">(netto ${E(n.totals.netTotal)} + USt ${E(n.totals.taxTotal)})</span></p>
			${n.notes?`<p class="muted">Notiz: ${i(n.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${n.status==="draft"?`<a class="btn" href="#/edit/${i(n.id)}">Bearbeiten</a>`:""}
				${n.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				${n.status==="issued"?`<label class="pay"><input type="checkbox" id="d-paid" ${n.paid?"checked":""} /><span>bezahlt${n.paid&&n.paidAt?` (${i(n.paidAt.slice(0,10))})`:""}</span></label>`:""}
				${n.status==="issued"?'<button class="secondary" id="d-storno">Storno</button>':""}
				<button class="secondary" id="d-validate">Validieren</button>
			${n.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
			${n.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
			${n.status==="issued"&&n.pdfPath?'<button class="secondary" id="d-mail">E-Mail (PDF)</button>':""}
			${n.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
			${n.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div></div>`;const v=e.querySelector("#d-out"),h=c=>{v.innerHTML=`<p class="error">${i(c.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(c=>c.addEventListener("click",async()=>{const b=c.dataset.dl,s=b==="pdf"?$.pdfUrl(n.id):b==="xml"?$.xmlUrl(n.id):$.xlsxUrl(n.id);try{await U(s,`${n.number??"rechnung"}.${b}`)}catch(l){h(l)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ue($.pdfUrl(n.id))}catch(c){h(c)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{v.innerHTML='<p class="muted">Validiere…</p>';try{const c=await $.validate(n.id);v.innerHTML=c.formatErrors.length+c.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...c.formatErrors,...c.businessErrors].map(b=>`<li class="error">${i(b)}</li>`).join("")}</ul>`}catch(c){v.innerHTML=`<p class="error">${i(c.message)}</p>`}}),e.querySelector("#d-paid")?.addEventListener("change",async c=>{const b=c.target,s=b.checked;b.disabled=!0;try{n=await $.setPaid(n.id,s),v.innerHTML=`<p style="color:var(--ok)">${s?"Als bezahlt markiert.":"Zahlung zurückgenommen."}</p>`}catch(l){b.checked=!s,v.innerHTML=`<p class="error">${i(l.message)}</p>`}finally{b.disabled=!1}}),e.querySelector("#d-mail")?.addEventListener("click",async()=>{const c=(n.buyer.email??"").trim(),b=`${n.documentTitle??"Rechnung"} ${n.number??""}`.trim(),s=`Guten Tag ${n.buyer.name||""},

anbei erhalten Sie ${b} vom ${n.issueDate}.
Gesamtbetrag: ${E(n.totals.grossTotal)}.
${n.dueDate?`Bitte überweisen bis ${n.dueDate}.
`:""}
Mit freundlichen Grüßen
${n.seller.name}
`;try{await U($.pdfUrl(n.id),`${n.number??"rechnung"}.pdf`)}catch(r){h(r);return}const l=`mailto:${c}?subject=${encodeURIComponent(b)}&body=${encodeURIComponent(s)}`;window.location.href=l,v.innerHTML=c?`<p class="muted">PDF wurde gespeichert. Die Mail wurde an ${i(c)} vorbereitet – bitte die PDF aus dem Download-Ordner anhängen.</p>`:'<p class="muted">PDF wurde gespeichert. Für diesen Kunden ist keine E-Mail hinterlegt – bitte im Mailfenster eintragen und die PDF anhängen.</p>'}),e.querySelector("#d-storno")?.addEventListener("click",async()=>{const c=window.prompt("Grund für den Storno (erscheint auf der Gutschrift):","Falsch ausgestellt");if(c!==null&&window.confirm("Die Rechnung wird auf storniert gesetzt und als Gutschrift neu angelegt. Das Original bleibt unverändert erhalten. Fortfahren?"))try{const{reversal:b}=await $.storno(n.id,c.trim()||void 0);location.hash=`#/edit/${b.id}`,location.reload()}catch(b){v.innerHTML=`<p class="error">${i(b.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const c=await $.issue(n.id);location.hash=`#/invoices/${c.id}`,location.reload()}catch(c){v.innerHTML=`<p class="error">${i(c.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${i(t.message)}</div>`}}function Se(e){const a=G();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${i(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";K(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{K(null),location.hash="#/login",location.reload()})}function Ee(){K(null),location.hash="#/login"}async function Te(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,n=!1,d="",o=!1;async function m(){a=await $.products.list(),h()}function v(s){const l=r=>i(r??"");return`
		<div class="grid2">
			<label>Art.Nr.<input id="p-sku" value="${l(s.sku)}" /></label>
			<label>Bezeichnung<input id="p-name" value="${l(s.name)}" /></label>
		</div>
		<label>Detailzeile<textarea id="p-details" rows="1">${l(s.details)}</textarea></label>
		<div class="grid2">
			<label>Einheit<input id="p-unit" value="${l(s.unit||"Stk")}" /></label>
			<label>Preis netto<input id="p-price" type="number" min="0" step="0.01" value="${s.unitPriceNet??0}" /></label>
		</div>
		<label>USt %<select id="p-vat">
			${[19,7,0].map(r=>`<option ${r===(s.vatRate??19)?"selected":""}>${r}</option>`).join("")}
		</select></label>`}function h(){e.innerHTML=`
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
			${v(t??{})}
			${d?`<p class="${o?"error":""}">${i(d)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,n=!0,d="",h()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(l=>l.id===s.dataset.edit)??null,n=!1,d="",h()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(s.dataset.del??""),await m()}catch(l){d=l.message,o=!0,h()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,n=!1,d="",h()}),e.querySelector("#p-save")?.addEventListener("click",()=>{b()})}function c(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function b(){const s=c();try{n?await $.products.create(s):t&&await $.products.update(t.id,s),t=null,n=!1,d="",await m()}catch(l){d=l.message,o=!0,h()}}try{await m()}catch(s){e.innerHTML=`<div class="card error">${i(s.message)}</div>`}}async function Le(e){try{const a=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${i(a.version)} · Schema: ${i(String(a.schemaVersion))}</p>
			<pre class="dump">${i(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${i(a.message)}</div>`}}const Ne=["title","meta","parties","positions","totals"],_=["payment","notes"],Pe=[{value:"right",label:"rechts"},{value:"left",label:"links"},{value:"center",label:"zentriert"}];async function qe(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,n="",d=[];try{const s=await N("/api/company-profiles");s.ok&&(d=await s.json())}catch{}async function o(){a=await m(),h()}async function m(){const s=await N("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function v(s){const l=s.definition,r=(w,P,p)=>`<label><input type="checkbox" data-f="blocks.${w}" ${l.blocks[w]?"checked":""} ${p?"disabled":""} style="width:auto" /> ${P}${p?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${i(s.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${d.map(w=>`<option value="${i(w.id)}" ${s.definition.companyId===w.id?"selected":""}>${i(w.name)}</option>`).join("")}
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
		${Ne.map(w=>r(w,`Block ${w}`,!0)).join("")}
		${_.map(w=>r(w,`Block ${w}`,!1)).join("")}
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
				${Pe.map(w=>`<option value="${w.value}" ${l.logo?.position===w.value?"selected":""}>${w.label}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${l.logo?.widthMm??30}" /></label>
		</div>
		<label class="pay" title="Ohne Haken erscheint das Logo nur auf der ersten Seite">
			<input type="checkbox" id="t-lall" ${l.logo?.allPages?"checked":""} /><span>Logo auf allen Seiten anzeigen</span>
		</label>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${l.logo?`<p class="muted">Aktuell: ${i(l.logo.path)}</p>`:""}`}function h(){e.innerHTML=`
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
		${t?`<div class="card"><h3>${i(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${v(t)}
			${n?`<p class="error">${i(n)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const r=(await(await N("/api/templates")).json())[0];if(!r){n="Keine Basisvorlage vorhanden",h();return}t={...structuredClone(r),id:"neu",name:"Neu",version:1,isDefault:!1},n="",h()}catch(s){n=s.message,h()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const l=a.find(r=>r.id===s.dataset.edit);l&&(t=structuredClone(l),n="",h())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const l=a.find(r=>r.id===s.dataset.prev);if(l)try{const r=await N("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:l.definition})});if(!r.ok){const P=await r.json().catch(()=>({}));throw new Error(P.error??"Vorschau fehlgeschlagen")}const w=await r.blob();window.open(URL.createObjectURL(w),"_blank")}catch(r){n=r.message,h()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await N(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(l){n=l.message,h()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const l=await N(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!l.ok){n=(await l.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",h();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,n="",h()}),e.querySelector("#t-save")?.addEventListener("click",()=>{b()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=c();if(s)try{const l=await N("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!l.ok){const r=await l.json().catch(()=>({}));throw new Error(r.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await l.blob()),"_blank")}catch(l){n=l.message,h()}})}function c(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const r of _)s.blocks[r]=e.querySelector(`[data-f="blocks.${r}"]`)?.checked??s.blocks[r];for(const r of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[r]=e.querySelector(`[data-f="${r}"]`)?.checked??!1;for(const r of["usePrimaryColor","titleAccent","tableHeaderAccent"]){const w=e.querySelector(`[data-f="${r}"]`);w&&(s[r]=w.checked)}s.footerText=e.querySelector("#t-footer")?.value??"";const l=e.querySelector("#t-company")?.value??"";return l?s.companyId=l:delete s.companyId,s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30),s.logo.allPages=e.querySelector("#t-lall")?.checked===!0),{name:s.name,definition:s}}async function b(){const s=c();if(!s)return;const l=s.definition;try{let r=t.id;if(r==="neu"){const P=await N("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!P.ok)throw new Error((await P.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");r=(await P.json()).id}else{const P=await N(`/api/templates/${r}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:l.name,definition:l})});if(!P.ok)throw new Error((await P.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const w=e.querySelector("#t-logo")?.files?.[0];if(w){const P=await new Promise((L,u)=>{const f=new FileReader;f.onload=()=>L(String(f.result).split(",")[1]),f.onerror=()=>u(new Error("Datei nicht lesbar")),f.readAsDataURL(w)}),p=await N(`/api/templates/${r}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:w.name,mime:w.type,dataBase64:P})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,n="",await o()}catch(r){n=r.message,h()}}try{await o()}catch(s){e.innerHTML=`<div class="card error">${i(s.message)}</div>`}}const X=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),H=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:B.defaultVatRate});let B={defaultVatRate:19,defaultPaymentTerms:""};const J=[{text:"Der Rechnungsbetrag ist sofort ohne Abzug fällig.",days:0},{text:"Bitte überweisen Sie den o.g. Betrag innerhalb von 14 Tagen auf unser Konto.",days:14},{text:"Zahlbar innerhalb von 30 Tagen nach Rechnungsdatum ohne Abzug.",days:30}],Y="__own__";function se(e,a){if(!/^\d{4}-\d{2}-\d{2}$/.test(e))return e;const t=new Date(`${e}T00:00:00Z`);return t.setUTCDate(t.getUTCDate()+a),t.toISOString().slice(0,10)}function ie(e){return!!e&&!re(e)}function re(e){return!!e&&J.some(a=>a.text===e)}function le(e){return J.find(a=>a.text===e)?.days??null}function Q(e){if(!e.dueAuto)return;const a=le(e.paymentTerms);a!==null&&(e.dueDate=se(e.issueDate,a))}function M(e){return Math.round((e+Number.EPSILON)*100)/100}function ee(e){const a=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,n=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(a*t*(1-n/100))}function De(e){return(e??"").trim().split("..")[0]??""}function xe(e){const a=(e??"").trim().split("..");return a.length>1?a[1]:""}const O="einv-wizard-v1",ce="einv-employee";function oe(){try{return localStorage.getItem(ce)??""}catch{return""}}function te(){return new Date().toISOString().slice(0,10)}function V(){return{step:0,seller:X(),buyer:X(),lines:[H()],issueDate:te(),deliveryDate:te(),dueDate:"",employee:oe(),documentTitle:"Rechnung",notes:"",paymentTerms:B.defaultPaymentTerms,termsCustom:ie(B.defaultPaymentTerms),dueAuto:!1,skontoPercent:0,skontoDueDate:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function I(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function Ae(){try{const e=localStorage.getItem(O);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...V(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function ae(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${i(a.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${i(a.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const Me=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],Re={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function ne(e,a){let t=V();const n=!!a;let d=[],o=[],m=[],v=!1;if($.settings().then(p=>{B={defaultVatRate:Number(p.defaultVatRate)||19,defaultPaymentTerms:p.defaultPaymentTerms??""}}).catch(()=>{}),a){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(a).then(p=>{if(p.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${i(p.status)}).</div>`;return}t={...V(),seller:p.seller,buyer:p.buyer,lines:p.lines.length>0?p.lines:[H()],issueDate:p.issueDate,deliveryDate:p.deliveryDate,dueDate:p.dueDate??"",employee:p.employeeCode??oe(),documentTitle:p.documentTitle,notes:p.notes??"",paymentTerms:p.paymentTerms??B.defaultPaymentTerms,termsCustom:ie(p.paymentTerms),skontoPercent:p.skontoPercent??0,skontoDueDate:p.skontoDueDate??"",draftId:p.id},c(),r()}).catch(p=>{e.innerHTML=`<div class="card error">${i(p.message)}</div>`});return}const h=Ae();if(h&&I(h)&&!h.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${i(h.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=h,c(),r()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(O),c(),r()});return}h&&I(h)&&(t=h),c(),I(t)||$.company.getDefault().then(p=>{p&&!t.seller.name.trim()&&p.profile.name.trim()&&(t.seller={...t.seller,...p.profile},t.selectedCompany=p.id,r(!0))}).catch(()=>{});function c(){$.company.list().then(p=>{d=p,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),$.customers.list().then(p=>{o=p,t.step===1&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),$.products.list().then(p=>{m=p,t.step===2&&!e.querySelector("#w-catalog")&&r()}).catch(()=>{})}function b(){try{if(n)return;if(!t.dirty){localStorage.removeItem(O);return}localStorage.setItem(O,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function s(){e.querySelectorAll("input[data-p]").forEach(y=>{const k=y.dataset.p==="seller"?t.seller:t.buyer;k[y.dataset.f]=y.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(y=>{const[k,T]=y.dataset.l.split("."),q=t.lines[Number(k)];if(q)if(T==="quantity"||T==="unitPriceNet"||T==="vatRate"||T==="discountPercent"){const A=Number(y.value),j=Number.isFinite(A)?A:0;q[T]=T==="discountPercent"?Math.min(Math.max(j,0),100):j}else q[T]=y.value});const p=y=>e.querySelector(`#${y}`)?.value??"",L=()=>{const y=p("w-delivery");if(!y)return;const k=p("w-delivery-to");t.deliveryDate=k&&k!==y?`${y}..${k}`:y};t.issueDate=p("w-issue")||t.issueDate,L(),e.querySelector("#w-due")&&(t.dueDate=p("w-due")),Q(t),e.querySelector("#w-employee")&&(t.employee=p("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=p("w-title")||t.documentTitle);const u=e.querySelector("#w-notes");u&&(t.notes=u.value);const f=e.querySelector("#w-terms");if(f&&(t.paymentTerms=f.value),e.querySelector("#w-skonto")){const y=Number(p("w-skonto"));t.skontoPercent=Number.isFinite(y)?Math.min(Math.max(y,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=p("w-skonto-due")),b()}function l(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((L,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${L}</span>`).join("")}</div>`}function r(p=!1){p||s();let L="";if(t.step===0&&(L=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(u=>`<option value="${i(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${i(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ae("seller",t.seller,!0)}</div>`),t.step===1&&(L=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(u=>`<option value="${i(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${i(u.name)}${u.profile.customerNumber?.trim()?"":" (ohne Kundennr.)"}</option>`).join("")}
						</select></label>
						<p class="muted">Fehlt die Kundennummer (BT-10), trage sie unten ein — ohne sie ist die Rechnung nicht ausstellbar.</p>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${ae("buyer",t.buyer,!1)}</div>`),t.step===2&&(L=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${Me.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${m.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${m.map(u=>`<option value="${i(u.id)}">${i(u.sku?`${u.sku} · `:"")}${i(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,f)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${f+1}</span><strong>Position ${f+1}</strong>
						<span class="line-sum">${E(ee(u))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${f}.description" value="${i(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${f}.sku" value="${i(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${f}.details" rows="1">${i(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${f}.quantity" type="number" min="0" step="any" value="${i(u.quantity)}" /></label>
						<label>Einheit<input data-l="${f}.unit" value="${i(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${f}.unitPriceNet" type="number" min="0" step="0.01" value="${i(u.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${f}.discountPercent" type="number" min="0" max="100" step="0.1" value="${i(u.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${f}.vatRate">
							${[19,7,0].map(y=>`<option ${y===Number(u.vatRate)?"selected":""}>${y}</option>`).join("")}
						</select></label>
						${Number(u.vatRate)===0?`<label>Steuerbefreiung<select data-l="${f}.exemptionCategory">
								${["E","AE","K","G","O"].map(y=>`<option ${(u.exemptionCategory??"E")===y?"selected":""} value="${y}">${y} — ${Re[y]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${f}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${i(u.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${f}">Position entfernen</button>
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
					${J.map(u=>`<option value="${i(u.text)}" ${!t.termsCustom&&t.paymentTerms===u.text?"selected":""}>${i(u.text)}</option>`).join("")}
					<option value="${Y}" ${t.termsCustom?"selected":""}>eigener Text …</option>
				</select></label>
				<p class="muted">Ein Preset pflegt das Fälligkeitsdatum automatisch (0 / 14 / 30 Tage nach Rechnungsdatum). Eigenes Datum im Feld „Fällig am" überschreibt das.</p>
				${t.termsCustom?`<label>eigener Zahlungstext<textarea id="w-terms" rows="3" placeholder="z. B. Zahlbar innerhalb 14 Tagen ohne Abzug">${i(t.paymentTerms)}</textarea></label>`:""}
			</div>`),t.step===3){const u=t.lines.map(g=>{const x=Math.min(Math.max(Number(g.discountPercent)||0,0),100);return{...g,discount:x,gross:M((Number(g.quantity)||0)*(Number(g.unitPriceNet)||0)),net:ee(g)}}).filter(g=>g.description.trim()!==""||g.gross>0),f=new Map;for(const g of u)f.set(Number(g.vatRate)||0,M((f.get(Number(g.vatRate)||0)??0)+g.net));const y=[...f.entries()].sort(([g],[x])=>g-x).map(([g,x])=>({rate:g,net:x,tax:M(x*g/100)})),k=M(y.reduce((g,x)=>g+x.net,0)),T=M(y.reduce((g,x)=>g+x.tax,0)),q=M(k+T),A=M(q*(Number(t.skontoPercent)||0)/100),j=u.some(g=>g.discount>0);L=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${i(t.documentTitle)}</strong> · ${i(t.seller.name||"—")} → ${i(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${j?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(g=>`<tr>
							<td>${i(g.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${i(g.quantity)} ${i(g.unit)}</td>
							<td class="r">${E(g.unitPriceNet)}</td>
							${j?`<td class="r">${g.discount>0?`${i(g.discount)} %`:"–"}</td><td class="r">${g.discount>0?E(M(g.gross-g.net)):"–"}</td>`:""}
							<td class="r">${i(g.vatRate)} %</td><td class="r"><strong>${E(g.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${E(k)}</td></tr>
						${y.map(g=>`<tr class="sub"><td class="lbl">USt ${i(g.rate)} % auf ${E(g.net)}</td><td class="r">${E(g.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${E(q)}</td></tr>
						${t.skontoPercent>0?`<tr class="sub"><td class="lbl">${i(t.skontoPercent)} % Skonto bis ${i(t.skontoDueDate||t.dueDate||"—")}</td><td class="r">−${E(A)}</td></tr>
							<tr class="sum total"><td class="lbl">Zahlbetrag bei Skonto</td><td class="r">${E(q-A)}</td></tr>`:""}
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
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,r()}),e.querySelector("#w-terms-select")?.addEventListener("change",u=>{const f=u.target.value;if(f===Y)t.termsCustom=!0,re(t.paymentTerms)&&(t.paymentTerms=""),t.dueAuto=!1;else{t.termsCustom=!1,t.paymentTerms=f;const y=le(f);y!==null?(t.dueAuto=!0,t.dueDate=se(t.issueDate,y)):t.dueAuto=!1}r()}),e.querySelector("#w-due")?.addEventListener("change",()=>{s(),t.dueAuto=!1,r()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",f=d.find(y=>y.id===u);f?(t.seller={...t.seller,...f.profile},t.selectedCompany=f.id,r(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",f=o.find(y=>y.id===u);f?(t.buyer={...t.buyer,...f.profile},t.selectedCustomer=f.id,r(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,r()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(O),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.push(H()),r()}),e.querySelector("#w-take")?.addEventListener("click",()=>{s();const u=e.querySelector("#w-catalog")?.value??"",f=m.find(y=>y.id===u);if(f){const y={description:f.name,sku:f.sku||void 0,details:f.details||void 0,quantity:1,unit:f.unit,unitPriceNet:f.unitPriceNet,vatRate:f.vatRate},k=t.lines.findIndex(T=>!T.description.trim()&&!(T.sku??"").trim()&&!(T.details??"").trim()&&T.unitPriceNet===0);k>=0?t.lines[k]=y:t.lines.push(y),t.dirty=!0}r(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(H()),r(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{w(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&w(!0)})}async function w(p){if(!v){v=!0;try{s(),t.error="";const L={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0,paymentTerms:t.paymentTerms||void 0,skontoPercent:t.skontoPercent||void 0,skontoDueDate:t.skontoDueDate||void 0};try{if(t.employee.trim())try{localStorage.setItem(ce,t.employee.trim())}catch{}let u;t.draftId?u=await $.update(t.draftId,L):(u=await $.create(L),t.draftId=u.id),p&&(u=await $.issue(u.id));try{localStorage.removeItem(O)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,r()}}finally{v=!1}}}e.addEventListener("input",()=>{try{P()}catch{}});function P(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(k=>{const T=k.dataset.p==="seller"?t.seller:t.buyer;T[k.dataset.f]=k.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(k=>{const[T,q]=k.dataset.l.split("."),A=t.lines[Number(T)];A&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"||q==="discountPercent"?A[q]=Number(k.value):A[q]=k.value)});const p=k=>e.querySelector(`#${k}`)?.value??"",L=p("w-issue"),u=p("w-delivery"),f=p("w-delivery-to");L&&(t.issueDate=L),u&&(t.deliveryDate=f&&f!==u?`${u}..${f}`:u),e.querySelector("#w-due")&&(t.dueDate=p("w-due")),Q(t),e.querySelector("#w-employee")&&(t.employee=p("w-employee"));const y=p("w-title");if(y&&(t.documentTitle=y),e.querySelector("#w-skonto")){const k=Number(p("w-skonto"));t.skontoPercent=Number.isFinite(k)?Math.min(Math.max(k,0),100):0}e.querySelector("#w-skonto-due")&&(t.skontoDueDate=p("w-skonto-due")),t.notes=e.querySelector("#w-notes")?.value??t.notes,t.paymentTerms=e.querySelector("#w-terms")?.value??t.paymentTerms,b()}r()}const Oe=document.querySelector("#app");function je(e){const a=!!G(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];Oe.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([n,d])=>`<a href="${n}" class="${e===n||n==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function de(){const e=location.hash||"#/";je(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await $e(a):e==="#/new"?ne(a):e.startsWith("#/edit/")?ne(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ke(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await qe(a):e==="#/company"?await pe(a):e==="#/customers"?await ve(a):e==="#/products"?await Te(a):e==="#/backup"?await me(a):e==="#/login"?Se(a):e==="#/logout"?Ee():e==="#/status"?await Le(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{de()});de();
