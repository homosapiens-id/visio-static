const RV_API='https://app.homosapiens.id',rv$=s=>document.querySelector(s);
const rvAvatarId=()=>document.querySelector('.avatar-card.selected')?.dataset.id||'';
const rvRead=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
async function rvApi(path,opts={}){const r=await fetch(RV_API+path,{credentials:'include',...opts});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`HTTP ${r.status}`);return d}
function rvInject(){
 const selected=rv$('#selectedAvatarName');if(!selected||rv$('#avatarReferenceVersioning'))return;
 const x=document.createElement('section');x.id='avatarReferenceVersioning';x.className='dh-panel';x.innerHTML=`
 <div class="dh-head"><span class="eyebrow">REFERÊNCIAS VERSIONADAS</span><small id="rvState">Adicione ou substitua até 4 referências autorizadas.</small></div>
 <div class="dh-grid two"><label>Modo<select id="rvMode"><option value="add">Adicionar referências</option><option value="replace">Substituir conjunto</option></select></label><label>Novas referências<input id="rvFiles" type="file" accept="image/*" multiple></label></div>
 <div class="dh-actions"><button class="secondary" id="rvSave">Atualizar referências</button><small id="rvMeta">A versão do avatar aumenta a cada atualização.</small></div>`;
 const identity=rv$('#digitalHumanIdentity');(identity||selected).insertAdjacentElement(identity?'beforebegin':'afterend',x);
 rv$('#rvSave').onclick=rvSave;
}
async function rvSave(){
 const id=rvAvatarId(),files=[...(rv$('#rvFiles')?.files||[])],mode=rv$('#rvMode')?.value||'add',state=rv$('#rvState');
 if(!id)return state.textContent='Selecione um avatar.';
 if(!files.length)return state.textContent='Escolha pelo menos uma referência.';
 if(files.length>4)return state.textContent='Máximo de 4 imagens por atualização.';
 try{
  state.textContent='Normalizando e versionando referências…';
  const references=await Promise.all(files.map(rvRead));
  const d=await rvApi(`/api/visio/avatars/${encodeURIComponent(id)}/references`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,references})});
  const a=d.avatar||{};
  state.textContent=`Referências atualizadas · avatar v${a.version||'—'}`;
  rv$('#rvMeta').textContent=`${a.reference_count??'—'} referência(s) ativa(s) · modo ${mode}`;
  rv$('#rvFiles').value='';
  rv$('#avatarRefreshBtn')?.click();
 }catch(e){state.textContent=`Falha: ${e.message}`}
}
rvInject();
rv$('#avatarList')?.addEventListener('click',()=>setTimeout(rvInject,30));
new MutationObserver(()=>setTimeout(rvInject,30)).observe(document.body,{childList:true,subtree:true});
