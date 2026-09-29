(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const u of document.querySelectorAll('link[rel="modulepreload"]'))l(u);new MutationObserver(u=>{for(const o of u)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&l(c)}).observe(document,{childList:!0,subtree:!0});function t(u){const o={};return u.integrity&&(o.integrity=u.integrity),u.referrerPolicy&&(o.referrerPolicy=u.referrerPolicy),u.crossOrigin==="use-credentials"?o.credentials="include":u.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function l(u){if(u.ep)return;u.ep=!0;const o=t(u);fetch(u.href,o)}})();const z="einv-token";function K(){try{return localStorage.getItem(z)}catch{return null}}function I(e){try{e?localStorage.setItem(z,e):localStorage.removeItem(z)}catch{}}async function k(e,a){const t=await E(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`HTTP ${t.status}`)}return await t.json()}async function E(e,a){const t={...a?.headers??{}},l=K();l&&(t.authorization=`Bearer ${l}`);const u=await fetch(e,{...a,headers:t});if(u.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return u}async function U(e,a){const t=await E(e);if(!t.ok){const c=await t.json().catch(()=>({}));throw new Error(c.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const l=await t.blob(),u=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),o=document.createElement("a");o.href=URL.createObjectURL(l),o.download=u?.[1]??a,document.body.appendChild(o),o.click(),o.remove(),window.setTimeout(()=>URL.revokeObjectURL(o.href),1e4)}async function ae(e){const a=await E(e);if(!a.ok){const u=await a.json().catch(()=>({}));throw new Error(u.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),l=URL.createObjectURL(t);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const g={health:()=>k("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return k(`/api/invoices${a?`?${a}`:""}`)},get:e=>k(`/api/invoices/${e}`),create:e=>k("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>k(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>k(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>k(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>k("/api/company-profiles"),getDefault:()=>k("/api/company-profiles/default"),create:(e,a)=>k("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>k("/api/customers"),create:(e,a)=>k("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>k(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>k(`/api/customers/${e}`,{method:"DELETE"})},products:{list:()=>k("/api/products"),create:e=>k("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>k(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>k(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function q(e){return`${Number(e).toFixed(2)} EUR`}function R(e){return e.split("/").pop()??e}async function ne(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",l=!1;async function u(){const c=await E("/api/backups");if(!c.ok)throw new Error("Backups konnten nicht geladen werden");a=await c.json(),o()}function o(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${a.map(c=>`<div class="row" style="margin-top:8px">
				<strong>${n(R(c.filename))}</strong>
				<span class="muted">${n(c.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(c.size/1024)} KB</span>
				<button class="secondary" data-dl="${n(c.filename)}">Download</button>
				<button class="secondary" data-restore="${n(c.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const c=await E("/api/backups",{method:"POST"});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const y=await c.json();t=`Gesichert: ${R(y.filename)}`,l=!1,await u()}catch(c){t=c.message,l=!0,o()}}),e.querySelectorAll("[data-dl]").forEach(c=>c.addEventListener("click",async()=>{const y=c.dataset.dl??"";try{await U(`/api/backups/file/${R(y)}`,R(y))}catch(i){t=i.message,l=!0,o()}})),e.querySelectorAll("[data-restore]").forEach(c=>c.addEventListener("click",async()=>{const y=c.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${R(y)}? Die aktuelle Datenbank wird ersetzt.`))try{const i=await E("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:y})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const f=await i.json();t=`Wiederhergestellt: ${f.invoices} Rechnungen, ${f.templates} Vorlagen${f.fileErrors.length>0?` (${f.fileErrors.length} Dateifehler)`:""}`,l=!1,await u()}catch(i){t=i.message,l=!0,o()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const c=e.querySelector("#b-file")?.files?.[0];if(!c){t="Bitte zuerst eine ZIP-Datei wählen",l=!0,o();return}if(window.confirm(`Wirklich wiederherstellen aus ${c.name}? Die aktuelle Datenbank wird ersetzt.`))try{const y=await new Promise((m,s)=>{const r=new FileReader;r.onload=()=>m(String(r.result).split(",")[1]),r.onerror=()=>s(new Error("Datei nicht lesbar")),r.readAsDataURL(c)}),i=await E("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:y})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const f=await i.json();t=`Wiederhergestellt: ${f.invoices} Rechnungen, ${f.templates} Vorlagen`,l=!1,await u()}catch(y){t=y.message,l=!0,o()}})}try{await u()}catch(c){e.innerHTML=`<div class="card error">${n(c.message)}</div>`}}const J=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function P(e,a,t){const l=e[a],u=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(u)}" /></label>`}async function se(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",l=!1;try{a=await g.company.getDefault(),a||(a=(await g.company.list())[0]??null)}catch(o){e.innerHTML=`<div class="card error">${n(o.message)}</div>`;return}function u(){const o=a?.profile??J();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${P(o,"name","Firmenname")}
			${P(o,"street","Straße")}
			<div class="grid2">${P(o,"zip","PLZ")}${P(o,"city","Ort")}</div>
			<div class="grid2">${P(o,"country","Land")}${P(o,"email","E-Mail")}</div>
			<div class="grid2">${P(o,"phone","Telefon")}${P(o,"website","Webseite")}</div>
			<div class="grid2">${P(o,"vatId","USt-IdNr.")}${P(o,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${P(o,"bankName","Bankname")}${P(o,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(o.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(c=>`<div class="grid2"><label>Box ${c+1}<textarea data-fbox="${c}" rows="3">${n((o.footerBoxes??[])[c]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${c}">
					${["left","center","right"].map(y=>`<option value="${y}" ${(o.footerAlign??[])[c]===y||!(o.footerAlign??[])[c]&&y==="left"?"selected":""}>${y==="left"?"Links":y==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const c={...J()};e.querySelectorAll("input[data-f]").forEach(f=>{c[f.dataset.f]=f.value});const y=[0,1,2,3].map(f=>e.querySelector(`textarea[data-fbox="${f}"]`)?.value??"");y.some(f=>f.trim()!=="")?(c.footerBoxes=y,c.footerAlign=[0,1,2,3].map(f=>{const m=e.querySelector(`select[data-falign="${f}"]`)?.value;return m==="center"||m==="right"?m:"left"})):(delete c.footerBoxes,delete c.footerAlign);const i=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await g.company.update(a.id,{name:i,profile:c}):a=await g.company.create(i,c),t="Gespeichert.",l=!1,u()}catch(f){t=f.message,l=!0,u()}})}u()}const V=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function A(e,a,t){const l=e[a],u=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(u)}" /></label>`}async function ie(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,l=!1,u="",o=!1;async function c(){a=await g.customers.list(),i()}function y(m,s){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(s)}" /></label>
		${A(m,"name","Firmenname")}
		${A(m,"street","Straße")}
		<div class="grid2">${A(m,"zip","PLZ")}${A(m,"city","Ort")}</div>
		<div class="grid2">${A(m,"country","Land")}${A(m,"email","E-Mail")}</div>
		<div class="grid2">${A(m,"phone","Telefon")}${A(m,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(m.customerNumber)}" /></label>`}function i(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${a.map(m=>`<div class="row" style="margin-top:8px">
				<strong>${n(m.name)}</strong>
				<span class="muted">${n(m.profile.city||"")}</span>
				<button class="secondary" data-edit="${m.id}">Bearbeiten</button>
				<button class="danger" data-del="${m.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${t||l?`<div class="card"><h3>${l?"Neuer Kunde":n(t?.name??"")}</h3>
			${y(t?.profile??V(),t?.name??"")}
			${u?`<p class="${o?"error":""}">${n(u)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,l=!0,u="",i()}),e.querySelectorAll("[data-edit]").forEach(m=>m.addEventListener("click",()=>{t=a.find(s=>s.id===m.dataset.edit)??null,l=!1,u="",i()})),e.querySelectorAll("[data-del]").forEach(m=>m.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await g.customers.remove(m.dataset.del??""),await c()}catch(s){u=s.message,o=!0,i()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,l=!1,u="",i()}),e.querySelector("#k-save")?.addEventListener("click",()=>{f()})}async function f(){const m={...V()};e.querySelectorAll("input[data-f]").forEach(r=>{m[r.dataset.f]=r.value});const s=e.querySelector("#k-name")?.value.trim()||m.name.trim()||"Kunde";try{l?await g.customers.create(s,m):t&&await g.customers.update(t.id,{name:s,profile:m}),t=null,l=!1,u="",await c()}catch(r){u=r.message,o=!0,i()}}try{await c()}catch(m){e.innerHTML=`<div class="card error">${n(m.message)}</div>`}}function re(e){return`<span class="badge ${e}">${e}</span>`}async function le(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),l=e.querySelector("#list"),u=e.querySelector("#list-err");let o=0;function c(f){u.innerHTML=`<div class="card error">${n(f.message)}</div>`}async function y(){const f=++o,m={};a.value&&(m.status=a.value),t.value.trim()&&(m.q=t.value.trim());try{const s=await g.list(m);if(f!==o)return;l.innerHTML=s.map(r=>`<div class="card"><div class="row">
					<strong>${n(r.number??"(Entwurf)")}</strong>${re(r.status)}
					<span>${n(r.buyer.name||"—")}</span>
					<span>${q(r.totals.grossTotal)}</span>
					<a href="#/invoices/${n(r.id)}">Ansehen</a>
					${r.status==="draft"?`<a href="#/edit/${n(r.id)}">Bearbeiten</a>`:""}
					${r.pdfPath?`<button class="secondary" data-dl="pdf:${n(r.id)}:${n(r.number??"rechnung")}">PDF ↓</button>`:""}
					${r.xml?`<button class="secondary" data-dl="xml:${n(r.id)}:${n(r.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(r=>r.addEventListener("click",async()=>{const[p,w,L]=(r.dataset.dl??"").split(":"),h=p==="pdf"?g.pdfUrl(w):g.xmlUrl(w);try{await U(h,`${L}.${p}`)}catch(S){c(S)}}))}catch(s){if(f!==o)return;l.innerHTML=`<div class="card error">${n(s.message)}</div>`}}a.onchange=()=>{y()};let i;t.oninput=()=>{i!==void 0&&clearTimeout(i),i=setTimeout(()=>{y()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const f={};a.value&&(f.status=a.value),t.value.trim()&&(f.q=t.value.trim());try{await U(g.exportUrl(f),"export.xlsx")}catch(m){c(m)}}),await y()}function B(e){return Math.round((e+Number.EPSILON)*100)/100}async function ce(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await g.get(a),u=(Array.isArray(t.lines)?t.lines:[]).map(i=>{const f=Math.min(Math.max(Number(i.discountPercent)||0,0),100),m=Number(i.quantity)||0,s=Number(i.unitPriceNet)||0;return{line:i,discount:f,gross:B(m*s),net:B(m*s*(1-f/100))}}),o=u.some(i=>i.discount>0);e.innerHTML=`
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
				${o?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${u.map((i,f)=>`<tr>
					<td>${f+1}</td><td>${n(i.line.description)}${i.line.sku?` (${n(i.line.sku)})`:""}</td>
					<td class="r">${n(i.line.quantity)} ${n(i.line.unit)}</td>
					<td class="r">${q(Number(i.line.unitPriceNet))}</td>
					${o?`<td class="r">${i.discount>0?`${n(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?q(B(i.gross-i.net)):"–"}</td>`:""}
					<td class="r">${n(i.line.vatRate)} %</td><td class="r"><strong>${q(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${q(t.totals.grossTotal)}</strong> <span class="muted">(netto ${q(t.totals.netTotal)} + USt ${q(t.totals.taxTotal)})</span></p>
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
			</div><div id="d-out"></div></div>`;const c=e.querySelector("#d-out"),y=i=>{c.innerHTML=`<p class="error">${n(i.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const f=i.dataset.dl,m=f==="pdf"?g.pdfUrl(t.id):f==="xml"?g.xmlUrl(t.id):g.xlsxUrl(t.id);try{await U(m,`${t.number??"rechnung"}.${f}`)}catch(s){y(s)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ae(g.pdfUrl(t.id))}catch(i){y(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{c.innerHTML='<p class="muted">Validiere…</p>';try{const i=await g.validate(t.id);c.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(f=>`<li class="error">${n(f)}</li>`).join("")}</ul>`}catch(i){c.innerHTML=`<p class="error">${n(i.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await g.issue(t.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){c.innerHTML=`<p class="error">${n(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function oe(e){const a=K();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";I(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{I(null),location.hash="#/login",location.reload()})}function de(){I(null),location.hash="#/login"}async function ue(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,l=!1,u="",o=!1;async function c(){a=await g.products.list(),i()}function y(s){const r=p=>n(p??"");return`
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
		</select></label>`}function i(){e.innerHTML=`
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
			${y(t??{})}
			${u?`<p class="${o?"error":""}">${n(u)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,l=!0,u="",i()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(r=>r.id===s.dataset.edit)??null,l=!1,u="",i()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await g.products.remove(s.dataset.del??""),await c()}catch(r){u=r.message,o=!0,i()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,l=!1,u="",i()}),e.querySelector("#p-save")?.addEventListener("click",()=>{m()})}function f(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function m(){const s=f();try{l?await g.products.create(s):t&&await g.products.update(t.id,s),t=null,l=!1,u="",await c()}catch(r){u=r.message,o=!0,i()}}try{await c()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}async function pe(e){try{const a=await g.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const me=["title","meta","parties","positions","totals"],W=["payment","notes"];async function he(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,l="",u=[];try{const s=await E("/api/company-profiles");s.ok&&(u=await s.json())}catch{}async function o(){a=await c(),i()}async function c(){const s=await E("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function y(s){const r=s.definition,p=(w,L,h)=>`<label><input type="checkbox" data-f="blocks.${w}" ${r.blocks[w]?"checked":""} ${h?"disabled":""} style="width:auto" /> ${L}${h?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${u.map(w=>`<option value="${n(w.id)}" ${s.definition.companyId===w.id?"selected":""}>${n(w.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${me.map(w=>p(w,`Block ${w}`,!0)).join("")}
		${W.map(w=>p(w,`Block ${w}`,!1)).join("")}
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
		${r.logo?`<p class="muted">Aktuell: ${n(r.logo.path)}</p>`:""}`}function i(){e.innerHTML=`
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
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-preview">Vorschau (Entwurf)</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const p=(await(await E("/api/templates")).json())[0];if(!p){l="Keine Basisvorlage vorhanden",i();return}t={...structuredClone(p),id:"neu",name:"Neu",version:1,isDefault:!1},l="",i()}catch(s){l=s.message,i()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const r=a.find(p=>p.id===s.dataset.edit);r&&(t=structuredClone(r),l="",i())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const r=a.find(p=>p.id===s.dataset.prev);if(r)try{const p=await E("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!p.ok){const L=await p.json().catch(()=>({}));throw new Error(L.error??"Vorschau fehlgeschlagen")}const w=await p.blob();window.open(URL.createObjectURL(w),"_blank")}catch(p){l=p.message,i()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await E(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await o()}catch(r){l=r.message,i()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const r=await E(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!r.ok){l=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",i();return}await o()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,l="",i()}),e.querySelector("#t-save")?.addEventListener("click",()=>{m()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=f();if(s)try{const r=await E("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!r.ok){const p=await r.json().catch(()=>({}));throw new Error(p.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){l=r.message,i()}})}function f(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const p of W)s.blocks[p]=e.querySelector(`[data-f="blocks.${p}"]`)?.checked??s.blocks[p];for(const p of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[p]=e.querySelector(`[data-f="${p}"]`)?.checked??!1;s.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?s.companyId=r:delete s.companyId,s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:s.name,definition:s}}async function m(){const s=f();if(!s)return;const r=s.definition;try{let p=t.id;if(p==="neu"){const L=await E("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!L.ok)throw new Error((await L.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");p=(await L.json()).id}else{const L=await E(`/api/templates/${p}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!L.ok)throw new Error((await L.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const w=e.querySelector("#t-logo")?.files?.[0];if(w){const L=await new Promise((S,d)=>{const v=new FileReader;v.onload=()=>S(String(v.result).split(",")[1]),v.onerror=()=>d(new Error("Datei nicht lesbar")),v.readAsDataURL(w)}),h=await E(`/api/templates/${p}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:w.name,mime:w.type,dataBase64:L})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,l="",await o()}catch(p){l=p.message,i()}}try{await o()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const G=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),O=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19});function M(e){return Math.round((e+Number.EPSILON)*100)/100}function Z(e){const a=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,l=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return M(a*t*(1-l/100))}const j="einv-wizard-v1",Q="einv-employee";function ee(){try{return localStorage.getItem(Q)??""}catch{return""}}function _(){return new Date().toISOString().slice(0,10)}function F(){return{step:0,seller:G(),buyer:G(),lines:[O()],issueDate:_(),deliveryDate:_(),dueDate:"",employee:ee(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function H(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function fe(){try{const e=localStorage.getItem(j);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...F(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function X(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" /></label>`}`}const ve=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function Y(e,a){let t=F();const l=!!a;let u=[],o=[],c=[],y=!1;if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',g.get(a).then(h=>{if(h.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(h.status)}).</div>`;return}t={...F(),seller:h.seller,buyer:h.buyer,lines:h.lines.length>0?h.lines:[O()],issueDate:h.issueDate,deliveryDate:h.deliveryDate,dueDate:h.dueDate??"",employee:h.employeeCode??ee(),documentTitle:h.documentTitle,notes:h.notes??"",draftId:h.id},f(),p()}).catch(h=>{e.innerHTML=`<div class="card error">${n(h.message)}</div>`});return}const i=fe();if(i&&H(i)&&!i.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(i.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=i,f(),p()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(j),f(),p()});return}i&&H(i)&&(t=i),f(),H(t)||g.company.getDefault().then(h=>{h&&!t.seller.name.trim()&&h.profile.name.trim()&&(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,p(!0))}).catch(()=>{});function f(){g.company.list().then(h=>{u=h,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&p()}).catch(()=>{}),g.customers.list().then(h=>{o=h,t.step===1&&!e.querySelector("#w-customer")&&p()}).catch(()=>{}),g.products.list().then(h=>{c=h,t.step===2&&!e.querySelector("#w-catalog")&&p()}).catch(()=>{})}function m(){try{if(l)return;if(!t.dirty){localStorage.removeItem(j);return}localStorage.setItem(j,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function s(){e.querySelectorAll("input[data-p]").forEach(d=>{const v=d.dataset.p==="seller"?t.seller:t.buyer;v[d.dataset.f]=d.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(d=>{const[v,$]=d.dataset.l.split("."),T=t.lines[Number(v)];if(T)if($==="quantity"||$==="unitPriceNet"||$==="vatRate"||$==="discountPercent"){const N=Number(d.value),D=Number.isFinite(N)?N:0;T[$]=$==="discountPercent"?Math.min(Math.max(D,0),100):D}else T[$]=d.value});const h=d=>e.querySelector(`#${d}`)?.value??"";t.issueDate=h("w-issue")||t.issueDate,t.deliveryDate=h("w-delivery")||t.deliveryDate,e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=h("w-title")||t.documentTitle);const S=e.querySelector("#w-notes");S&&(t.notes=S.value),m()}function r(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((S,d)=>`<span class="${d===t.step?"on":""}">${d+1}. ${S}</span>`).join("")}</div>`}function p(h=!1){h||s();let S="";if(t.step===0&&(S=`<div class="card"><h3>Verkäufer</h3>
				${u.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${u.map(d=>`<option value="${n(d.id)}" ${t.selectedCompany===d.id?"selected":""}>${n(d.name)}${d.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${X("seller",t.seller,!0)}</div>`),t.step===1&&(S=`<div class="card"><h3>Käufer</h3>
				${o.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${o.map(d=>`<option value="${n(d.id)}" ${t.selectedCustomer===d.id?"selected":""}>${n(d.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${X("buyer",t.buyer,!1)}</div>`),t.step===2&&(S=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${ve.map(d=>`<option ${d===t.documentTitle?"selected":""}>${d}</option>`).join("")}
				</select></label>
				${c.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${c.map(d=>`<option value="${n(d.id)}">${n(d.sku?`${d.sku} · `:"")}${n(d.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((d,v)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${v+1}</span><strong>Position ${v+1}</strong>
						<span class="line-sum">${q(Z(d))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${v}.description" value="${n(d.description)}" /></label>
						<label>Art.Nr.<input data-l="${v}.sku" value="${n(d.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${v}.details" rows="1">${n(d.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${v}.quantity" type="number" min="0" step="any" value="${n(d.quantity)}" /></label>
						<label>Einheit<input data-l="${v}.unit" value="${n(d.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${v}.unitPriceNet" type="number" min="0" step="0.01" value="${n(d.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${v}.discountPercent" type="number" min="0" max="100" step="0.1" value="${n(d.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${v}.vatRate">
							${[19,7,0].map($=>`<option ${$===Number(d.vatRate)?"selected":""}>${$}</option>`).join("")}
						</select></label>
						${Number(d.vatRate)===0?`<label>Steuerbefreiung<textarea data-l="${v}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${n(d.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${v}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(t.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(t.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(t.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(t.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(t.notes)}</textarea></label>
			</div>`),t.step===3){const d=t.lines.map(b=>{const x=Math.min(Math.max(Number(b.discountPercent)||0,0),100);return{...b,discount:x,gross:M((Number(b.quantity)||0)*(Number(b.unitPriceNet)||0)),net:Z(b)}}).filter(b=>b.description.trim()!==""||b.gross>0),v=new Map;for(const b of d)v.set(Number(b.vatRate)||0,M((v.get(Number(b.vatRate)||0)??0)+b.net));const $=[...v.entries()].sort(([b],[x])=>b-x).map(([b,x])=>({rate:b,net:x,tax:M(x*b/100)})),T=M($.reduce((b,x)=>b+x.net,0)),N=M($.reduce((b,x)=>b+x.tax,0)),D=M(T+N),C=d.some(b=>b.discount>0);S=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${d.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${C?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${d.map(b=>`<tr>
							<td>${n(b.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${n(b.quantity)} ${n(b.unit)}</td>
							<td class="r">${q(b.unitPriceNet)}</td>
							${C?`<td class="r">${b.discount>0?`${n(b.discount)} %`:"–"}</td><td class="r">${b.discount>0?q(M(b.gross-b.net)):"–"}</td>`:""}
							<td class="r">${n(b.vatRate)} %</td><td class="r"><strong>${q(b.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${q(T)}</td></tr>
						${$.map(b=>`<tr class="sub"><td class="lbl">USt ${n(b.rate)} % auf ${q(b.net)}</td><td class="r">${q(b.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${q(D)}</td></tr>
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${r()}${S}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,p()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const d=e.querySelector("#w-company")?.value??"",v=u.find($=>$.id===d);v?(t.seller={...t.seller,...v.profile},t.selectedCompany=v.id,p(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const d=e.querySelector("#w-customer")?.value??"",v=o.find($=>$.id===d);v?(t.buyer={...t.buyer,...v.profile},t.selectedCustomer=v.id,p(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,p()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(j),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.push(O()),p()}),e.querySelector("#w-take")?.addEventListener("click",()=>{s();const d=e.querySelector("#w-catalog")?.value??"",v=c.find($=>$.id===d);if(v){const $={description:v.name,sku:v.sku||void 0,details:v.details||void 0,quantity:1,unit:v.unit,unitPriceNet:v.unitPriceNet,vatRate:v.vatRate},T=t.lines.findIndex(N=>!N.description.trim()&&!(N.sku??"").trim()&&!(N.details??"").trim()&&N.unitPriceNet===0);T>=0?t.lines[T]=$:t.lines.push($),t.dirty=!0}p(!0)}),e.querySelectorAll("[data-del]").forEach(d=>d.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.splice(Number(d.dataset.del),1),t.lines.length===0&&t.lines.push(O()),p(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{w(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&w(!0)})}async function w(h){if(!y){y=!0;try{s(),t.error="";const S={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(Q,t.employee.trim())}catch{}let d;t.draftId?d=await g.update(t.draftId,S):(d=await g.create(S),t.draftId=d.id),h&&(d=await g.issue(d.id));try{localStorage.removeItem(j)}catch{}location.hash=`#/invoices/${d.id}`}catch(d){t.error=d.message,p()}}finally{y=!1}}}e.addEventListener("input",()=>{try{L()}catch{}});function L(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach($=>{const T=$.dataset.p==="seller"?t.seller:t.buyer;T[$.dataset.f]=$.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach($=>{const[T,N]=$.dataset.l.split("."),D=t.lines[Number(T)];D&&(N==="quantity"||N==="unitPriceNet"||N==="vatRate"||N==="discountPercent"?D[N]=Number($.value):D[N]=$.value)});const h=$=>e.querySelector(`#${$}`)?.value??"",S=h("w-issue"),d=h("w-delivery");S&&(t.issueDate=S),d&&(t.deliveryDate=d),e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee"));const v=h("w-title");v&&(t.documentTitle=v),t.notes=e.querySelector("#w-notes")?.value??t.notes,m()}p()}const be=document.querySelector("#app");function ye(e){const a=!!K(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];be.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([l,u])=>`<a href="${l}" class="${e===l||l==="#/"&&e.startsWith("#/invoices")?"active":""}">${u}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function te(){const e=location.hash||"#/";ye(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await le(a):e==="#/new"?Y(a):e.startsWith("#/edit/")?Y(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await ce(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await he(a):e==="#/company"?await se(a):e==="#/customers"?await ie(a):e==="#/products"?await ue(a):e==="#/backup"?await ne(a):e==="#/login"?oe(a):e==="#/logout"?de():e==="#/status"?await pe(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{te()});te();
