(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))l(d);new MutationObserver(d=>{for(const c of d)if(c.type==="childList")for(const o of c.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&l(o)}).observe(document,{childList:!0,subtree:!0});function t(d){const c={};return d.integrity&&(c.integrity=d.integrity),d.referrerPolicy&&(c.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?c.credentials="include":d.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function l(d){if(d.ep)return;d.ep=!0;const c=t(d);fetch(d.href,c)}})();const O="einv-token";function z(){try{return localStorage.getItem(O)}catch{return null}}function B(e){try{e?localStorage.setItem(O,e):localStorage.removeItem(O)}catch{}}async function k(e,a){const t=await E(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`HTTP ${t.status}`)}return await t.json()}async function E(e,a){const t={...a?.headers??{}},l=z();l&&(t.authorization=`Bearer ${l}`);const d=await fetch(e,{...a,headers:t});if(d.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return d}async function R(e,a){const t=await E(e);if(!t.ok){const o=await t.json().catch(()=>({}));throw new Error(o.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const l=await t.blob(),d=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),c=document.createElement("a");c.href=URL.createObjectURL(l),c.download=d?.[1]??a,document.body.appendChild(c),c.click(),c.remove(),window.setTimeout(()=>URL.revokeObjectURL(c.href),1e4)}async function Q(e){const a=await E(e);if(!a.ok){const d=await a.json().catch(()=>({}));throw new Error(d.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),l=URL.createObjectURL(t);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const g={health:()=>k("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return k(`/api/invoices${a?`?${a}`:""}`)},get:e=>k(`/api/invoices/${e}`),create:e=>k("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>k(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>k(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>k(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>k("/api/company-profiles"),getDefault:()=>k("/api/company-profiles/default"),create:(e,a)=>k("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>k("/api/customers"),create:(e,a)=>k("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>k(`/api/customers/${e}`,{method:"DELETE"})},products:{list:()=>k("/api/products"),create:e=>k("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>k(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>k(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function L(e){return`${Number(e).toFixed(2)} EUR`}function M(e){return e.split("/").pop()??e}async function ee(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",l=!1;async function d(){const o=await E("/api/backups");if(!o.ok)throw new Error("Backups konnten nicht geladen werden");a=await o.json(),c()}function c(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(o=>`<div class="row" style="margin-top:8px">
				<strong>${n(M(o.filename))}</strong>
				<span class="muted">${n(o.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(o.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(o.filename)}">Download</button>
				<button class="secondary" data-restore="${n(o.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const o=await E("/api/backups",{method:"POST"});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const i=await o.json();t=`Gesichert: ${M(i.filename)}`,l=!1,await d()}catch(o){t=o.message,l=!0,c()}}),e.querySelectorAll("[data-dl]").forEach(o=>o.addEventListener("click",async()=>{const i=o.dataset.dl??"";try{await R(`/api/backups/file/${M(i)}`,M(i))}catch(p){t=p.message,l=!0,c()}})),e.querySelectorAll("[data-restore]").forEach(o=>o.addEventListener("click",async()=>{const i=o.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${M(i)}? Die aktuelle Datenbank wird ersetzt.`))try{const p=await E("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:i})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const h=await p.json();t=`Wiederhergestellt: ${h.invoices} Rechnungen, ${h.templates} Vorlagen${h.fileErrors.length>0?` (${h.fileErrors.length} Dateifehler)`:""}`,l=!1,await d()}catch(p){t=p.message,l=!0,c()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const o=e.querySelector("#b-file")?.files?.[0];if(!o){t="Bitte zuerst eine ZIP-Datei wählen",l=!0,c();return}if(window.confirm(`Wirklich wiederherstellen aus ${o.name}? Die aktuelle Datenbank wird ersetzt.`))try{const i=await new Promise((f,s)=>{const r=new FileReader;r.onload=()=>f(String(r.result).split(",")[1]),r.onerror=()=>s(new Error("Datei nicht lesbar")),r.readAsDataURL(o)}),p=await E("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:i})});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const h=await p.json();t=`Wiederhergestellt: ${h.invoices} Rechnungen, ${h.templates} Vorlagen`,l=!1,await d()}catch(i){t=i.message,l=!0,c()}})}try{await d()}catch(o){e.innerHTML=`<div class="card error">${n(o.message)}</div>`}}const F=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function N(e,a,t){const l=e[a],d=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(d)}" /></label>`}async function te(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",l=!1;try{a=await g.company.getDefault(),a||(a=(await g.company.list())[0]??null)}catch(c){e.innerHTML=`<div class="card error">${n(c.message)}</div>`;return}function d(){const c=a?.profile??F();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${N(c,"name","Firmenname")}
			${N(c,"street","Straße")}
			<div class="grid2">${N(c,"zip","PLZ")}${N(c,"city","Ort")}</div>
			<div class="grid2">${N(c,"country","Land")}${N(c,"email","E-Mail")}</div>
			<div class="grid2">${N(c,"phone","Telefon")}${N(c,"website","Webseite")}</div>
			<div class="grid2">${N(c,"vatId","USt-IdNr.")}${N(c,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${N(c,"bankName","Bankname")}${N(c,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(c.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(o=>`<div class="grid2"><label>Box ${o+1}<textarea data-fbox="${o}" rows="3">${n((c.footerBoxes??[])[o]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${o}">
					${["left","center","right"].map(i=>`<option value="${i}" ${(c.footerAlign??[])[o]===i||!(c.footerAlign??[])[o]&&i==="left"?"selected":""}>${i==="left"?"Links":i==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const o={...F()};e.querySelectorAll("input[data-f]").forEach(h=>{o[h.dataset.f]=h.value});const i=[0,1,2,3].map(h=>e.querySelector(`textarea[data-fbox="${h}"]`)?.value??"");i.some(h=>h.trim()!=="")?(o.footerBoxes=i,o.footerAlign=[0,1,2,3].map(h=>{const f=e.querySelector(`select[data-falign="${h}"]`)?.value;return f==="center"||f==="right"?f:"left"})):(delete o.footerBoxes,delete o.footerAlign);const p=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await g.company.update(a.id,{name:p,profile:o}):a=await g.company.create(p,o),t="Gespeichert.",l=!1,d()}catch(h){t=h.message,l=!0,d()}})}d()}const K=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function x(e,a,t){const l=e[a],d=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(d)}" /></label>`}async function ae(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,l=!1,d="",c=!1;async function o(){a=await g.customers.list(),p()}function i(f,s){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(s)}" /></label>
		${x(f,"name","Firmenname")}
		${x(f,"street","Straße")}
		<div class="grid2">${x(f,"zip","PLZ")}${x(f,"city","Ort")}</div>
		<div class="grid2">${x(f,"country","Land")}${x(f,"email","E-Mail")}</div>
		<div class="grid2">${x(f,"phone","Telefon")}${x(f,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(f.customerNumber)}" /></label>`}function p(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(f=>`<div class="row" style="margin-top:8px">
				<strong>${n(f.name)}</strong>
				<span class="muted">${n(f.profile.city||"")}</span>
				<button class="secondary" data-edit="${f.id}">Bearbeiten</button>
				<button class="danger" data-del="${f.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||l?`<div class="card"><h3>${l?"Neuer Kunde":n(t?.name??"")}</h3>
			${i(t?.profile??K(),t?.name??"")}
			${d?`<p class="${c?"error":""}">${n(d)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,l=!0,d="",p()}),e.querySelectorAll("[data-edit]").forEach(f=>f.addEventListener("click",()=>{t=a.find(s=>s.id===f.dataset.edit)??null,l=!1,d="",p()})),e.querySelectorAll("[data-del]").forEach(f=>f.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await g.customers.remove(f.dataset.del??""),await o()}catch(s){d=s.message,c=!0,p()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,l=!1,d="",p()}),e.querySelector("#k-save")?.addEventListener("click",()=>{h()})}async function h(){const f={...K()};e.querySelectorAll("input[data-f]").forEach(r=>{f[r.dataset.f]=r.value});const s=e.querySelector("#k-name")?.value.trim()||f.name.trim()||"Kunde";try{l?await g.customers.create(s,f):t&&await g.customers.update(t.id,{name:s,profile:f}),t=null,l=!1,d="",await o()}catch(r){d=r.message,c=!0,p()}}try{await o()}catch(f){e.innerHTML=`<div class="card error">${n(f.message)}</div>`}}function ne(e){return`<span class="badge ${e}">${e}</span>`}async function se(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),l=e.querySelector("#list"),d=e.querySelector("#list-err");function c(i){d.innerHTML=`<div class="card error">${n(i.message)}</div>`}async function o(){const i={};a.value&&(i.status=a.value),t.value.trim()&&(i.q=t.value.trim());try{const p=await g.list(i);l.innerHTML=p.map(h=>`<div class="card"><div class="row">
					<strong>${n(h.number??"(Entwurf)")}</strong>${ne(h.status)}
					<span>${n(h.buyer.name||"—")}</span>
					<span>${L(h.totals.grossTotal)}</span>
					<a href="#/invoices/${n(h.id)}">Ansehen</a>
					${h.status==="draft"?`<a href="#/edit/${n(h.id)}">Bearbeiten</a>`:""}
					${h.pdfPath?`<button class="secondary" data-dl="pdf:${n(h.id)}:${n(h.number??"rechnung")}">PDF ↓</button>`:""}
					${h.xml?`<button class="secondary" data-dl="xml:${n(h.id)}:${n(h.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(h=>h.addEventListener("click",async()=>{const[f,s,r]=(h.dataset.dl??"").split(":"),v=f==="pdf"?g.pdfUrl(s):g.xmlUrl(s);try{await R(v,`${r}.${f}`)}catch(w){c(w)}}))}catch(p){l.innerHTML=`<div class="card error">${n(p.message)}</div>`}}a.onchange=()=>{o()},t.oninput=()=>{o()},e.querySelector("#f-export")?.addEventListener("click",async()=>{const i={};a.value&&(i.status=a.value),t.value.trim()&&(i.q=t.value.trim());try{await R(g.exportUrl(i),"export.xlsx")}catch(p){c(p)}}),await o()}async function ie(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await g.get(a),l=t.lines.map(i=>{const p=Math.min(Math.max(i.discountPercent??0,0),100),h=i.unitPriceNet*(1-p/100);return{line:i,discount:p,gross:Math.round(i.quantity*i.unitPriceNet*100)/100,net:Math.round(i.quantity*h*100)/100}}),d=l.some(i=>i.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${n(t.number??"(Entwurf)")}</strong>
				<span class="badge ${t.status}">${t.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${n(t.seller.name)}<br />${n(t.seller.street)}<br />${n(t.seller.zip)} ${n(t.seller.city)}</div>
				<div><strong>Käufer</strong><br />${n(t.buyer.name)}<br />${n(t.buyer.street)}<br />${n(t.buyer.zip)} ${n(t.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${n(t.issueDate)} · Leistung: ${n(t.deliveryDate)}${t.dueDate?` · Fällig: ${n(t.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${d?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${l.map((i,p)=>`<tr>
					<td>${p+1}</td><td>${n(i.line.description)}${i.line.sku?` (${n(i.line.sku)})`:""}</td>
					<td class="r">${i.line.quantity} ${n(i.line.unit)}</td>
					<td class="r">${L(i.line.unitPriceNet)}</td>
					${d?`<td class="r">${i.discount>0?`${n(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?L(Math.round((i.gross-i.net)*100)/100):"–"}</td>`:""}
					<td class="r">${i.line.vatRate} %</td><td class="r"><strong>${L(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${L(t.totals.grossTotal)}</strong> <span class="muted">(netto ${L(t.totals.netTotal)} + USt ${L(t.totals.taxTotal)})</span></p>
			${t.notes?`<p class="muted">Notiz: ${n(t.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${t.status==="draft"?`<a class="btn" href="#/edit/${n(t.id)}">Bearbeiten</a>`:""}
				${t.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${t.pdfPath?'<button class="secondary" data-view="pdf">PDF ansehen</button>':""}
				${t.pdfPath?'<button class="secondary" data-dl="pdf">PDF ↓</button>':""}
				${t.xml?'<button class="secondary" data-dl="xml">XML ↓</button>':""}
				${t.xlsxPath?'<button class="secondary" data-dl="xlsx">Excel ↓</button>':""}
			</div><div id="d-out"></div></div>`;const c=e.querySelector("#d-out"),o=i=>{c.innerHTML=`<p class="error">${n(i.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const p=i.dataset.dl,h=p==="pdf"?g.pdfUrl(t.id):p==="xml"?g.xmlUrl(t.id):g.xlsxUrl(t.id);try{await R(h,`${t.number??"rechnung"}.${p}`)}catch(f){o(f)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await Q(g.pdfUrl(t.id))}catch(i){o(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{c.innerHTML='<p class="muted">Validiere…</p>';try{const i=await g.validate(t.id);c.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(p=>`<li class="error">${n(p)}</li>`).join("")}</ul>`}catch(i){c.innerHTML=`<p class="error">${n(i.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await g.issue(t.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){c.innerHTML=`<p class="error">${n(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function re(e){const a=z();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";B(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{B(null),location.hash="#/login",location.reload()})}function le(){B(null),location.hash="#/login"}async function ce(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,l=!1,d="",c=!1;async function o(){a=await g.products.list(),p()}function i(s){const r=v=>n(v??"");return`
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
			${[19,7,0].map(v=>`<option ${v===(s.vatRate??19)?"selected":""}>${v}</option>`).join("")}
		</select></label>`}function p(){e.innerHTML=`
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
		${t||l?`<div class="card"><h3>${l?"Neue Position":n(t?.name??"")}</h3>
			${i(t??{})}
			${d?`<p class="${c?"error":""}">${n(d)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,l=!0,d="",p()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(r=>r.id===s.dataset.edit)??null,l=!1,d="",p()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await g.products.remove(s.dataset.del??""),await o()}catch(r){d=r.message,c=!0,p()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,l=!1,d="",p()}),e.querySelector("#p-save")?.addEventListener("click",()=>{f()})}function h(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function f(){const s=h();try{l?await g.products.create(s):t&&await g.products.update(t.id,s),t=null,l=!1,d="",await o()}catch(r){d=r.message,c=!0,p()}}try{await o()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}async function oe(e){try{const a=await g.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const de=["title","meta","parties","positions","totals"],C=["payment","notes"];async function ue(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,l="",d=[];try{const s=await E("/api/company-profiles");s.ok&&(d=await s.json())}catch{}async function c(){a=await o(),p()}async function o(){const s=await E("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function i(s){const r=s.definition,v=(w,m,S)=>`<label><input type="checkbox" data-f="blocks.${w}" ${r.blocks[w]?"checked":""} ${S?"disabled":""} style="width:auto" /> ${m}${S?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${d.map(w=>`<option value="${n(w.id)}" ${s.definition.companyId===w.id?"selected":""}>${n(w.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${de.map(w=>v(w,`Block ${w}`,!0)).join("")}
		${C.map(w=>v(w,`Block ${w}`,!1)).join("")}
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
				${["right","left","center"].map(w=>`<option ${r.logo?.position===w?"selected":""}>${w}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="500" value="${r.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${r.logo?`<p class="muted">Aktuell: ${n(r.logo.path)}</p>`:""}`}function p(){e.innerHTML=`
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
		${t?`<div class="card"><h3>${n(t.id==="neu"?"Neue Vorlage":t.name)}</h3>${i(t)}
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const v=(await(await E("/api/templates")).json())[0];if(!v){l="Keine Basisvorlage vorhanden",p();return}t={...structuredClone(v),id:"neu",name:"Neu",version:1,isDefault:!1},l="",p()}catch(s){l=s.message,p()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const r=a.find(v=>v.id===s.dataset.edit);r&&(t=structuredClone(r),l="",p())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const r=a.find(v=>v.id===s.dataset.prev);if(r)try{const v=await E("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!v.ok){const m=await v.json().catch(()=>({}));throw new Error(m.error??"Vorschau fehlgeschlagen")}const w=await v.blob();window.open(URL.createObjectURL(w),"_blank")}catch(v){l=v.message,p()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await E(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await c()}catch(r){l=r.message,p()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const r=await E(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!r.ok){l=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",p();return}await c()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,l="",p()}),e.querySelector("#t-save")?.addEventListener("click",()=>{f()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=h();if(s)try{const r=await E("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!r.ok){const v=await r.json().catch(()=>({}));throw new Error(v.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){l=r.message,p()}})}function h(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const v of C)s.blocks[v]=e.querySelector(`[data-f="blocks.${v}"]`)?.checked??s.blocks[v];for(const v of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[v]=e.querySelector(`[data-f="${v}"]`)?.checked??!1;s.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?s.companyId=r:delete s.companyId,s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:s.name,definition:s}}async function f(){const s=h();if(!s)return;const r=s.definition;try{let v=t.id;if(v==="neu"){const m=await E("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");v=(await m.json()).id}else{const m=await E(`/api/templates/${v}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const w=e.querySelector("#t-logo")?.files?.[0];if(w){const m=await new Promise((u,b)=>{const $=new FileReader;$.onload=()=>u(String($.result).split(",")[1]),$.onerror=()=>b(new Error("Datei nicht lesbar")),$.readAsDataURL(w)}),S=await E(`/api/templates/${v}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:w.name,mime:w.type,dataBase64:m})});if(!S.ok)throw new Error((await S.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,l="",await c()}catch(v){l=v.message,p()}}try{await c()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const J=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),j=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),D="einv-wizard-v1",Z="einv-employee";function _(){try{return localStorage.getItem(Z)??""}catch{return""}}function V(){return new Date().toISOString().slice(0,10)}function H(){return{step:0,seller:J(),buyer:J(),lines:[j()],issueDate:V(),deliveryDate:V(),dueDate:"",employee:_(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function U(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function pe(){try{const e=localStorage.getItem(D);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...H(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function W(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" /></label>`}`}const me=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function G(e,a){let t=H();const l=!!a;let d=[],c=[],o=[];if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',g.get(a).then(m=>{if(m.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(m.status)}).</div>`;return}t={...H(),seller:m.seller,buyer:m.buyer,lines:m.lines.length>0?m.lines:[j()],issueDate:m.issueDate,deliveryDate:m.deliveryDate,dueDate:m.dueDate??"",employee:m.employeeCode??_(),documentTitle:m.documentTitle,notes:m.notes??"",draftId:m.id},p(),r()}).catch(m=>{e.innerHTML=`<div class="card error">${n(m.message)}</div>`});return}const i=pe();if(i&&U(i)&&!i.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(i.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=i,r()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(D),r()});return}i&&U(i)&&(t=i),p(),U(t)||g.company.getDefault().then(m=>{m&&!t.seller.name.trim()&&m.profile.name.trim()&&(t.seller={...t.seller,...m.profile},t.selectedCompany=m.id,r(!0))}).catch(()=>{});function p(){g.company.list().then(m=>{d=m,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),g.customers.list().then(m=>{c=m,t.step===1&&!e.querySelector("#w-customer")&&r()}).catch(()=>{}),g.products.list().then(m=>{o=m,t.step===2&&!e.querySelector("#w-catalog")&&r()}).catch(()=>{})}function h(){try{if(!t.dirty){localStorage.removeItem(D);return}const m=l?{...t,draftId:null}:t;localStorage.setItem(D,JSON.stringify({...m,error:"",savedAt:new Date().toISOString()}))}catch{}}function f(){e.querySelectorAll("input[data-p]").forEach(u=>{const b=u.dataset.p==="seller"?t.seller:t.buyer;b[u.dataset.f]=u.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(u=>{const[b,$]=u.dataset.l.split("."),T=t.lines[Number(b)];T&&($==="quantity"||$==="unitPriceNet"||$==="vatRate"||$==="discountPercent"?T[$]=Number(u.value):T[$]=u.value)});const m=u=>e.querySelector(`#${u}`)?.value??"";t.issueDate=m("w-issue")||t.issueDate,t.deliveryDate=m("w-delivery")||t.deliveryDate,e.querySelector("#w-due")&&(t.dueDate=m("w-due")),e.querySelector("#w-employee")&&(t.employee=m("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=m("w-title")||t.documentTitle);const S=e.querySelector("#w-notes");S&&(t.notes=S.value),h()}function s(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((S,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${S}</span>`).join("")}</div>`}function r(m=!1){m||f();let S="";if(t.step===0&&(S=`<div class="card"><h3>Verkäufer</h3>
				${d.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${d.map(u=>`<option value="${n(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${n(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${W("seller",t.seller,!0)}</div>`),t.step===1&&(S=`<div class="card"><h3>Käufer</h3>
				${c.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${c.map(u=>`<option value="${n(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${n(u.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${W("buyer",t.buyer,!1)}</div>`),t.step===2&&(S=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${me.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${o.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${o.map(u=>`<option value="${n(u.id)}">${n(u.sku?`${u.sku} · `:"")}${n(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,b)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${b}.description" value="${n(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${b}.sku" value="${n(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${b}.details" rows="1">${n(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${b}.quantity" type="number" min="0" step="any" value="${u.quantity}" /></label>
						<label>Einheit<input data-l="${b}.unit" value="${n(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${b}.unitPriceNet" type="number" min="0" step="0.01" value="${u.unitPriceNet}" /></label>
						<label>Rabatt %<input data-l="${b}.discountPercent" type="number" min="0" max="100" step="0.1" value="${u.discountPercent??0}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${b}.vatRate">
							${[19,7,0].map($=>`<option ${$===u.vatRate?"selected":""}>${$}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${b}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(t.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(t.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(t.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(t.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(t.notes)}</textarea></label>
			</div>`),t.step===3){const u=t.lines.map(y=>{const P=Math.min(Math.max(y.discountPercent??0,0),100),Y=Math.round(y.quantity*y.unitPriceNet*(1-P/100)*100)/100;return{...y,discount:P,net:Y}}).filter(y=>y.description||y.net>0),b=new Map;for(const y of u)b.set(y.vatRate,Math.round(((b.get(y.vatRate)??0)+y.net)*100)/100);const $=[...b.entries()].sort(([y],[P])=>y-P).map(([y,P])=>({rate:y,net:P,tax:Math.round(P*y/100)})),T=Math.round($.reduce((y,P)=>y+P.net,0)*100)/100,q=Math.round($.reduce((y,P)=>y+P.tax,0)*100)/100,A=Math.round((T+q)*100)/100,I=u.some(y=>y.discount>0);S=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${I?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(y=>`<tr>
							<td>${n(y.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${n(y.quantity)} ${n(y.unit)}</td>
							<td class="r">${L(y.unitPriceNet)}</td>
							${I?`<td class="r">${y.discount>0?`${n(y.discount)} %`:"–"}</td><td class="r">${y.discount>0?L(Math.round(y.net-y.quantity*y.unitPriceNet*100)/100):"–"}</td>`:""}
							<td class="r">${n(y.vatRate)} %</td><td class="r"><strong>${L(y.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						${$.map(y=>`<tr><td class="r">Netto ${n(y.rate)} %</td><td class="r">${L(y.net)}</td><td class="r">${L(y.tax)}</td></tr>`).join("")}
						<tr class="sum"><td class="r">Summe netto</td><td class="r">${L(T)}</td><td class="r muted">enthaltene USt</td></tr>
						<tr class="sum"><td class="r">Summe USt</td><td class="r">${L(q)}</td><td class="r muted"></td></tr>
						<tr class="sum total"><td class="r">Gesamtbetrag</td><td class="r">${L(A)}</td><td class="r muted">EUR</td></tr>
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${s()}${S}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,r()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",b=d.find($=>$.id===u);b?(t.seller={...t.seller,...b.profile},t.selectedCompany=b.id,r(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",b=c.find($=>$.id===u);b?(t.buyer={...t.buyer,...b.profile},t.selectedCustomer=b.id,r(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,r()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(D),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{f(),t.dirty=!0,t.lines.push(j()),r()}),e.querySelector("#w-take")?.addEventListener("click",()=>{f();const u=e.querySelector("#w-catalog")?.value??"",b=o.find($=>$.id===u);if(b){const $={description:b.name,sku:b.sku||void 0,details:b.details||void 0,quantity:1,unit:b.unit,unitPriceNet:b.unitPriceNet,vatRate:b.vatRate},T=t.lines.findIndex(q=>!q.description.trim()&&!(q.sku??"").trim()&&!(q.details??"").trim()&&q.unitPriceNet===0);T>=0?t.lines[T]=$:t.lines.push($),t.dirty=!0}r(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{f(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(j()),r(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{v(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&v(!0)})}async function v(m){f(),t.error="";const S={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(Z,t.employee.trim())}catch{}let u;t.draftId?u=await g.update(t.draftId,S):(u=await g.create(S),t.draftId=u.id),m&&(u=await g.issue(u.id));try{localStorage.removeItem(D)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,r()}}e.addEventListener("input",()=>{try{w()}catch{}});function w(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach($=>{const T=$.dataset.p==="seller"?t.seller:t.buyer;T[$.dataset.f]=$.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach($=>{const[T,q]=$.dataset.l.split("."),A=t.lines[Number(T)];A&&(q==="quantity"||q==="unitPriceNet"||q==="vatRate"||q==="discountPercent"?A[q]=Number($.value):A[q]=$.value)});const m=$=>e.querySelector(`#${$}`)?.value??"",S=m("w-issue"),u=m("w-delivery");S&&(t.issueDate=S),u&&(t.deliveryDate=u),e.querySelector("#w-due")&&(t.dueDate=m("w-due")),e.querySelector("#w-employee")&&(t.employee=m("w-employee"));const b=m("w-title");b&&(t.documentTitle=b),t.notes=e.querySelector("#w-notes")?.value??t.notes,h()}r()}const he=document.querySelector("#app");function fe(e){const a=!!z(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];he.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([l,d])=>`<a href="${l}" class="${e===l||l==="#/"&&e.startsWith("#/invoices")?"active":""}">${d}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function X(){const e=location.hash||"#/";fe(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await se(a):e==="#/new"?G(a):e.startsWith("#/edit/")?G(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ie(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await ue(a):e==="#/company"?await te(a):e==="#/customers"?await ae(a):e==="#/products"?await ce(a):e==="#/backup"?await ee(a):e==="#/login"?re(a):e==="#/logout"?le():e==="#/status"?await oe(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{X()});X();
