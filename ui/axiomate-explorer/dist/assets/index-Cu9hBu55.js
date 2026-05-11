(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&a(l)}).observe(document,{childList:!0,subtree:!0});function o(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(n){if(n.ep)return;n.ep=!0;const s=o(n);fetch(n.href,s)}})();const r=globalThis.AXIOMATE_API_BASE??"http://localhost:8787/api/v1",m=document.querySelector("#app");if(!m)throw new Error("Missing app root");m.innerHTML=`
  <main class="shell">
    <section class="hero">
      <h1>Axiomate Explorer</h1>
      <p>Day-1 vertical slice: upload text, extract graph, and inspect concept/relation output.</p>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Document Input</h2>
        <textarea id="docText">Risk Management requires Planning. Agile conflicts with Waterfall.</textarea>
        <div style="margin-top: 0.6rem; display: flex; gap: 0.5rem;">
          <button id="runBtn">Run Extract</button>
          <button id="clearBtn" class="secondary">Clear Output</button>
        </div>
        <p id="status"></p>
      </div>

      <div class="panel">
        <h2>Graph Snapshot</h2>
        <div id="summary"></div>
        <div id="concepts"></div>
        <div id="relations"></div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Validation</h2>
        <div id="validation"></div>
      </div>
      <div class="panel">
        <h2>Attestation</h2>
        <div id="attestation"></div>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Trace Sample</h2>
        <div id="traces"></div>
      </div>
      <div class="panel">
        <h2>Export Preview</h2>
        <pre id="exported">No export yet.</pre>
      </div>
    </section>

    <section class="panel" style="margin-top: 1rem;">
      <h2>Raw Response</h2>
      <pre id="raw">No run yet.</pre>
    </section>
  </main>
`;const i=document.querySelector("#status"),f=document.querySelector("#raw"),g=document.querySelector("#concepts"),u=document.querySelector("#relations"),y=document.querySelector("#summary"),T=document.querySelector("#docText"),v=document.querySelector("#validation"),x=document.querySelector("#attestation"),$=document.querySelector("#traces"),S=document.querySelector("#exported");let c="",d=null;async function O(){i.textContent="Creating session...";const t=await fetch(`${r}/sessions`,{method:"POST"});if(!t.ok){i.textContent="Failed creating session.";return}const e=await t.json();c=e.sessionId;const o=btoa(unescape(encodeURIComponent(T.value)));if(i.textContent="Uploading document...",!(await fetch(`${r}/sessions/${e.sessionId}/documents`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({filename:"pasted.md",mediaType:"text/markdown",contentBase64:o})})).ok){i.textContent="Upload failed.";return}i.textContent="Running extraction...",await fetch(`${r}/sessions/${e.sessionId}/extract`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({maxConcepts:50})});const n=await fetch(`${r}/sessions/${e.sessionId}/graph`);if(!n.ok){i.textContent="Graph fetch failed.";return}const s=await n.json(),p=await(await fetch(`${r}/sessions/${e.sessionId}/validate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rulesetId:"axiomate-mvp-v1",strictMode:!0})})).json();d=p;const w=await(await fetch(`${r}/sessions/${e.sessionId}/traces`)).json(),h=await(await fetch(`${r}/sessions/${e.sessionId}/attest`,{method:"POST"})).json(),I=await(await fetch(`${r}/sessions/${e.sessionId}/export?format=txt`)).json();C(s),R(p),E(w.traces),j(h),S.textContent=I.artifact,f.textContent=JSON.stringify({graph:s,validation:p,attestation:h},null,2),i.textContent="Done."}function C(t){y.innerHTML=`<p><strong>${t.concepts.length}</strong> concepts, <strong>${t.relations.length}</strong> relations</p>`,g.innerHTML=`<h3>Concepts</h3>${t.concepts.slice(0,20).map(e=>`<div class="node">${e.label} <small>(${Math.round(e.confidence*100)}%)</small></div>`).join("")}`,u.innerHTML=`<h3>Relations</h3>${t.relations.slice(0,20).map(e=>`<div class="node">${e.fromConceptId} <strong>${e.type}</strong> ${e.toConceptId}</div>`).join("")}`,t.relations.length===0&&(u.innerHTML+='<p class="warn">No explicit relations inferred from current text.</p>')}function R(t){d=t,v.innerHTML=`
    <p><strong>Status:</strong> ${t.overallStatus}</p>
    <p><strong>Conflicts:</strong> ${t.conflicts.length}</p>
    ${t.conflicts.length>0?'<button id="repairBtn" class="secondary">Repair First Conflict</button>':""}
    ${t.conflicts.length>0?t.conflicts.map(o=>`<div class="node"><strong>${o.code}</strong> <span class="capsule ${o.severity}">${o.severity}</span><br>${o.message}</div>`).join(""):"<p>No conflicts detected.</p>"}
  `;const e=document.querySelector("#repairBtn");e&&e.addEventListener("click",()=>{b().catch(o=>{i.textContent=`Repair failed: ${String(o)}`})})}async function b(){if(!c||!d||d.conflicts.length===0){i.textContent="No conflict available for repair.";return}const t=d.conflicts[0];if(i.textContent=`Applying repair for ${t.code}...`,!(await fetch(`${r}/sessions/${c}/repairs`,{method:"POST",headers:{"content-type":"application/json","x-idempotency-key":`repair-${t.conflictId}`},body:JSON.stringify({conflictId:t.conflictId,actionType:t.code==="RECIPROCAL_SUBSUMPTION"?"reverse_edge":"quarantine_relation"})})).ok){i.textContent="Repair request failed.";return}const a=await(await fetch(`${r}/sessions/${c}/validate`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rulesetId:"axiomate-mvp-v1",strictMode:!0})})).json(),s=await(await fetch(`${r}/sessions/${c}/graph`)).json();C(s),R(a),f.textContent=JSON.stringify({graph:s,validation:a},null,2),i.textContent=a.conflicts.length===0?"Repair completed.":"Repair applied; conflicts remain."}function E(t){$.innerHTML=t.slice(0,6).map(e=>`
        <div class="node">
          <strong>${e.entityType}</strong> ${e.entityId}
          ${e.steps.map(o=>`<div class="subnode">${o.index}. ${o.operation} via ${o.ruleId} (${Math.round(o.confidence*100)}%)</div>`).join("")}
        </div>
      `).join("")}function j(t){x.innerHTML=`
    <p><strong>ID:</strong> ${t.attestationId}</p>
    <p><strong>Ruleset:</strong> ${t.rulesetId}</p>
    <p><strong>Validator:</strong> ${t.validatorVersion}</p>
    <div class="node"><strong>Graph Hash</strong><br><code>${t.graphHash.slice(0,24)}...</code></div>
    <div class="node"><strong>Trace Hash</strong><br><code>${t.traceHash.slice(0,24)}...</code></div>
  `}document.querySelector("#runBtn").addEventListener("click",()=>{O().catch(t=>{i.textContent=`Run failed: ${String(t)}`})});document.querySelector("#clearBtn").addEventListener("click",()=>{y.textContent="",g.textContent="",u.textContent="",v.textContent="",$.textContent="",x.textContent="",S.textContent="No export yet.",c="",d=null,f.textContent="No run yet.",i.textContent=""});
