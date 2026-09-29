(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))l(o);new MutationObserver(o=>{for(const c of o)if(c.type==="childList")for(const d of c.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&l(d)}).observe(document,{childList:!0,subtree:!0});function t(o){const c={};return o.integrity&&(c.integrity=o.integrity),o.referrerPolicy&&(c.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?c.credentials="include":o.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function l(o){if(o.ep)return;o.ep=!0;const c=t(o);fetch(o.href,c)}})();const I="einv-token";function C(){try{return localStorage.getItem(I)}catch{return null}}function F(e){try{e?localStorage.setItem(I,e):localStorage.removeItem(I)}catch{}}async function E(e,a){const t=await L(e,{headers:{"content-type":"application/json"},...a});if(!t.ok){const l=await t.json().catch(()=>({}));throw new Error(l.error??`HTTP ${t.status}`)}return await t.json()}async function L(e,a){const t={...a?.headers??{}},l=C();l&&(t.authorization=`Bearer ${l}`);const o=await fetch(e,{...a,headers:t});if(o.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return o}async function U(e,a){const t=await L(e);if(!t.ok){const d=await t.json().catch(()=>({}));throw new Error(d.error??`Download fehlgeschlagen (HTTP ${t.status})`)}const l=await t.blob(),o=/filename="([^"]+)"/.exec(t.headers.get("content-disposition")??""),c=document.createElement("a");c.href=URL.createObjectURL(l),c.download=o?.[1]??a,document.body.appendChild(c),c.click(),c.remove(),window.setTimeout(()=>URL.revokeObjectURL(c.href),1e4)}async function ae(e){const a=await L(e);if(!a.ok){const o=await a.json().catch(()=>({}));throw new Error(o.error??`Öffnen fehlgeschlagen (HTTP ${a.status})`)}const t=await a.blob(),l=URL.createObjectURL(t);window.open(l,"_blank","noopener"),window.setTimeout(()=>URL.revokeObjectURL(l),6e4)}const $={health:()=>E("/api/health"),list:(e={})=>{const a=new URLSearchParams(e).toString();return E(`/api/invoices${a?`?${a}`:""}`)},get:e=>E(`/api/invoices/${e}`),create:e=>E("/api/invoices",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>E(`/api/invoices/${e}`,{method:"PATCH",body:JSON.stringify(a)}),issue:e=>E(`/api/invoices/${e}/issue`,{method:"POST"}),validate:e=>E(`/api/invoices/${e}/validate`,{method:"POST"}),pdfUrl:e=>`/api/invoices/${e}.pdf`,xmlUrl:e=>`/api/invoices/${e}.xml`,xlsxUrl:e=>`/api/invoices/${e}.xlsx`,company:{list:()=>E("/api/company-profiles"),getDefault:()=>E("/api/company-profiles/default"),create:(e,a)=>E("/api/company-profiles",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>E(`/api/company-profiles/${e}`,{method:"PUT",body:JSON.stringify(a)})},customers:{list:()=>E("/api/customers"),create:(e,a)=>E("/api/customers",{method:"POST",body:JSON.stringify({name:e,profile:a})}),update:(e,a)=>E(`/api/customers/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>E(`/api/customers/${e}`,{method:"DELETE"})},products:{list:()=>E("/api/products"),create:e=>E("/api/products",{method:"POST",body:JSON.stringify(e)}),update:(e,a)=>E(`/api/products/${e}`,{method:"PUT",body:JSON.stringify(a)}),remove:e=>E(`/api/products/${e}`,{method:"DELETE"})},exportUrl:(e={})=>{const a=new URLSearchParams(e).toString();return`/api/invoices/export.xlsx${a?`?${a}`:""}`}};function n(e){return String(e??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[a]??a)}function T(e){return`${Number(e).toFixed(2)} EUR`}function O(e){return e.split("/").pop()??e}async function ne(e){e.innerHTML='<div class="card">Lade Backups…</div>';let a=[],t="",l=!1;async function o(){const d=await L("/api/backups");if(!d.ok)throw new Error("Backups konnten nicht geladen werden");a=await d.json(),c()}function c(){e.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
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
		</div>`,e.querySelector("#b-now")?.addEventListener("click",async()=>{try{const d=await L("/api/backups",{method:"POST"});if(!d.ok)throw new Error((await d.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const y=await d.json();t=`Gesichert: ${O(y.filename)}`,l=!1,await o()}catch(d){t=d.message,l=!0,c()}}),e.querySelectorAll("[data-dl]").forEach(d=>d.addEventListener("click",async()=>{const y=d.dataset.dl??"";try{await U(`/api/backups/file/${O(y)}`,O(y))}catch(i){t=i.message,l=!0,c()}})),e.querySelectorAll("[data-restore]").forEach(d=>d.addEventListener("click",async()=>{const y=d.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${O(y)}? Die aktuelle Datenbank wird ersetzt.`))try{const i=await L("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:y})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const v=await i.json();t=`Wiederhergestellt: ${v.invoices} Rechnungen, ${v.templates} Vorlagen${v.fileErrors.length>0?` (${v.fileErrors.length} Dateifehler)`:""}`,l=!1,await o()}catch(i){t=i.message,l=!0,c()}})),e.querySelector("#b-upload")?.addEventListener("click",async()=>{const d=e.querySelector("#b-file")?.files?.[0];if(!d){t="Bitte zuerst eine ZIP-Datei wählen",l=!0,c();return}if(window.confirm(`Wirklich wiederherstellen aus ${d.name}? Die aktuelle Datenbank wird ersetzt.`))try{const y=await new Promise((f,s)=>{const r=new FileReader;r.onload=()=>f(String(r.result).split(",")[1]),r.onerror=()=>s(new Error("Datei nicht lesbar")),r.readAsDataURL(d)}),i=await L("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:y})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const v=await i.json();t=`Wiederhergestellt: ${v.invoices} Rechnungen, ${v.templates} Vorlagen`,l=!1,await o()}catch(y){t=y.message,l=!0,c()}})}try{await o()}catch(d){e.innerHTML=`<div class="card error">${n(d.message)}</div>`}}const J=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function P(e,a,t){const l=e[a],o=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(o)}" /></label>`}async function se(e){e.innerHTML='<div class="card">Lade Firmendaten…</div>';let a=null,t="",l=!1;try{a=await $.company.getDefault(),a||(a=(await $.company.list())[0]??null)}catch(c){e.innerHTML=`<div class="card error">${n(c.message)}</div>`;return}function o(){const c=a?.profile??J();e.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(a?.name??"Meine Firma")}" /></label>
			${P(c,"name","Firmenname")}
			${P(c,"street","Straße")}
			<div class="grid2">${P(c,"zip","PLZ")}${P(c,"city","Ort")}</div>
			<div class="grid2">${P(c,"country","Land")}${P(c,"email","E-Mail")}</div>
			<div class="grid2">${P(c,"phone","Telefon")}${P(c,"website","Webseite")}</div>
			<div class="grid2">${P(c,"vatId","USt-IdNr.")}${P(c,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${P(c,"bankName","Bankname")}${P(c,"iban","IBAN")}</div>
			<label>BIC<input data-f="bic" value="${n(c.bic??"")}" /></label>
			<h3>Fußzeilen-Boxen (Rechnung unten)</h3>
			<p class="muted">Leer lassen = automatisch aus den Firmendaten (Adresse, Kontakt, Bank, Steuer). Je Box eine Zeile pro Zeile, Ausrichtung pro Box.</p>
			${[0,1,2,3].map(d=>`<div class="grid2"><label>Box ${d+1}<textarea data-fbox="${d}" rows="3">${n((c.footerBoxes??[])[d]??"")}</textarea></label>
				<label>Ausrichtung<select data-falign="${d}">
					${["left","center","right"].map(y=>`<option value="${y}" ${(c.footerAlign??[])[d]===y||!(c.footerAlign??[])[d]&&y==="left"?"selected":""}>${y==="left"?"Links":y==="center"?"Zentriert":"Rechts"}</option>`).join("")}
				</select></label></div>`).join("")}
			${t?`<p class="${l?"error":""}">${n(t)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,e.querySelector("#c-save")?.addEventListener("click",async()=>{const d={...J()};e.querySelectorAll("input[data-f]").forEach(v=>{d[v.dataset.f]=v.value});const y=[0,1,2,3].map(v=>e.querySelector(`textarea[data-fbox="${v}"]`)?.value??"");y.some(v=>v.trim()!=="")?(d.footerBoxes=y,d.footerAlign=[0,1,2,3].map(v=>{const f=e.querySelector(`select[data-falign="${v}"]`)?.value;return f==="center"||f==="right"?f:"left"})):(delete d.footerBoxes,delete d.footerAlign);const i=e.querySelector("#c-name")?.value.trim()||"Meine Firma";try{a?a=await $.company.update(a.id,{name:i,profile:d}):a=await $.company.create(i,d),t="Gespeichert.",l=!1,o()}catch(v){t=v.message,l=!0,o()}})}o()}const V=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function M(e,a,t){const l=e[a],o=Array.isArray(l)?l.join(`
`):l??"";return`<label>${t}<input data-f="${a}" value="${n(o)}" /></label>`}async function ie(e){e.innerHTML='<div class="card">Lade Kunden…</div>';let a=[],t=null,l=!1,o="",c=!1;async function d(){a=await $.customers.list(),i()}function y(f,s){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(s)}" /></label>
		${M(f,"name","Firmenname")}
		${M(f,"street","Straße")}
		<div class="grid2">${M(f,"zip","PLZ")}${M(f,"city","Ort")}</div>
		<div class="grid2">${M(f,"country","Land")}${M(f,"email","E-Mail")}</div>
		<div class="grid2">${M(f,"phone","Telefon")}${M(f,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(f.customerNumber)}" /></label>`}function i(){e.innerHTML=`
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
			${y(t?.profile??V(),t?.name??"")}
			${o?`<p class="${c?"error":""}">${n(o)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#k-new")?.addEventListener("click",()=>{t=null,l=!0,o="",i()}),e.querySelectorAll("[data-edit]").forEach(f=>f.addEventListener("click",()=>{t=a.find(s=>s.id===f.dataset.edit)??null,l=!1,o="",i()})),e.querySelectorAll("[data-del]").forEach(f=>f.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await $.customers.remove(f.dataset.del??""),await d()}catch(s){o=s.message,c=!0,i()}})),e.querySelector("#k-cancel")?.addEventListener("click",()=>{t=null,l=!1,o="",i()}),e.querySelector("#k-save")?.addEventListener("click",()=>{v()})}async function v(){const f={...V()};e.querySelectorAll("input[data-f]").forEach(r=>{f[r.dataset.f]=r.value});const s=e.querySelector("#k-name")?.value.trim()||f.name.trim()||"Kunde";try{l?await $.customers.create(s,f):t&&await $.customers.update(t.id,{name:s,profile:f}),t=null,l=!1,o="",await d()}catch(r){o=r.message,c=!0,i()}}try{await d()}catch(f){e.innerHTML=`<div class="card error">${n(f.message)}</div>`}}function re(e){return`<span class="badge ${e}">${e}</span>`}async function le(e){e.innerHTML=`
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
		<div id="list-err"></div>`;const a=e.querySelector("#f-status"),t=e.querySelector("#f-q"),l=e.querySelector("#list"),o=e.querySelector("#list-err");let c=0;function d(v){o.innerHTML=`<div class="card error">${n(v.message)}</div>`}async function y(){const v=++c,f={};a.value&&(f.status=a.value),t.value.trim()&&(f.q=t.value.trim());try{const s=await $.list(f);if(v!==c)return;l.innerHTML=s.map(r=>`<div class="card"><div class="row">
					<strong>${n(r.number??"(Entwurf)")}</strong>${re(r.status)}
					<span>${n(r.buyer.name||"—")}</span>
					<span>${T(r.totals.grossTotal)}</span>
					<a href="#/invoices/${n(r.id)}">Ansehen</a>
					${r.status==="draft"?`<a href="#/edit/${n(r.id)}">Bearbeiten</a>`:""}
					${r.pdfPath?`<button class="secondary" data-dl="pdf:${n(r.id)}:${n(r.number??"rechnung")}">PDF ↓</button>`:""}
					${r.xml?`<button class="secondary" data-dl="xml:${n(r.id)}:${n(r.number??"rechnung")}">XML ↓</button>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>',l.querySelectorAll("[data-dl]").forEach(r=>r.addEventListener("click",async()=>{const[p,w,N]=(r.dataset.dl??"").split(":"),h=p==="pdf"?$.pdfUrl(w):$.xmlUrl(w);try{await U(h,`${N}.${p}`)}catch(k){d(k)}}))}catch(s){if(v!==c)return;l.innerHTML=`<div class="card error">${n(s.message)}</div>`}}a.onchange=()=>{y()};let i;t.oninput=()=>{i!==void 0&&clearTimeout(i),i=setTimeout(()=>{y()},250)},e.querySelector("#f-export")?.addEventListener("click",async()=>{const v={};a.value&&(v.status=a.value),t.value.trim()&&(v.q=t.value.trim());try{await U($.exportUrl(v),"export.xlsx")}catch(f){d(f)}}),await y()}function H(e){return Math.round((e+Number.EPSILON)*100)/100}function ce(e){const a=(e??"").trim(),[t,l]=a.split(".."),o=c=>/^\d{4}-\d{2}-\d{2}$/.test(c??"")?`${c.slice(8,10)}.${c.slice(5,7)}.${c.slice(0,4)}`:c??"";return l?`${o(t)} – ${o(l)}`:o(t)}async function oe(e,a){e.innerHTML='<div class="card">Lade…</div>';try{const t=await $.get(a),o=(Array.isArray(t.lines)?t.lines:[]).map(i=>{const v=Math.min(Math.max(Number(i.discountPercent)||0,0),100),f=Number(i.quantity)||0,s=Number(i.unitPriceNet)||0;return{line:i,discount:v,gross:H(f*s),net:H(f*s*(1-v/100))}}),c=o.some(i=>i.discount>0);e.innerHTML=`
			<div class="card"><div class="row">
				<strong>${n(t.number??"(Entwurf)")}</strong>
				<span class="badge ${t.status}">${t.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${n(t.seller.name)}<br />${n(t.seller.street)}<br />${n(t.seller.zip)} ${n(t.seller.city)}</div>
				<div><strong>Käufer</strong><br />${n(t.buyer.name)}<br />${n(t.buyer.street)}<br />${n(t.buyer.zip)} ${n(t.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${n(t.issueDate)} · Leistung: ${n(ce(t.deliveryDate))}${t.dueDate?` · Fällig: ${n(t.dueDate)}`:""}</p>
			<table class="lines"><tr>
				<th>#</th><th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
				${c?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
				<th class="r">USt</th><th class="r">Netto</th>
			</tr>
			${o.map((i,v)=>`<tr>
					<td>${v+1}</td><td>${n(i.line.description)}${i.line.sku?` (${n(i.line.sku)})`:""}</td>
					<td class="r">${n(i.line.quantity)} ${n(i.line.unit)}</td>
					<td class="r">${T(Number(i.line.unitPriceNet))}</td>
					${c?`<td class="r">${i.discount>0?`${n(i.discount)} %`:"–"}</td><td class="r">${i.discount>0?T(H(i.gross-i.net)):"–"}</td>`:""}
					<td class="r">${n(i.line.vatRate)} %</td><td class="r"><strong>${T(i.net)}</strong></td>
				</tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${T(t.totals.grossTotal)}</strong> <span class="muted">(netto ${T(t.totals.netTotal)} + USt ${T(t.totals.taxTotal)})</span></p>
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
			</div><div id="d-out"></div></div>`;const d=e.querySelector("#d-out"),y=i=>{d.innerHTML=`<p class="error">${n(i.message)}</p>`};e.querySelectorAll("[data-dl]").forEach(i=>i.addEventListener("click",async()=>{const v=i.dataset.dl,f=v==="pdf"?$.pdfUrl(t.id):v==="xml"?$.xmlUrl(t.id):$.xlsxUrl(t.id);try{await U(f,`${t.number??"rechnung"}.${v}`)}catch(s){y(s)}})),e.querySelector("[data-view]")?.addEventListener("click",async()=>{try{await ae($.pdfUrl(t.id))}catch(i){y(i)}}),e.querySelector("#d-validate")?.addEventListener("click",async()=>{d.innerHTML='<p class="muted">Validiere…</p>';try{const i=await $.validate(t.id);d.innerHTML=i.formatErrors.length+i.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...i.formatErrors,...i.businessErrors].map(v=>`<li class="error">${n(v)}</li>`).join("")}</ul>`}catch(i){d.innerHTML=`<p class="error">${n(i.message)}</p>`}}),e.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const i=await $.issue(t.id);location.hash=`#/invoices/${i.id}`,location.reload()}catch(i){d.innerHTML=`<p class="error">${n(i.message)}</p>`}})}catch(t){e.innerHTML=`<div class="card error">${n(t.message)}</div>`}}function de(e){const a=C();e.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(a??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${a?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,e.querySelector("#l-save")?.addEventListener("click",()=>{const t=e.querySelector("#l-token")?.value.trim()??"";F(t||null),location.hash="#/"}),e.querySelector("#l-out")?.addEventListener("click",()=>{F(null),location.hash="#/login",location.reload()})}function ue(){F(null),location.hash="#/login"}async function pe(e){e.innerHTML='<div class="card">Lade Positionen…</div>';let a=[],t=null,l=!1,o="",c=!1;async function d(){a=await $.products.list(),i()}function y(s){const r=p=>n(p??"");return`
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
			${o?`<p class="${c?"error":""}">${n(o)}</p>`:""}
			<div class="row"><button id="p-save">Speichern</button><button class="secondary" id="p-cancel">Abbrechen</button></div>
		</div>`:""}`,e.querySelector("#p-new")?.addEventListener("click",()=>{t=null,l=!0,o="",i()}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{t=a.find(r=>r.id===s.dataset.edit)??null,l=!1,o="",i()})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{if(window.confirm("Position wirklich löschen?"))try{await $.products.remove(s.dataset.del??""),await d()}catch(r){o=r.message,c=!0,i()}})),e.querySelector("#p-cancel")?.addEventListener("click",()=>{t=null,l=!1,o="",i()}),e.querySelector("#p-save")?.addEventListener("click",()=>{f()})}function v(){return{sku:e.querySelector("#p-sku")?.value.trim()??"",name:e.querySelector("#p-name")?.value.trim()??"",details:e.querySelector("#p-details")?.value.trim()??"",unit:e.querySelector("#p-unit")?.value.trim()||"Stk",unitPriceNet:Number(e.querySelector("#p-price")?.value??0),vatRate:Number(e.querySelector("#p-vat")?.value??19)}}async function f(){const s=v();try{l?await $.products.create(s):t&&await $.products.update(t.id,s),t=null,l=!1,o="",await d()}catch(r){o=r.message,c=!0,i()}}try{await d()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}async function me(e){try{const a=await $.health();e.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(a.version)} · Schema: ${n(String(a.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(a.counts,null,2))}</pre></div>`}catch(a){e.innerHTML=`<div class="card error">API nicht erreichbar: ${n(a.message)}</div>`}}const he=["title","meta","parties","positions","totals"],G=["payment","notes"];async function fe(e){e.innerHTML='<div class="card">Lade Vorlagen…</div>';let a=[],t=null,l="",o=[];try{const s=await L("/api/company-profiles");s.ok&&(o=await s.json())}catch{}async function c(){a=await d(),i()}async function d(){const s=await L("/api/templates");if(!s.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await s.json()}function y(s){const r=s.definition,p=(w,N,h)=>`<label><input type="checkbox" data-f="blocks.${w}" ${r.blocks[w]?"checked":""} ${h?"disabled":""} style="width:auto" /> ${N}${h?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(s.name)}" /></label>
		<label>Verknüpfte Firma (für Vorschau)<select id="t-company">
			<option value="">– Musterfirma –</option>
			${o.map(w=>`<option value="${n(w.id)}" ${s.definition.companyId===w.id?"selected":""}>${n(w.name)}</option>`).join("")}
		</select></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(r.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(r.colors.text)}" /></label>
		</div>
		${he.map(w=>p(w,`Block ${w}`,!0)).join("")}
		${G.map(w=>p(w,`Block ${w}`,!1)).join("")}
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
		</div>`:""}`,e.querySelector("#t-new")?.addEventListener("click",async()=>{try{const p=(await(await L("/api/templates")).json())[0];if(!p){l="Keine Basisvorlage vorhanden",i();return}t={...structuredClone(p),id:"neu",name:"Neu",version:1,isDefault:!1},l="",i()}catch(s){l=s.message,i()}}),e.querySelectorAll("[data-edit]").forEach(s=>s.addEventListener("click",()=>{const r=a.find(p=>p.id===s.dataset.edit);r&&(t=structuredClone(r),l="",i())})),e.querySelectorAll("[data-prev]").forEach(s=>s.addEventListener("click",async()=>{const r=a.find(p=>p.id===s.dataset.prev);if(r)try{const p=await L("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:r.definition})});if(!p.ok){const N=await p.json().catch(()=>({}));throw new Error(N.error??"Vorschau fehlgeschlagen")}const w=await p.blob();window.open(URL.createObjectURL(w),"_blank")}catch(p){l=p.message,i()}})),e.querySelectorAll("[data-def]").forEach(s=>s.addEventListener("click",async()=>{try{if(!(await L(`/api/templates/${s.dataset.def}/default`,{method:"POST"})).ok)throw new Error("Umschalten fehlgeschlagen");t=null,await c()}catch(r){l=r.message,i()}})),e.querySelectorAll("[data-del]").forEach(s=>s.addEventListener("click",async()=>{const r=await L(`/api/templates/${s.dataset.del}`,{method:"DELETE"});if(!r.ok){l=(await r.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",i();return}await c()})),e.querySelector("#t-cancel")?.addEventListener("click",()=>{t=null,l="",i()}),e.querySelector("#t-save")?.addEventListener("click",()=>{f()}),e.querySelector("#t-preview")?.addEventListener("click",async()=>{const s=v();if(s)try{const r=await L("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:s.definition})});if(!r.ok){const p=await r.json().catch(()=>({}));throw new Error(p.error??"Vorschau fehlgeschlagen")}window.open(URL.createObjectURL(await r.blob()),"_blank")}catch(r){l=r.message,i()}})}function v(){if(!t)return null;const s=structuredClone(t.definition);s.name=(e.querySelector("#t-name")?.value??s.name).trim(),s.colors.primary=e.querySelector("#t-c1")?.value??s.colors.primary,s.colors.text=e.querySelector("#t-c2")?.value??s.colors.text;for(const p of G)s.blocks[p]=e.querySelector(`[data-f="blocks.${p}"]`)?.checked??s.blocks[p];for(const p of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline","showFooterBoxes"])s[p]=e.querySelector(`[data-f="${p}"]`)?.checked??!1;s.footerText=e.querySelector("#t-footer")?.value??"";const r=e.querySelector("#t-company")?.value??"";return r?s.companyId=r:delete s.companyId,s.introText=e.querySelector("#t-intro")?.value??"",s.closingText=e.querySelector("#t-closing")?.value??"",s.signatureName=e.querySelector("#t-sign")?.value??"",s.headerExtra=e.querySelector("#t-hextra")?.value??"",s.logo&&(s.logo.position=e.querySelector("#t-lpos")?.value??"right",s.logo.widthMm=Number(e.querySelector("#t-lw")?.value??30)),{name:s.name,definition:s}}async function f(){const s=v();if(!s)return;const r=s.definition;try{let p=t.id;if(p==="neu"){const N=await L("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");p=(await N.json()).id}else{const N=await L(`/api/templates/${p}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!N.ok)throw new Error((await N.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const w=e.querySelector("#t-logo")?.files?.[0];if(w){const N=await new Promise((k,u)=>{const m=new FileReader;m.onload=()=>k(String(m.result).split(",")[1]),m.onerror=()=>u(new Error("Datei nicht lesbar")),m.readAsDataURL(w)}),h=await L(`/api/templates/${p}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:w.name,mime:w.type,dataBase64:N})});if(!h.ok)throw new Error((await h.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}t=null,l="",await c()}catch(p){l=p.message,i()}}try{await c()}catch(s){e.innerHTML=`<div class="card error">${n(s.message)}</div>`}}const W=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),B=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19});function R(e){return Math.round((e+Number.EPSILON)*100)/100}function Z(e){const a=Number(e.quantity)||0,t=Number(e.unitPriceNet)||0,l=Math.min(Math.max(Number(e.discountPercent)||0,0),100);return R(a*t*(1-l/100))}function ve(e){return(e??"").trim().split("..")[0]??""}function be(e){const a=(e??"").trim().split("..");return a.length>1?a[1]:""}const j="einv-wizard-v1",Q="einv-employee";function ee(){try{return localStorage.getItem(Q)??""}catch{return""}}function _(){return new Date().toISOString().slice(0,10)}function K(){return{step:0,seller:W(),buyer:W(),lines:[B()],issueDate:_(),deliveryDate:_(),dueDate:"",employee:ee(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,dirty:!1,error:"",savedAt:new Date().toISOString()}}function z(e){return e.dirty&&(e.seller.name.trim()!==""||e.buyer.name.trim()!==""||e.lines.some(a=>a.description.trim()!==""||a.unitPriceNet!==0))}function ye(){try{const e=localStorage.getItem(j);if(!e)return null;const a=JSON.parse(e);return!a||!Array.isArray(a.lines)||!a.seller||!a.buyer?null:{...K(),...a,error:"",step:Math.min(Number(a.step)||0,3)}}catch{return null}}function X(e,a,t){return`
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
		<label>IBAN<input data-p="${e}" data-f="iban" value="${n(a.iban)}" /></label>`:`<label class="req">Kundennummer (BT-10) *<input data-p="${e}" data-f="customerNumber" value="${n(a.customerNumber)}" placeholder="Pflicht im deutschen E-Rechnungs-Profil" /></label>`}`}const $e=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"],ge={E:"steuerfrei",AE:"Reverse Charge (§13b UStG)",K:"Kraftfahrzeug (§4 Nr. 1b UStG)",G:"Gold (§4 Nr. 1a UStG)",O:"nicht umkehrbar"};function Y(e,a){let t=K();const l=!!a;let o=[],c=[],d=[],y=!1;if(a){e.innerHTML='<div class="card">Lade Entwurf…</div>',$.get(a).then(h=>{if(h.status!=="draft"){e.innerHTML=`<div class="card error">Nur Entwürfe sind änderbar (diese Rechnung ist ${n(h.status)}).</div>`;return}t={...K(),seller:h.seller,buyer:h.buyer,lines:h.lines.length>0?h.lines:[B()],issueDate:h.issueDate,deliveryDate:h.deliveryDate,dueDate:h.dueDate??"",employee:h.employeeCode??ee(),documentTitle:h.documentTitle,notes:h.notes??"",draftId:h.id},v(),p()}).catch(h=>{e.innerHTML=`<div class="card error">${n(h.message)}</div>`});return}const i=ye();if(i&&z(i)&&!i.draftId){e.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(i.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,e.querySelector("#w-resume")?.addEventListener("click",()=>{t=i,v(),p()}),e.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(j),v(),p()});return}i&&z(i)&&(t=i),v(),z(t)||$.company.getDefault().then(h=>{h&&!t.seller.name.trim()&&h.profile.name.trim()&&(t.seller={...t.seller,...h.profile},t.selectedCompany=h.id,p(!0))}).catch(()=>{});function v(){$.company.list().then(h=>{o=h,(t.step===0||t.step===1)&&!e.querySelector("#w-company")&&!e.querySelector("#w-customer")&&p()}).catch(()=>{}),$.customers.list().then(h=>{c=h,t.step===1&&!e.querySelector("#w-customer")&&p()}).catch(()=>{}),$.products.list().then(h=>{d=h,t.step===2&&!e.querySelector("#w-catalog")&&p()}).catch(()=>{})}function f(){try{if(l)return;if(!t.dirty){localStorage.removeItem(j);return}localStorage.setItem(j,JSON.stringify({...t,error:"",savedAt:new Date().toISOString()}))}catch{}}function s(){e.querySelectorAll("input[data-p]").forEach(m=>{const g=m.dataset.p==="seller"?t.seller:t.buyer;g[m.dataset.f]=m.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(m=>{const[g,S]=m.dataset.l.split("."),q=t.lines[Number(g)];if(q)if(S==="quantity"||S==="unitPriceNet"||S==="vatRate"||S==="discountPercent"){const x=Number(m.value),A=Number.isFinite(x)?x:0;q[S]=S==="discountPercent"?Math.min(Math.max(A,0),100):A}else q[S]=m.value});const h=m=>e.querySelector(`#${m}`)?.value??"",k=()=>{const m=h("w-delivery");if(!m)return;const g=h("w-delivery-to");t.deliveryDate=g&&g!==m?`${m}..${g}`:m};t.issueDate=h("w-issue")||t.issueDate,k(),e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee")),e.querySelector("#w-title")&&(t.documentTitle=h("w-title")||t.documentTitle);const u=e.querySelector("#w-notes");u&&(t.notes=u.value),f()}function r(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((k,u)=>`<span class="${u===t.step?"on":""}">${u+1}. ${k}</span>`).join("")}</div>`}function p(h=!1){h||s();let k="";if(t.step===0&&(k=`<div class="card"><h3>Verkäufer</h3>
				${o.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${o.map(u=>`<option value="${n(u.id)}" ${t.selectedCompany===u.id?"selected":""}>${n(u.name)}${u.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${X("seller",t.seller,!0)}</div>`),t.step===1&&(k=`<div class="card"><h3>Käufer</h3>
				${c.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${c.map(u=>`<option value="${n(u.id)}" ${t.selectedCustomer===u.id?"selected":""}>${n(u.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${X("buyer",t.buyer,!1)}</div>`),t.step===2&&(k=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${$e.map(u=>`<option ${u===t.documentTitle?"selected":""}>${u}</option>`).join("")}
				</select></label>
				${d.length>0?`<div class="row"><label style="flex:1">Aus Positionen übernehmen<select id="w-catalog">
							${d.map(u=>`<option value="${n(u.id)}">${n(u.sku?`${u.sku} · `:"")}${n(u.name)}</option>`).join("")}
						</select></label><button class="secondary" id="w-take" style="align-self:end">Übernehmen</button></div>`:""}
				${t.lines.map((u,m)=>`<div class="card line" style="background:var(--bg)">
					<div class="line-head"><span class="line-no">${m+1}</span><strong>Position ${m+1}</strong>
						<span class="line-sum">${T(Z(u))}</span></div>
					<div class="grid2">
						<label>Bezeichnung<input data-l="${m}.description" value="${n(u.description)}" /></label>
						<label>Art.Nr.<input data-l="${m}.sku" value="${n(u.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${m}.details" rows="1">${n(u.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${m}.quantity" type="number" min="0" step="any" value="${n(u.quantity)}" /></label>
						<label>Einheit<input data-l="${m}.unit" value="${n(u.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${m}.unitPriceNet" type="number" min="0" step="0.01" value="${n(u.unitPriceNet)}" /></label>
						<label>Rabatt %<input data-l="${m}.discountPercent" type="number" min="0" max="100" step="0.1" value="${n(u.discountPercent??0)}" /></label>
					</div>
					<div class="grid2">
						<label>USt %<select data-l="${m}.vatRate">
							${[19,7,0].map(g=>`<option ${g===Number(u.vatRate)?"selected":""}>${g}</option>`).join("")}
						</select></label>
						${Number(u.vatRate)===0?`<label>Steuerbefreiung<select data-l="${m}.exemptionCategory">
								${["E","AE","K","G","O"].map(g=>`<option ${(u.exemptionCategory??"E")===g?"selected":""} value="${g}">${g} — ${ge[g]}</option>`).join("")}
							</select></label>
							<label>Begründung<textarea data-l="${m}.exemptionReason" rows="1" placeholder="z. B. Reverse Charge §13b UStG">${n(u.exemptionReason)}</textarea></label>`:""}
					</div>
					<button class="secondary" data-del="${m}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(t.issueDate)}" /></label>
					<label>Fällig am<input id="w-due" type="date" value="${n(t.dueDate)}" /></label>
				</div>
				<fieldset class="period">
					<legend>Leistungszeitraum</legend>
					<div class="grid2">
						<label>von<input id="w-delivery" type="date" value="${n(ve(t.deliveryDate))}" /></label>
						<label>bis (optional)<input id="w-delivery-to" type="date" value="${n(be(t.deliveryDate))}" /></label>
					</div>
					<p class="muted">Nur „von" angeben, wenn die Leistung an einem Tag erbracht wurde. Mit „bis" wird der Zeitraum als BT-74/BT-75 in die Rechnung geschrieben.</p>
				</fieldset>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(t.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(t.notes)}</textarea></label>
			</div>`),t.step===3){const u=t.lines.map(b=>{const D=Math.min(Math.max(Number(b.discountPercent)||0,0),100);return{...b,discount:D,gross:R((Number(b.quantity)||0)*(Number(b.unitPriceNet)||0)),net:Z(b)}}).filter(b=>b.description.trim()!==""||b.gross>0),m=new Map;for(const b of u)m.set(Number(b.vatRate)||0,R((m.get(Number(b.vatRate)||0)??0)+b.net));const g=[...m.entries()].sort(([b],[D])=>b-D).map(([b,D])=>({rate:b,net:D,tax:R(D*b/100)})),S=R(g.reduce((b,D)=>b+D.net,0)),q=R(g.reduce((b,D)=>b+D.tax,0)),x=R(S+q),A=u.some(b=>b.discount>0);k=`<div class="card"><h3>Prüfen &amp; Ausstellen</h3>
				<p><strong>${n(t.documentTitle)}</strong> · ${n(t.seller.name||"—")} → ${n(t.buyer.name||"—")} · ${u.length} Positionen</p>
				<table class="ovw">
					<thead><tr>
						<th>Bezeichnung</th><th class="r">Menge</th><th class="r">Preis netto</th>
						${A?'<th class="r">Rabatt</th><th class="r">Rabatt €</th>':""}
						<th class="r">USt</th><th class="r">Netto</th>
					</tr></thead>
					<tbody>${u.map(b=>`<tr>
							<td>${n(b.description)||'<span class="muted">–</span>'}</td>
							<td class="r">${n(b.quantity)} ${n(b.unit)}</td>
							<td class="r">${T(b.unitPriceNet)}</td>
							${A?`<td class="r">${b.discount>0?`${n(b.discount)} %`:"–"}</td><td class="r">${b.discount>0?T(R(b.gross-b.net)):"–"}</td>`:""}
							<td class="r">${n(b.vatRate)} %</td><td class="r"><strong>${T(b.net)}</strong></td>
						</tr>`).join("")}</tbody>
				</table>
				<table class="ovw sums">
					<tbody>
						<tr><td class="lbl">Netto</td><td class="r">${T(S)}</td></tr>
						${g.map(b=>`<tr class="sub"><td class="lbl">USt ${n(b.rate)} % auf ${T(b.net)}</td><td class="r">${T(b.tax)}</td></tr>`).join("")}
						<tr class="sum total"><td class="lbl">Gesamtbetrag</td><td class="r">${T(x)}</td></tr>
					</tbody>
				</table>
				<p class="muted">Exakte Summen und Validierung (XSD, EN16931, BR-Regeln) erfolgen serverseitig beim Ausstellen.</p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}e.innerHTML=`${r()}${k}
			${t.error?`<div class="card error">${n(t.error)}</div>`:""}
			<div class="row">
				${t.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${t.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,e.querySelector("#w-back")?.addEventListener("click",()=>{t.step--,p()}),e.querySelector("#w-company")?.addEventListener("change",()=>{const u=e.querySelector("#w-company")?.value??"",m=o.find(g=>g.id===u);m?(t.seller={...t.seller,...m.profile},t.selectedCompany=m.id,p(!0)):t.selectedCompany=null}),e.querySelector("#w-customer")?.addEventListener("change",()=>{const u=e.querySelector("#w-customer")?.value??"",m=c.find(g=>g.id===u);m?(t.buyer={...t.buyer,...m.profile},t.selectedCustomer=m.id,p(!0)):t.selectedCustomer=null}),e.querySelector("#w-next")?.addEventListener("click",()=>{t.step++,p()}),e.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen und zur Übersicht?")&&(localStorage.removeItem(j),location.hash="#/")}),e.querySelector("#w-add")?.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.push(B()),p()}),e.querySelector("#w-take")?.addEventListener("click",()=>{s();const u=e.querySelector("#w-catalog")?.value??"",m=d.find(g=>g.id===u);if(m){const g={description:m.name,sku:m.sku||void 0,details:m.details||void 0,quantity:1,unit:m.unit,unitPriceNet:m.unitPriceNet,vatRate:m.vatRate},S=t.lines.findIndex(q=>!q.description.trim()&&!(q.sku??"").trim()&&!(q.details??"").trim()&&q.unitPriceNet===0);S>=0?t.lines[S]=g:t.lines.push(g),t.dirty=!0}p(!0)}),e.querySelectorAll("[data-del]").forEach(u=>u.addEventListener("click",()=>{s(),t.dirty=!0,t.lines.splice(Number(u.dataset.del),1),t.lines.length===0&&t.lines.push(B()),p(!0)})),e.querySelector("#w-save")?.addEventListener("click",()=>{w(!1)}),e.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&w(!0)})}async function w(h){if(!y){y=!0;try{s(),t.error="";const k={seller:t.seller,buyer:t.buyer,lines:t.lines,issueDate:t.issueDate,deliveryDate:t.deliveryDate,dueDate:t.dueDate||void 0,currency:"EUR",employeeCode:t.employee.trim()||void 0,documentTitle:t.documentTitle,notes:t.notes||void 0};try{if(t.employee.trim())try{localStorage.setItem(Q,t.employee.trim())}catch{}let u;t.draftId?u=await $.update(t.draftId,k):(u=await $.create(k),t.draftId=u.id),h&&(u=await $.issue(u.id));try{localStorage.removeItem(j)}catch{}location.hash=`#/invoices/${u.id}`}catch(u){t.error=u.message,p()}}finally{y=!1}}}e.addEventListener("input",()=>{try{N()}catch{}});function N(){t.dirty=!0,e.querySelectorAll("input[data-p]").forEach(S=>{const q=S.dataset.p==="seller"?t.seller:t.buyer;q[S.dataset.f]=S.value}),e.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(S=>{const[q,x]=S.dataset.l.split("."),A=t.lines[Number(q)];A&&(x==="quantity"||x==="unitPriceNet"||x==="vatRate"||x==="discountPercent"?A[x]=Number(S.value):A[x]=S.value)});const h=S=>e.querySelector(`#${S}`)?.value??"",k=h("w-issue"),u=h("w-delivery"),m=h("w-delivery-to");k&&(t.issueDate=k),u&&(t.deliveryDate=m&&m!==u?`${u}..${m}`:u),e.querySelector("#w-due")&&(t.dueDate=h("w-due")),e.querySelector("#w-employee")&&(t.employee=h("w-employee"));const g=h("w-title");g&&(t.documentTitle=g),t.notes=e.querySelector("#w-notes")?.value??t.notes,f()}p()}const we=document.querySelector("#app");function Se(e){const a=!!C(),t=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/products","Positionen"],["#/backup","Backup"],["#/status","Status"],[a?"#/logout":"#/login",a?"Logout":"Login"]];we.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${t.map(([l,o])=>`<a href="${l}" class="${e===l||l==="#/"&&e.startsWith("#/invoices")?"active":""}">${o}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function te(){const e=location.hash||"#/";Se(e);const a=document.querySelector("#view");e==="#/"||e==="#"?await le(a):e==="#/new"?Y(a):e.startsWith("#/edit/")?Y(a,decodeURIComponent(e.slice(7))):e.startsWith("#/invoices/")?await oe(a,decodeURIComponent(e.slice(11))):e==="#/templates"?await fe(a):e==="#/company"?await se(a):e==="#/customers"?await ie(a):e==="#/products"?await pe(a):e==="#/backup"?await ne(a):e==="#/login"?de(a):e==="#/logout"?ue():e==="#/status"?await me(a):a.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{te()});te();
