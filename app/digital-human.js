const API='https://app.homosapiens.id',$=s=>document.querySelector(s);
const nativeFetch=window.fetch.bind(window);
async function api(path,opts={}){const r=await nativeFetch(API+path,{credentials:'include',...opts});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d}
const avatarId=()=>document.querySelector('.avatar-card.selected')?.dataset.id||'';
const fields={face:'dhFace',hair:'dhHair',body:'dhBody',skin_tone:'dhSkin',age_appearance:'dhAge',wardrobe:'dhWardrobe',scene:'dhScene',accessories:'dhAccessories',drift_tolerance:'dhDrift'};
const lockSelect=(id,label,def)=>`<label>${label}<select id="${id}"><option value="strict"${def==='strict'?' selected':''}>Estrito</option><option value="scene"${def==='scene'?' selected':''}>Preferir contexto</option><option value="off">Livre</option></select></label>`;
function injectIdentity(){
 const selected=$('#selectedAvatarName');if(!selected||$('#digitalHumanIdentity'))return;
 const x=document.createElement('section');x.id='digitalHumanIdentity';x.className='dh-panel';x.innerHTML=`
 <div class="dh-head"><span class="eyebrow">IDENTITY LOCKS</span><small id="dhState">Selecione um avatar.</small></div>
 <div class="dh-grid">${lockSelect('dhFace','Rosto','strict')}${lockSelect('dhHair','Cabelo','strict')}${lockSelect('dhBody','Corpo','strict')}${lockSelect('dhSkin','Tom de pele','strict')}${lockSelect('dhAge','Idade aparente','strict')}${lockSelect('dhWardrobe','Roupa','scene')}${lockSelect('dhScene','Cenário','scene')}${lockSelect('dhAccessories','Acessórios','scene')}<label>Tolerância a drift<select id="dhDrift"><option value="low">Baixa · 0,90</option><option value="medium">Média · 0,80</option><option value="high">Alta · 0,65</option></select></label></div>
 <div class="dh-actions"><button class="secondary" id="dhSave">Salvar locks</button><small id="identityQcState">QC será executado após cada render.</small></div>`;
 selected.insertAdjacentElement('afterend',x);$('#dhSave').onclick=saveIdentity;
}
function setLocks(v={}){for(const[k,id]of Object.entries(fields)){const e=$('#'+id);if(e&&v[k]&&[...e.options].some(o=>o.value===v[k]))e.value=v[k]}}
function getLocks(){return Object.fromEntries(Object.entries(fields).map(([k,id])=>[k,$('#'+id)?.value]))}
async function loadIdentity(){const id=avatarId();if(!id)return;try{const d=await api(`/api/visio/avatars/${encodeURIComponent(id)}/identity`);setLocks(d.identity?.locks||{});$('#dhState').textContent=`Identidade v${d.identity?.version||1} · ${d.identity?.drift_checklist?.length||0} locks ativos`}catch(e){$('#dhState').textContent=`Identidade indisponível: ${e.message}`}}
async function saveIdentity(){const id=avatarId();if(!id)return $('#dhState').textContent='Selecione um avatar.';try{const d=await api(`/api/visio/avatars/${encodeURIComponent(id)}/identity`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({locks:getLocks()})});setLocks(d.identity?.locks||{});$('#dhState').textContent=`Identidade v${d.identity?.version||1} salva`}catch(e){$('#dhState').textContent=`Falha: ${e.message}`}}
function showQc(qc,attempts=1,meta={}){
 const e=$('#identityQcState');if(!e||!qc)return;
 const score=qc.overal_score??'—',refs=Number(meta.reference_count||0);
 const refText=refs?` » ${refs} ref.${meta.reference_composite?' · âncora composta':''}`:'';
 e.textContent=qc.status==='pass'?`QC aprovado · score ${score} · ${attempts} tentativa${attempts===1?':':'s'}${refText}`:qc.status==='fail'?`QC reprovado · score ${score}${refText}`:`QC ${qc.status} · ${qc.reason||''}${refText}`;
 e.dataset.status=qc.status||'';
}
window.fetch=async(...args)=>{
 const r=await nativeFetch(...args);
 try{
  const url=String(args[0]instanceof Request?args[0].url:args[0]||'');
  if(r.ok&&/\/api\/visio\/avatars\/[^/]+\/render(?:\?|$)/.test(url)){
   r.clone().json().then(d=>setTimeout(()=>showQc(d.identity_qc,d.attempts||1,d),60)).catch(()=>{});
  }
 }catch{}
 return r;
};
injectIdentity();$('#avatarList')?.addEventListener('click',()=>setTimeout(loadIdentity,40));const list=$('#avatarList');if(list)new MutationObserver(()=>setTimeout(loadIdentity,40)).observe(list,{childList:true,subtree:true});setTimeout(loadIdentity,400);
