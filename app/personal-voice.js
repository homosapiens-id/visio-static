
const PV_API='https://app.homosapiens.id',pv$=s=>document.querySelector(s);
async function pvReq(path,opts={}){
  const r=await fetch(PV_API+path,{credentials:'include',...opts});
  let d={};try{d=await r.json()}catch{}
  if(!r.ok)throw new Error(d.error||d.message||`HTTP ${r.status}`);
  return d;
}
const pvRead=file=>new Promise((resolve,reject)=>{
  if(!file)return resolve('');
  if(file.size>10*1024*1024)return reject(new Error('Áudio acima de 10 MB.'));
  const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file);
});
function pvPanel(){
  const host=pv$('#voice');if(!host||pv$('#personalVoicePanel'))return;
  const p=document.createElement('section');p.id='personalVoicePanel';p.className='dh-panel dh-voice';
  p.innerHTML=`
  <div class="dh-head"><span class="eyebrow">VOZ PESSOAL AUTORIZADA</span><small id="pvState">Consentimento de voz é separado da identidade visual.</small></div>
  <label>Avatar<select id="pvAvatar"><option value="">Selecione um avatar persistente</option></select></label>
  <input id="pvName" placeholder="Nome do perfil de voz, ex.: Minha voz">
  <div class="dh-grid two">
    <label>Base de autorização<select id="pvBasis"><option value="self">Sou a pessoa da voz</option><option value="authorized">Tenho autorização da pessoa</option></select></label>
    <label>Perfil de voz<select id="pvProfile"><option value="">Nenhum perfil</option></select></label>
  </div>
  <label class="drop compact">Gravação de consentimento<input id="pvConsentAudio" type="file" accept="audio/*"></label>
  <label class="check dh-check"><input id="pvConfirm" type="checkbox"> Confirmo autorização específica para criar e reutilizar esta voz no Visio.</label>
  <button type="button" class="secondary" id="pvCreate">Criar consentimento de voz</button>
  <label class="drop compact">Amostra para ativação<input id="pvSampleAudio" type="file" accept="audio/*"></label>
  <div class="dh-actions triple">
    <button type="button" class="secondary" id="pvActivate">Ativar perfil</button>
    <button type="button" class="secondary" id="pvRefresh">Atualizar</button>
    <button type="button" class="danger" id="pvRevoke">Revogar</button>
  </div>
  <button type="button" id="pvUse">Gerar narração com voz pessoal →</button>`;
  host.appendChild(p);
  pv$('#pvAvatar').onchange=pvRefreshProfiles;
  pv$('#pvCreate').onclick=pvCreateConsent;
  pv$('#pvActivate').onclick=pvActivate;
  pv$('#pvRefresh').onclick=pvRefreshAll;
  pv$('#pvRevoke').onclick=pvRevoke;
  pv$('#pvUse').onclick=pvUse;
  pvRefreshAll().catch(()=>{});
}
async function pvRefreshAvatars(){
  const d=await pvReq('/api/visio/avatars'),s=pv$('#pvAvatar');if(!s)return;
  const keep=s.value;s.innerHTML='<option value="">Selecione um avatar persistente</option>';
  for(const a of d.avatars||[]){if(a.status!=='active'||a.revoked_at)continue;const o=document.createElement('option');o.value=a.avatar_id;o.textContent=`${a.display_name} · v${a.version}`;s.appendChild(o)}
  if([...s.options].some(o=>o.value===keep))s.value=keep;
}
async function pvRefreshProfiles(){
  const avatar_id=pv$('#pvAvatar')?.value||'',s=pv$('#pvProfile');if(!s)return;
  s.innerHTML='<option value="">Nenhum perfil</option>';
  if(!avatar_id){pv$('#pvState').textContent='Selecione um avatar para gerenciar a voz.';return}
  const d=await pvReq(`/api/visio/voices?avatar_id=${encodeURIComponent(avatar_id)}`);
  for(const v of d.voices||[]){const o=document.createElement('option');o.value=v.voice_profile_id;o.textContent=`${v.name} · ${v.status}`;o.dataset.status=v.status;s.appendChild(o)}
  const active=[...s.options].find(o=>o.dataset.status==='active');if(active)s.value=active.value;
  pv$('#pvState').textContent=`${(d.voices||[]).length} perfil(is) · somente voz ativa pode narrar`;
}
async function pvRefreshAll(){try{await pvRefreshAvatars();await pvRefreshProfiles()}catch(e){pv$('#pvState').textContent=`Voz indisponível: ${e.message}`}}
async function pvCreateConsent(){
  const avatar_id=pv$('#pvAvatar').value,file=pv$('#pvConsentAudio').files[0];
  if(!avatar_id)return pv$('#pvState').textContent='Selecione um avatar.';
  if(!pv$('#pvConfirm').checked)return pv$('#pvState').textContent='Confirme o consentimento específico de voz.';
  if(!file)return pv$('#pvState').textContent='Envie a gravação de consentimento.';
  try{
    pv$('#pvState').textContent='Criando consentimento…';
    const recording_data_url=await pvRead(file);
    const d=await pvReq('/api/visio/voices/consents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      avatar_id,display_name:pv$('#pvName').value||'Minha voz',language:'pt-BR',recording_data_url,
      consent:{confirmed:true,basis:pv$('#pvBasis').value}
    })});
    pv$('#pvState').textContent=`Consentimento criado · ${d.voice.status}`;
    await pvRefreshProfiles();if(d.voice?.voice_profile_id)pv$('#pvProfile').value=d.voice.voice_profile_id;
  }catch(e){pv$('#pvState').textContent=`Falha: ${e.message}`}
}
async function pvActivate(){
  const id=pv$('#pvProfile').value,file=pv$('#pvSampleAudio').files[0];
  if(!id)return pv$('#pvState').textContent='Selecione um perfil.';
  if(!file)return pv$('#pvState').textContent='Envie a amostra de voz.';
  try{
    pv$('#pvState').textContent='Ativando voz…';
    const audio_sample_data_url=await pvRead(file);
    const d=await pvReq(`/api/visio/voices/${encodeURIComponent(id)}/activate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio_sample_data_url})});
    pv$('#pvState').textContent=`Voz ativa · ${d.voice.name}`;await pvRefreshProfiles();pv$('#pvProfile').value=id;
  }catch(e){pv$('#pvState').textContent=`Falha ao ativar: ${e.message}`}
}
async function pvRevoke(){
  const id=pv$('#pvProfile').value;if(!id||!confirm('Revogar este perfil de voz? Novas narrações serão bloqueadas.'))return;
  try{const d=await pvReq(`/api/visio/voices/${encodeURIComponent(id)}/revoke`,{method:'POST'});pv$('#pvState').textContent=`Voz revogada · ${d.voice.name}`;await pvRefreshProfiles()}
  catch(e){pv$('#pvState').textContent=`Falha ao revogar: ${e.message}`}
}
async function pvUse(){
  const voice_profile_id=pv$('#pvProfile').value,text=pv$('#voiceText').value.trim();
  if(!voice_profile_id)return pv$('#pvState').textContent='Selecione uma voz ativa.';
  if(!text)return pv$('#pvState').textContent='Digite o texto da narração.';
  try{
    pv$('#pvState').textContent='Gerando narração autorizada…';
    const d=await pvReq('/api/visio/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      text,voice_profile_id,instructions:pv$('#voiceDirection').value||'Fale em português do Brasil, de forma natural, clara e profissional.'
    })});
    pv$('#canvas').innerHTML=`<audio controls autoplay src="${d.audio_url}"></audio>`;
    pv$('#resultTitle').textContent='Voz pessoal autorizada';pv$('#model').textContent=d.model||'';pv$('#pvState').textContent='Narração criada com perfil autorizado.';
  }catch(e){pv$('#pvState').textContent=`Falha na narração: ${e.message}`}
}
pvPanel();
document.querySelector('[data-mode="voice"]')?.addEventListener('click',()=>setTimeout(()=>pvRefreshAll().catch(()=>{}),50));
