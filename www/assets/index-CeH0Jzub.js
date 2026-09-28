(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))l(s);new MutationObserver(s=>{for(const u of s)if(u.type==="childList")for(const p of u.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&l(p)}).observe(document,{childList:!0,subtree:!0});function a(s){const u={};return s.integrity&&(u.integrity=s.integrity),s.referrerPolicy&&(u.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?u.credentials="include":s.crossOrigin==="anonymous"?u.credentials="omit":u.credentials="same-origin",u}function l(s){if(s.ep)return;s.ep=!0;const u=a(s);fetch(s.href,u)}})();const P="einv-token";function M(){try{return localStorage.getItem(P)}catch{return null}}function D(t){try{t?localStorage.setItem(P,t):localStorage.removeItem(P)}catch{}}async function g(t,e){const a=await $(t,{headers:{"content-type":"application/json"},...e});if(!a.ok){const l=await a.json().catch(()=>({}));throw new Error(l.error??`HTTP ${a.status}`)}return await a.json()}async function $(t,e){const a={...e?.headers??{}},l=M();l&&(a.authorization=`Bearer ${l}`);const s=await fetch(t,{...e,headers:a});if(s.status===401)throw location.hash.startsWith("#/login")||(location.hash="#/login"),new Error("Nicht angemeldet — bitte Token auf der Login-Seite eintragen");return s}const y={health:()=>g("/api/health"),list:(t={})=>{const e=new URLSearchParams(t).toString();return g(`/api/invoices${e?`?${e}`:""}`)},get:t=>g(`/api/invoices/${t}`),create:t=>g("/api/invoices",{method:"POST",body:JSON.stringify(t)}),update:(t,e)=>g(`/api/invoices/${t}`,{method:"PATCH",body:JSON.stringify(e)}),issue:t=>g(`/api/invoices/${t}/issue`,{method:"POST"}),validate:t=>g(`/api/invoices/${t}/validate`,{method:"POST"}),pdfUrl:t=>`/api/invoices/${t}.pdf`,xmlUrl:t=>`/api/invoices/${t}.xml`,xlsxUrl:t=>`/api/invoices/${t}.xlsx`,company:{list:()=>g("/api/company-profiles"),getDefault:()=>g("/api/company-profiles/default"),create:(t,e)=>g("/api/company-profiles",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>g(`/api/company-profiles/${t}`,{method:"PUT",body:JSON.stringify(e)})},customers:{list:()=>g("/api/customers"),create:(t,e)=>g("/api/customers",{method:"POST",body:JSON.stringify({name:t,profile:e})}),update:(t,e)=>g(`/api/customers/${t}`,{method:"PUT",body:JSON.stringify(e)}),remove:t=>g(`/api/customers/${t}`,{method:"DELETE"})},exportUrl:(t={})=>{const e=new URLSearchParams(t).toString();return`/api/invoices/export.xlsx${e?`?${e}`:""}`}};function n(t){return String(t??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]??e)}function k(t){return`${Number(t).toFixed(2)} EUR`}function T(t){return t.split("/").pop()??t}async function K(t){t.innerHTML='<div class="card">Lade Backups…</div>';let e=[],a="",l=!1;async function s(){const p=await $("/api/backups");if(!p.ok)throw new Error("Backups konnten nicht geladen werden");e=await p.json(),u()}function u(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Backup & Wiederherstellung</strong>
			<button id="b-now">Jetzt sichern</button></div>
			<p class="muted">ZIP mit Datenbank (dump.json), allen PDFs/XML/XLSX/Logos und Manifest mit SHA-256-Prüfsummen.</p>
			${a?`<p class="${l?"error":""}">${n(a)}</p>`:""}
		</div>
		<div class="card"><h3>Gesicherte Backups</h3>
			${e.map(p=>`<div class="row" style="margin-top:8px">
				<strong>${n(T(p.filename))}</strong>
				<span class="muted">${n(p.createdAt.slice(0,19).replace("T"," "))} · ${Math.round(p.size/1024)} KB</span>
				<a class="btn secondary" href="/api/backups/file/${n(T(p.filename))}">Download</a>
				<button class="secondary" data-restore="${n(p.filename)}">Wiederherstellen</button>
			</div>`).join("")||'<p class="muted">Noch keine Backups.</p>'}
		</div>
		<div class="card"><h3>Backup-Datei hochladen & wiederherstellen</h3>
			<input id="b-file" type="file" accept=".zip,application/zip" />
			<p><button id="b-upload">Hochladen & wiederherstellen</button></p>
			<p class="muted">Achtung: Wiederherstellen ersetzt die gesamte Datenbank.</p>
		</div>`,t.querySelector("#b-now")?.addEventListener("click",async()=>{try{const p=await $("/api/backups",{method:"POST"});if(!p.ok)throw new Error((await p.json().catch(()=>({}))).error??"Sichern fehlgeschlagen");const h=await p.json();a=`Gesichert: ${T(h.filename)}`,l=!1,await s()}catch(p){a=p.message,l=!0,u()}}),t.querySelectorAll("[data-restore]").forEach(p=>p.addEventListener("click",async()=>{const h=p.dataset.restore??"";if(window.confirm(`Wirklich wiederherstellen aus ${T(h)}? Die aktuelle Datenbank wird ersetzt.`))try{const m=await $("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:h})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await m.json();a=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen${r.fileErrors.length>0?` (${r.fileErrors.length} Dateifehler)`:""}`,l=!1,u()}catch(m){a=m.message,l=!0,u()}})),t.querySelector("#b-upload")?.addEventListener("click",async()=>{const p=t.querySelector("#b-file")?.files?.[0];if(!p){a="Bitte zuerst eine ZIP-Datei wählen",l=!0,u();return}if(window.confirm(`Wirklich wiederherstellen aus ${p.name}? Die aktuelle Datenbank wird ersetzt.`))try{const h=await new Promise((i,d)=>{const c=new FileReader;c.onload=()=>i(String(c.result).split(",")[1]),c.onerror=()=>d(new Error("Datei nicht lesbar")),c.readAsDataURL(p)}),m=await $("/api/restore",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dataBase64:h})});if(!m.ok)throw new Error((await m.json().catch(()=>({}))).error??"Restore fehlgeschlagen");const r=await m.json();a=`Wiederhergestellt: ${r.invoices} Rechnungen, ${r.templates} Vorlagen`,l=!1,await s()}catch(h){a=h.message,l=!0,u()}})}try{await s()}catch(p){t.innerHTML=`<div class="card error">${n(p.message)}</div>`}}const O=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function w(t,e,a){return`<label>${a}<input data-f="${e}" value="${n(t[e]??"")}" /></label>`}async function F(t){t.innerHTML='<div class="card">Lade Firmendaten…</div>';let e=null,a="",l=!1;try{e=await y.company.getDefault(),e||(e=(await y.company.list())[0]??null)}catch(u){t.innerHTML=`<div class="card error">${n(u.message)}</div>`;return}function s(){const u=e?.profile??O();t.innerHTML=`<div class="card"><h3>Firma (Verkäufer-Stammdaten)</h3>
			<p class="muted">Einmal anlegen — neue Rechnungen übernehmen diese Daten automatisch.</p>
			<label>Profilname<input id="c-name" value="${n(e?.name??"Meine Firma")}" /></label>
			${w(u,"name","Firmenname")}
			${w(u,"street","Straße")}
			<div class="grid2">${w(u,"zip","PLZ")}${w(u,"city","Ort")}</div>
			<div class="grid2">${w(u,"country","Land")}${w(u,"email","E-Mail")}</div>
			<div class="grid2">${w(u,"phone","Telefon")}${w(u,"website","Webseite")}</div>
			<div class="grid2">${w(u,"vatId","USt-IdNr.")}${w(u,"taxNumber","Steuernummer")}</div>
			<div class="grid2">${w(u,"iban","IBAN")}${w(u,"bic","BIC")}</div>
			${a?`<p class="${l?"error":""}">${n(a)}</p>`:""}
			<div class="row"><button id="c-save">Speichern</button></div>
		</div>`,t.querySelector("#c-save")?.addEventListener("click",async()=>{const p={...O()};t.querySelectorAll("input[data-f]").forEach(m=>{p[m.dataset.f]=m.value});const h=t.querySelector("#c-name")?.value.trim()||"Meine Firma";try{e?e=await y.company.update(e.id,{name:h,profile:p}):e=await y.company.create(h,p),a="Gespeichert.",l=!1,s()}catch(m){a=m.message,l=!0,s()}})}s()}const j=()=>({name:"",street:"",zip:"",city:"",country:"DE"});function S(t,e,a){return`<label>${a}<input data-f="${e}" value="${n(t[e]??"")}" /></label>`}async function C(t){t.innerHTML='<div class="card">Lade Kunden…</div>';let e=[],a=null,l=!1,s="",u=!1;async function p(){e=await y.customers.list(),m()}function h(i,d){return`
		<label>Name (Anzeige)<input id="k-name" value="${n(d)}" /></label>
		${S(i,"name","Firmenname")}
		${S(i,"street","Straße")}
		<div class="grid2">${S(i,"zip","PLZ")}${S(i,"city","Ort")}</div>
		<div class="grid2">${S(i,"country","Land")}${S(i,"email","E-Mail")}</div>
		<div class="grid2">${S(i,"phone","Telefon")}${S(i,"contactName","Ansprechpartner")}</div>
		<label>Kundennr. (BT-10)<input data-f="customerNumber" value="${n(i.customerNumber)}" /></label>`}function m(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Kunden</strong>
			<button id="k-new">+ Neu</button></div>
			${e.map(i=>`<div class="row" style="margin-top:8px">
				<strong>${n(i.name)}</strong>
				<span class="muted">${n(i.profile.city||"")}</span>
				<button class="secondary" data-edit="${i.id}">Bearbeiten</button>
				<button class="danger" data-del="${i.id}">Löschen</button>
			</div>`).join("")||'<p class="muted">Noch keine Kunden.</p>'}
		</div>
		${a||l?`<div class="card"><h3>${l?"Neuer Kunde":n(a?.name??"")}</h3>
			${h(a?.profile??j(),a?.name??"")}
			${s?`<p class="${u?"error":""}">${n(s)}</p>`:""}
			<div class="row"><button id="k-save">Speichern</button><button class="secondary" id="k-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#k-new")?.addEventListener("click",()=>{a=null,l=!0,s="",m()}),t.querySelectorAll("[data-edit]").forEach(i=>i.addEventListener("click",()=>{a=e.find(d=>d.id===i.dataset.edit)??null,l=!1,s="",m()})),t.querySelectorAll("[data-del]").forEach(i=>i.addEventListener("click",async()=>{if(window.confirm("Kunden wirklich löschen?"))try{await y.customers.remove(i.dataset.del??""),await p()}catch(d){s=d.message,u=!0,m()}})),t.querySelector("#k-cancel")?.addEventListener("click",()=>{a=null,l=!1,s="",m()}),t.querySelector("#k-save")?.addEventListener("click",()=>{r()})}async function r(){const i={...j()};t.querySelectorAll("input[data-f]").forEach(c=>{i[c.dataset.f]=c.value});const d=t.querySelector("#k-name")?.value.trim()||i.name.trim()||"Kunde";try{l?await y.customers.create(d,i):a&&await y.customers.update(a.id,{name:d,profile:i}),a=null,l=!1,s="",await p()}catch(c){s=c.message,u=!0,m()}}try{await p()}catch(i){t.innerHTML=`<div class="card error">${n(i.message)}</div>`}}function J(t){return`<span class="badge ${t}">${t}</span>`}async function V(t){t.innerHTML=`
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
			<a class="btn secondary" id="f-export" href="#">Excel</a>
		</div></div>
		<div id="list"></div>`;const e=t.querySelector("#f-status"),a=t.querySelector("#f-q"),l=t.querySelector("#list");async function s(){const p={};e.value&&(p.status=e.value),a.value.trim()&&(p.q=a.value.trim());try{const h=await y.list(p);l.innerHTML=h.map(m=>`<div class="card"><div class="row">
					<strong>${n(m.number??"(Entwurf)")}</strong>${J(m.status)}
					<span>${n(m.buyer.name||"—")}</span>
					<span>${k(m.totals.grossTotal)}</span>
					<a href="#/invoices/${n(m.id)}">Ansehen</a>
					${m.pdfPath?`<a href="${y.pdfUrl(m.id)}" download="${n(m.number??"rechnung")}.pdf">PDF ↓</a>`:""}
					${m.xml?`<a href="${y.xmlUrl(m.id)}" download="${n(m.number??"rechnung")}.xml">XML ↓</a>`:""}
				</div></div>`).join("")||'<div class="card muted">Keine Rechnungen gefunden.</div>'}catch(h){l.innerHTML=`<div class="card error">${n(h.message)}</div>`}}e.onchange=()=>{u(),s()},a.oninput=()=>{u(),s()};function u(){const p={};e.value&&(p.status=e.value),a.value.trim()&&(p.q=a.value.trim()),t.querySelector("#f-export").href=y.exportUrl(p)}u(),await s()}async function W(t,e){t.innerHTML='<div class="card">Lade…</div>';try{const a=await y.get(e);t.innerHTML=`
			<div class="card"><div class="row">
				<strong>${n(a.number??"(Entwurf)")}</strong>
				<span class="badge ${a.status}">${a.status}</span>
				<a class="btn secondary" href="#/">← Liste</a>
			</div></div>
			<div class="card"><div class="grid2">
				<div><strong>Verkäufer</strong><br />${n(a.seller.name)}<br />${n(a.seller.street)}<br />${n(a.seller.zip)} ${n(a.seller.city)}</div>
				<div><strong>Käufer</strong><br />${n(a.buyer.name)}<br />${n(a.buyer.street)}<br />${n(a.buyer.zip)} ${n(a.buyer.city)}</div>
			</div>
			<p>Ausgestellt: ${n(a.issueDate)} · Leistung: ${n(a.deliveryDate)}${a.dueDate?` · Fällig: ${n(a.dueDate)}`:""}</p>
			<table class="lines"><tr><th>#</th><th>Beschreibung</th><th>Menge</th><th>USt</th><th>Netto</th></tr>
			${a.lines.map((s,u)=>`<tr><td>${u+1}</td><td>${n(s.description)}</td><td>${s.quantity} ${n(s.unit)}</td><td>${s.vatRate} %</td><td>${k(s.quantity*s.unitPriceNet)}</td></tr>`).join("")}
			</table>
			<p><strong>Gesamt: ${k(a.totals.grossTotal)}</strong> <span class="muted">(netto ${k(a.totals.netTotal)} + USt ${k(a.totals.taxTotal)})</span></p>
			${a.notes?`<p class="muted">Notiz: ${n(a.notes)}</p>`:""}
			</div>
			<div class="card"><div class="row">
				${a.status==="draft"?'<button id="d-issue">Ausstellen</button><span class="muted">Danach nicht mehr änderbar.</span>':""}
				<button class="secondary" id="d-validate">Validieren</button>
				${a.pdfPath?`<a class="btn secondary" href="${y.pdfUrl(a.id)}" target="_blank" rel="noopener">PDF ansehen</a>`:""}
				${a.pdfPath?`<a class="btn secondary" href="${y.pdfUrl(a.id)}" download="${n(a.number??"rechnung")}.pdf">PDF ↓</a>`:""}
				${a.xml?`<a class="btn secondary" href="${y.xmlUrl(a.id)}" download="${n(a.number??"rechnung")}.xml">XML ↓</a>`:""}
				${a.xlsxPath?`<a class="btn secondary" href="${y.xlsxUrl(a.id)}" download="${n(a.number??"rechnung")}.xlsx">Excel ↓</a>`:""}
			</div><div id="d-out"></div></div>`;const l=t.querySelector("#d-out");t.querySelector("#d-validate")?.addEventListener("click",async()=>{l.innerHTML='<p class="muted">Validiere…</p>';try{const s=await y.validate(a.id);l.innerHTML=s.formatErrors.length+s.businessErrors.length===0?'<p style="color:var(--ok)">Gültig: keine Fehler.</p>':`<ul>${[...s.formatErrors,...s.businessErrors].map(u=>`<li class="error">${n(u)}</li>`).join("")}</ul>`}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}}),t.querySelector("#d-issue")?.addEventListener("click",async()=>{if(window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD)."))try{const s=await y.issue(a.id);location.hash=`#/invoices/${s.id}`,location.reload()}catch(s){l.innerHTML=`<p class="error">${n(s.message)}</p>`}})}catch(a){t.innerHTML=`<div class="card error">${n(a.message)}</div>`}}function G(t){const e=M();t.innerHTML=`<div class="card"><h3>Anmeldung</h3>
		<p class="muted">Token aus den Adapter-Einstellungen (Instanz e-invoices.0 → API-Token).
		Ohne Token vertraut die API dem lokalen Netzwerk.</p>
		<label>API-Token<input id="l-token" type="password" value="${n(e??"")}" /></label>
		<div class="row"><button id="l-save">Speichern</button>
		${e?'<button class="secondary" id="l-out">Abmelden</button>':""}</div>
		<div id="l-out-msg"></div>
	</div>`,t.querySelector("#l-save")?.addEventListener("click",()=>{const a=t.querySelector("#l-token")?.value.trim()??"";D(a||null),location.hash="#/"}),t.querySelector("#l-out")?.addEventListener("click",()=>{D(null),location.hash="#/login",location.reload()})}function Z(){D(null),location.hash="#/login"}async function _(t){try{const e=await y.health();t.innerHTML=`<div class="card"><h3>Status</h3>
			<p>Version: ${n(e.version)} · Schema: ${n(String(e.schemaVersion))}</p>
			<pre class="dump">${n(JSON.stringify(e.counts,null,2))}</pre></div>`}catch(e){t.innerHTML=`<div class="card error">API nicht erreichbar: ${n(e.message)}</div>`}}const X=["title","meta","parties","positions","totals"],H=["payment","notes"];async function Y(t){t.innerHTML='<div class="card">Lade Vorlagen…</div>';let e=[],a=null,l="";async function s(){e=await u(),h()}async function u(){const r=await $("/api/templates");if(!r.ok)throw new Error("Vorlagen konnten nicht geladen werden");return await r.json()}function p(r){const i=r.definition,d=(c,o,v)=>`<label><input type="checkbox" data-f="blocks.${c}" ${i.blocks[c]?"checked":""} ${v?"disabled":""} style="width:auto" /> ${o}${v?" (Pflicht)":""}</label>`;return`
		<label>Name<input id="t-name" value="${n(r.name)}" /></label>
		<div class="grid2">
			<label>Primärfarbe<input id="t-c1" type="color" value="${n(i.colors.primary)}" /></label>
			<label>Textfarbe<input id="t-c2" type="color" value="${n(i.colors.text)}" /></label>
		</div>
		${X.map(c=>d(c,`Block ${c}`,!0)).join("")}
		${H.map(c=>d(c,`Block ${c}`,!1)).join("")}
		<label><input type="checkbox" data-f="showEmail" ${i.showEmail?"checked":""} style="width:auto" /> E-Mail im Kopf</label>
		<label><input type="checkbox" data-f="showCustomerNumber" ${i.showCustomerNumber?"checked":""} style="width:auto" /> Kundennr. (BT-10)</label>
		<label><input type="checkbox" data-f="showPaymentTerms" ${i.showPaymentTerms?"checked":""} style="width:auto" /> Zahlungsbedingungen</label>
		<label><input type="checkbox" data-f="showArchiveHint" ${i.showArchiveHint?"checked":""} style="width:auto" /> §14b-Archivhinweis</label>
		<label><input type="checkbox" data-f="showTagline" ${i.showTagline!==!1?"checked":""} style="width:auto" /> Adress-Tagline</label>
		<label>Einleitungssatz<textarea id="t-intro">${n(i.introText??"")}</textarea></label>
		<label>Schlusssatz<textarea id="t-closing">${n(i.closingText??"")}</textarea></label>
		<div class="grid2">
			<label>Unterschrift (Name)<input id="t-sign" value="${n(i.signatureName??"")}" /></label>
			<label>Kopfzusatz (z.B. Geschäftsführer)<input id="t-hextra" value="${n(i.headerExtra??"")}" /></label>
		</div>
		<label>Fußzeile<textarea id="t-footer">${n(i.footerText)}</textarea></label>
		<div class="grid2">
			<label>Logo-Position<select id="t-lpos">
				${["right","left","center"].map(c=>`<option ${i.logo?.position===c?"selected":""}>${c}</option>`).join("")}
			</select></label>
			<label>Logo-Breite (mm)<input id="t-lw" type="number" min="10" max="80" value="${i.logo?.widthMm??30}" /></label>
		</div>
		<label>Logo (PNG/JPEG, max. 2 MB)<input id="t-logo" type="file" accept="image/png,image/jpeg" /></label>
		${i.logo?`<p class="muted">Aktuell: ${n(i.logo.path)}</p>`:""}`}function h(){t.innerHTML=`
		<div class="card"><div class="row"><strong>Layout-Vorlagen</strong>
			<button id="t-new">+ Neu</button></div>
			${e.map(r=>`<div class="row" style="margin-top:8px">
				<strong>${n(r.name)}</strong><span class="muted">v${r.version}</span>
				${r.isDefault?'<span class="badge issued">Standard</span>':""}
				<button class="secondary" data-edit="${r.id}">Bearbeiten</button>
				<button class="secondary" data-prev="${r.id}">Vorschau</button>
				${r.isDefault?"":`<button class="secondary" data-def="${r.id}">Standard</button>`}
				${r.isDefault?"":`<button class="danger" data-del="${r.id}">Löschen</button>`}
			</div>`).join("")||'<p class="muted">Noch keine Vorlagen.</p>'}
		</div>
		${a?`<div class="card"><h3>${n(a.id==="neu"?"Neue Vorlage":a.name)}</h3>${p(a)}
			${l?`<p class="error">${n(l)}</p>`:""}
			<div class="row"><button id="t-save">Speichern</button><button class="secondary" id="t-cancel">Abbrechen</button></div>
		</div>`:""}`,t.querySelector("#t-new")?.addEventListener("click",async()=>{const d=(await(await $("/api/templates")).json())[0];if(!d){l="Keine Basisvorlage vorhanden",h();return}a={...structuredClone(d),id:"neu",name:"Neu",version:1,isDefault:!1},l="",h()}),t.querySelectorAll("[data-edit]").forEach(r=>r.addEventListener("click",()=>{const i=e.find(d=>d.id===r.dataset.edit);i&&(a=structuredClone(i),l="",h())})),t.querySelectorAll("[data-prev]").forEach(r=>r.addEventListener("click",async()=>{const i=e.find(o=>o.id===r.dataset.prev);if(!i)return;const d=await $("/api/templates/preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({definition:i.definition})});if(!d.ok){l="Vorschau fehlgeschlagen",h();return}const c=await d.blob();window.open(URL.createObjectURL(c),"_blank")})),t.querySelectorAll("[data-def]").forEach(r=>r.addEventListener("click",async()=>{await $(`/api/templates/${r.dataset.def}/default`,{method:"POST"}),a=null,await s()})),t.querySelectorAll("[data-del]").forEach(r=>r.addEventListener("click",async()=>{const i=await $(`/api/templates/${r.dataset.del}`,{method:"DELETE"});if(!i.ok){l=(await i.json().catch(()=>({}))).error??"Löschen fehlgeschlagen",h();return}await s()})),t.querySelector("#t-cancel")?.addEventListener("click",()=>{a=null,l="",h()}),t.querySelector("#t-save")?.addEventListener("click",()=>{m()})}async function m(){if(!a)return;const r=structuredClone(a.definition);r.name=(t.querySelector("#t-name")?.value??r.name).trim(),r.colors.primary=t.querySelector("#t-c1")?.value??r.colors.primary,r.colors.text=t.querySelector("#t-c2")?.value??r.colors.text;for(const i of H)r.blocks[i]=t.querySelector(`[data-f="blocks.${i}"]`)?.checked??r.blocks[i];for(const i of["showEmail","showCustomerNumber","showPaymentTerms","showArchiveHint","showPageNumbers","showTagline"])r[i]=t.querySelector(`[data-f="${i}"]`)?.checked??!1;r.footerText=t.querySelector("#t-footer")?.value??"",r.introText=t.querySelector("#t-intro")?.value??"",r.closingText=t.querySelector("#t-closing")?.value??"",r.signatureName=t.querySelector("#t-sign")?.value??"",r.headerExtra=t.querySelector("#t-hextra")?.value??"",r.logo&&(r.logo.position=t.querySelector("#t-lpos")?.value??"right",r.logo.widthMm=Number(t.querySelector("#t-lw")?.value??30));try{let i=a.id;if(i==="neu"){const c=await $("/api/templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Speichern fehlgeschlagen");i=(await c.json()).id}else{const c=await $(`/api/templates/${i}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({name:r.name,definition:r})});if(!c.ok)throw new Error((await c.json().catch(()=>({}))).error??"Speichern fehlgeschlagen")}const d=t.querySelector("#t-logo")?.files?.[0];if(d){const c=await new Promise((v,f)=>{const b=new FileReader;b.onload=()=>v(String(b.result).split(",")[1]),b.onerror=()=>f(new Error("Datei nicht lesbar")),b.readAsDataURL(d)}),o=await $(`/api/templates/${i}/logo`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:d.name,mime:d.type,dataBase64:c})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??"Logo-Upload fehlgeschlagen")}a=null,l="",await s()}catch(i){l=i.message,h()}}try{await s()}catch(r){t.innerHTML=`<div class="card error">${n(r.message)}</div>`}}const I=()=>({name:"",street:"",zip:"",city:"",country:"DE"}),x=()=>({description:"",quantity:1,unit:"Stk",unitPriceNet:0,vatRate:19}),L="einv-wizard-v1",B="einv-employee";function Q(){try{return localStorage.getItem(B)??""}catch{return""}}function z(){return new Date().toISOString().slice(0,10)}function A(){return{step:0,seller:I(),buyer:I(),lines:[x()],issueDate:z(),deliveryDate:z(),dueDate:"",employee:Q(),documentTitle:"Rechnung",notes:"",draftId:null,selectedCompany:null,selectedCustomer:null,error:"",savedAt:new Date().toISOString()}}function N(t){return t.seller.name.trim()!==""||t.buyer.name.trim()!==""||t.lines.some(e=>e.description.trim()!==""||e.unitPriceNet!==0)}function ee(){try{const t=localStorage.getItem(L);if(!t)return null;const e=JSON.parse(t);return!e||!Array.isArray(e.lines)||!e.seller||!e.buyer?null:{...A(),...e,error:"",step:Math.min(Number(e.step)||0,3)}}catch{return null}}function U(t,e,a){return`
		<label>Name<input data-p="${t}" data-f="name" value="${n(e.name)}" /></label>
		<label>Straße<input data-p="${t}" data-f="street" value="${n(e.street)}" /></label>
		<div class="grid2">
			<label>PLZ<input data-p="${t}" data-f="zip" value="${n(e.zip)}" /></label>
			<label>Ort<input data-p="${t}" data-f="city" value="${n(e.city)}" /></label>
		</div>
		<div class="grid2">
			<label>Land<input data-p="${t}" data-f="country" value="${n(e.country)}" /></label>
			<label>E-Mail<input data-p="${t}" data-f="email" value="${n(e.email)}" /></label>
		</div>
		<div class="grid2">
			<label>Telefon<input data-p="${t}" data-f="phone" value="${n(e.phone)}" /></label>
			${a?`<label>Webseite<input data-p="${t}" data-f="website" value="${n(e.website)}" /></label>`:`<label>Ansprechpartner<input data-p="${t}" data-f="contactName" value="${n(e.contactName)}" /></label>`}
		</div>
		${a?`<div class="grid2">
			<label>USt-IdNr.<input data-p="${t}" data-f="vatId" value="${n(e.vatId)}" /></label>
			<label>Steuernummer<input data-p="${t}" data-f="taxNumber" value="${n(e.taxNumber)}" /></label>
		</div>
		<label>IBAN<input data-p="${t}" data-f="iban" value="${n(e.iban)}" /></label>`:`<label>Kundennr. (BT-10)<input data-p="${t}" data-f="customerNumber" value="${n(e.customerNumber)}" /></label>`}`}const te=["Rechnung","Abschlagsrechnung","Schlussrechnung","Gutschrift"];function ae(t){let e=A();const a=ee();if(a&&N(a)&&!a.draftId){t.innerHTML=`<div class="card"><h3>Weiter bearbeiten?</h3>
			<p class="muted">Ungesendeter Entwurf vom ${n(a.savedAt.slice(0,16).replace("T"," "))} gefunden.</p>
			<div class="row"><button id="w-resume">Fortsetzen</button><button class="secondary" id="w-discard">Verwerfen</button></div>
		</div>`,t.querySelector("#w-resume")?.addEventListener("click",()=>{e=a,m()}),t.querySelector("#w-discard")?.addEventListener("click",()=>{localStorage.removeItem(L),m()});return}a&&N(a)&&(e=a);let l=[];y.company.list().then(d=>{l=d,(e.step===0||e.step===1)&&!t.querySelector("#w-company")&&!t.querySelector("#w-customer")&&m()}).catch(()=>{});let s=[];y.customers.list().then(d=>{s=d,e.step===1&&!t.querySelector("#w-customer")&&m()}).catch(()=>{}),N(e)||y.company.getDefault().then(d=>{d&&!e.seller.name.trim()&&d.profile.name.trim()&&(e.seller={...e.seller,...d.profile},e.selectedCompany=d.id,m(!0))}).catch(()=>{});function u(){try{localStorage.setItem(L,JSON.stringify({...e,error:"",savedAt:new Date().toISOString()}))}catch{}}function p(){t.querySelectorAll("input[data-p]").forEach(c=>{const o=c.dataset.p==="seller"?e.seller:e.buyer;o[c.dataset.f]=c.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(c=>{const[o,v]=c.dataset.l.split("."),f=e.lines[Number(o)];f&&(v==="quantity"||v==="unitPriceNet"||v==="vatRate"?f[v]=Number(c.value):f[v]=c.value)});const d=c=>t.querySelector(`#${c}`)?.value??"";e.issueDate=d("w-issue")||e.issueDate,e.deliveryDate=d("w-delivery")||e.deliveryDate,e.dueDate=d("w-due"),t.querySelector("#w-employee")&&(e.employee=d("w-employee")),e.documentTitle=d("w-title")||"Rechnung",e.notes=t.querySelector("#w-notes")?.value??"",u()}function h(){return`<div class="steps">${["Verkäufer","Käufer","Positionen","Prüfen"].map((c,o)=>`<span class="${o===e.step?"on":""}">${o+1}. ${c}</span>`).join("")}</div>`}function m(d=!1){d||p();let c="";if(e.step===0&&(c=`<div class="card"><h3>Verkäufer</h3>
				${l.length>0?`<label>Aus Firma übernehmen<select id="w-company">
							<option value="">– manuell eingeben –</option>
							${l.map(o=>`<option value="${n(o.id)}" ${e.selectedCompany===o.id?"selected":""}>${n(o.name)}${o.isDefault?" (Standard)":""}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/company">Firma</a> einmal anlegen, dann hier auswählbar.</p>'}
				${U("seller",e.seller,!0)}</div>`),e.step===1&&(c=`<div class="card"><h3>Käufer</h3>
				${s.length>0?`<label>Aus Kunden wählen<select id="w-customer">
							<option value="">– manuell eingeben –</option>
							${s.map(o=>`<option value="${n(o.id)}" ${e.selectedCustomer===o.id?"selected":""}>${n(o.name)}</option>`).join("")}
						</select></label>`:'<p class="muted">Tipp: Unter <a href="#/customers">Kunden</a> einmal anlegen, dann hier auswählbar.</p>'}
				${U("buyer",e.buyer,!1)}</div>`),e.step===2&&(c=`<div class="card"><h3>Positionen & Termine</h3>
				<label>Dokumenttyp<select id="w-title">
					${te.map(o=>`<option ${o===e.documentTitle?"selected":""}>${o}</option>`).join("")}
				</select></label>
				${e.lines.map((o,v)=>`<div class="card" style="background:var(--bg)">
					<div class="grid2">
						<label>Bezeichnung<input data-l="${v}.description" value="${n(o.description)}" /></label>
						<label>Art.Nr.<input data-l="${v}.sku" value="${n(o.sku)}" /></label>
					</div>
					<label>Detailzeile<textarea data-l="${v}.details" rows="1">${n(o.details)}</textarea></label>
					<div class="grid2">
						<label>Menge<input data-l="${v}.quantity" type="number" min="0" step="any" value="${o.quantity}" /></label>
						<label>Einheit<input data-l="${v}.unit" value="${n(o.unit)}" /></label>
					</div>
					<div class="grid2">
						<label>Preis netto<input data-l="${v}.unitPriceNet" type="number" min="0" step="0.01" value="${o.unitPriceNet}" /></label>
						<label>USt %<select data-l="${v}.vatRate">
							${[19,7,0].map(f=>`<option ${f===o.vatRate?"selected":""}>${f}</option>`).join("")}
						</select></label>
					</div>
					<button class="secondary" data-del="${v}">Position entfernen</button>
				</div>`).join("")}
				<p><button class="secondary" id="w-add">+ Position</button></p>
				<div class="grid2">
					<label>Ausstellungsdatum<input id="w-issue" type="date" value="${n(e.issueDate)}" /></label>
					<label>Leistungsdatum<input id="w-delivery" type="date" value="${n(e.deliveryDate)}" /></label>
				</div>
				<label>Fällig am<input id="w-due" type="date" value="${n(e.dueDate)}" /></label>
				<label>Mitarbeiter-Kürzel (für Nr. JJJJ-KK-LLL)<input id="w-employee" maxlength="8" placeholder="z.B. 01" value="${n(e.employee)}" /></label>
				<label>Notizen<textarea id="w-notes">${n(e.notes)}</textarea></label>
			</div>`),e.step===3){const o=e.lines.reduce((f,b)=>f+b.quantity*b.unitPriceNet,0),v=e.lines.reduce((f,b)=>f+b.quantity*b.unitPriceNet*b.vatRate/100,0);c=`<div class="card"><h3>Prüfen & Ausstellen</h3>
				<p><strong>${n(e.documentTitle)}</strong> · ${n(e.seller.name||"—")} → ${n(e.buyer.name||"—")} · ${e.lines.length} Positionen</p>
				<p><strong>ca. ${k(Math.round((o+v)*100)/100)}</strong> <span class="muted">(exakte Summen + Validierung serverseitig)</span></p>
				<p class="muted">Ausstellen vergibt endgültig die Rechnungsnummer — danach ist keine Änderung mehr möglich (GoBD).</p>
			</div>`}t.innerHTML=`${h()}${c}
			${e.error?`<div class="card error">${n(e.error)}</div>`:""}
			<div class="row">
				${e.step>0?'<button class="secondary" id="w-back">Zurück</button>':""}
				${e.step<3?'<button id="w-next">Weiter</button>':'<button id="w-save">Entwurf speichern</button><button id="w-issue">Ausstellen</button>'}
				<button class="secondary" id="w-clear">Verwerfen</button>
			</div>`,t.querySelector("#w-back")?.addEventListener("click",()=>{e.step--,m()}),t.querySelector("#w-company")?.addEventListener("change",()=>{const o=t.querySelector("#w-company")?.value??"",v=l.find(f=>f.id===o);v?(e.seller={...e.seller,...v.profile},e.selectedCompany=v.id,m(!0)):e.selectedCompany=null}),t.querySelector("#w-customer")?.addEventListener("change",()=>{const o=t.querySelector("#w-customer")?.value??"",v=s.find(f=>f.id===o);v?(e.buyer={...e.buyer,...v.profile},e.selectedCustomer=v.id,m(!0)):e.selectedCustomer=null}),t.querySelector("#w-next")?.addEventListener("click",()=>{e.step++,m()}),t.querySelector("#w-clear")?.addEventListener("click",()=>{window.confirm("Eingaben verwerfen?")&&(localStorage.removeItem(L),e=A(),m())}),t.querySelector("#w-add")?.addEventListener("click",()=>{p(),e.lines.push(x()),m()}),t.querySelectorAll("[data-del]").forEach(o=>o.addEventListener("click",()=>{p(),e.lines.splice(Number(o.dataset.del),1),e.lines.length===0&&e.lines.push(x()),m()})),t.querySelector("#w-save")?.addEventListener("click",()=>{r(!1)}),t.querySelector("#w-issue")?.addEventListener("click",()=>{window.confirm("Wirklich ausstellen? Danach ist keine Änderung mehr möglich (GoBD).")&&r(!0)})}async function r(d){p(),e.error="";const c={seller:e.seller,buyer:e.buyer,lines:e.lines,issueDate:e.issueDate,deliveryDate:e.deliveryDate,dueDate:e.dueDate||void 0,currency:"EUR",employeeCode:e.employee.trim()||void 0,documentTitle:e.documentTitle,notes:e.notes||void 0};try{if(e.employee.trim())try{localStorage.setItem(B,e.employee.trim())}catch{}let o;e.draftId?o=await y.update(e.draftId,c):(o=await y.create(c),e.draftId=o.id,u()),d&&(o=await y.issue(o.id),localStorage.removeItem(L)),location.hash=`#/invoices/${o.id}`}catch(o){e.error=o.message,m()}}t.addEventListener("input",()=>{try{i()}catch{}});function i(){t.querySelectorAll("input[data-p]").forEach(f=>{const b=f.dataset.p==="seller"?e.seller:e.buyer;b[f.dataset.f]=f.value}),t.querySelectorAll("input[data-l],select[data-l],textarea[data-l]").forEach(f=>{const[b,E]=f.dataset.l.split("."),q=e.lines[Number(b)];q&&(E==="quantity"||E==="unitPriceNet"||E==="vatRate"?q[E]=Number(f.value):q[E]=f.value)});const d=f=>t.querySelector(`#${f}`)?.value??"",c=d("w-issue"),o=d("w-delivery");c&&(e.issueDate=c),o&&(e.deliveryDate=o),e.dueDate=d("w-due"),t.querySelector("#w-employee")&&(e.employee=d("w-employee"));const v=d("w-title");v&&(e.documentTitle=v),e.notes=t.querySelector("#w-notes")?.value??e.notes,u()}m()}const ne=document.querySelector("#app");function ie(t){const e=!!M(),a=[["#/","Rechnungen"],["#/new","+ Neu"],["#/templates","Vorlagen"],["#/company","Firma"],["#/customers","Kunden"],["#/backup","Backup"],["#/status","Status"],[e?"#/logout":"#/login",e?"Logout":"Login"]];ne.innerHTML=`<header class="top"><nav>
		<strong>E-Invoices</strong>
		${a.map(([l,s])=>`<a href="${l}" class="${t===l||l==="#/"&&t.startsWith("#/invoices")?"active":""}">${s}</a>`).join("")}
	</nav></header><main id="view"></main>`}async function R(){const t=location.hash||"#/";ie(t);const e=document.querySelector("#view");t==="#/"||t==="#"?await V(e):t==="#/new"?ae(e):t.startsWith("#/invoices/")?await W(e,decodeURIComponent(t.slice(11))):t==="#/templates"?await Y(e):t==="#/company"?await F(e):t==="#/customers"?await C(e):t==="#/backup"?await K(e):t==="#/login"?G(e):t==="#/logout"?Z():t==="#/status"?await _(e):e.innerHTML='<div class="card">Unbekannte Route.</div>'}window.addEventListener("hashchange",()=>{R()});R();
