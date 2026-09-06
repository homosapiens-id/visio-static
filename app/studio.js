const API='https://app.homosapiens.id', $=s=>document.querySelector(s);
let currentImage='',videoTimer=null,avatars=[],selectedAvatarId='';

async function req(path,opts={}){
  const r=await fetch(API+path,{credentials:'include',...opts});
  let d={};try{d=await r.json()}catch{}
  if(r.status===401){location.replace('/?login=1');throw new Error('Sessão encerrada.')}
  if(!r.ok){
    const code=d.error||d.message||'Operação indisponível.';
    const friendly={
      avatar_consent_required:'Confirme a autorização para criar este avatar.',
      avatar_consent_basis_invalid:'Selecione a base de autorização.',
      avatar_reference_required:'Envie ao menos uma referência.',
      too_many_avatar_references:'Use no máximo quatro referências.',
      avatar_persistence_not_configured:'A persistência de avatar ainda não está configurada neste ambiente.',
      avatar_store_unavailable:'O armazenamento de avatar está temporariamente indisponível.',
      avatar_not_found:'Avatar não encontrado.',
      avatar_not_found_or_revoked:'Este avatar não está disponível para novas gerações.'
    }[code];
    throw new Error(friendly||code);
  }
  return d;
}
async function auth(){
  try{
    const d=await req('/api/auth/me');
    if(!d.authenticated)return location.replace('/?login=1');
    $('#email').textContent=d.email;$('#user').textContent=(d.email||'HomoSapiens').split('@')[0];$('#avatar').textContent=(d.email?.[0]||'V').toUpperCase();
    const h=await req('/api/visio/ready');
    if(h.ready){$('#status').classList.add('online');$('#status span').textContent='runtime pronto'}
    await refreshAvatarState();
  }catch{}
}
const readFile=f=>new Promise((res,rej)=>{if(!f)return res('');const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
async function readAvatarFile(file){
  if(!file)return '';
  if(file.size>12*1024*1024)throw new Error(`A imagem ${file.name} é grande demais.`);
  try{
    const bmp=await createImageBitmap(file),max=1600,scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));
    c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
    return c.toDataURL('image/jpeg',.9);
  }catch{return readFile(file)}
}
function busy(v){$('#busy').classList.toggle('hidden',!v);document.querySelectorAll('.mode button').forEach(b=>b.disabled=v)}
function error(e){$('#error').textContent=e?.message||String(e);$('#error').classList.remove('hidden')}
function clearError(){$('#error').classList.add('hidden')}
function showImage(src,title,model=''){currentImage=src;$('#canvas').innerHTML=`<img src="${src}" alt="Resultado Visio">`;$('#resultTitle').textContent=title;$('#model').textContent=model}
function showText(text,title,model=''){$('#canvas').innerHTML='<div class="analysis"></div>';$('#canvas .analysis').textContent=text;$('#resultTitle').textContent=title;$('#model').textContent=model}
function showAudio(src,title,model=''){$('#canvas').innerHTML=`<audio controls autoplay src="${src}"></audio>`;$('#resultTitle').textContent=title;$('#model').textContent=model}

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  document.querySelectorAll('.mode').forEach(x=>x.classList.add('hidden'));
  const m=btn.dataset.mode,id={avatar:'avatarMode'}[m]||m;$('#'+id).classList.remove('hidden');
  $('#title').textContent={generate:'Gerar imagem',avatar:'Meu avatar',analyze:'Analisar imagem',edit:'Editar imagem',voice:'Voz sintética',video:'Animar avatar'}[m];
  if(m==='avatar')refreshAvatarState();
}));

function activeAvatars(){return avatars.filter(a=>a.status==='active'&&!a.revoked_at)}
function syncVideoAvatars(){
  const select=$('#videoAvatar'),keep=select.value;
  select.innerHTML='<option value="">Imagem avulsa / sem avatar persistente</option>';
  activeAvatars().forEach(a=>{const o=document.createElement('option');o.value=a.avatar_id;o.textContent=`${a.display_name} · v${a.version}`;select.appendChild(o)});
  if([...select.options].some(o=>o.value===keep))select.value=keep;
}
function selectAvatar(id){
  selectedAvatarId=id||'';
  document.querySelectorAll('.avatar-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===selectedAvatarId));
  const a=avatars.find(x=>x.avatar_id===selectedAvatarId);
  $('#avatarUse').classList.toggle('hidden',!a||a.status!=='active');
  if(a)$('#selectedAvatarName').textContent=`${a.display_name} · ${a.reference_count} referência${a.reference_count===1?'':'s'}`;
}
function renderAvatars(){
  const box=$('#avatarList');box.innerHTML='';
  if(!avatars.length){const s=document.createElement('small');s.textContent='Nenhum avatar persistente cadastrado ainda.';box.appendChild(s);syncVideoAvatars();selectAvatar('');return}
  avatars.forEach(a=>{
    const card=document.createElement('button');card.type='button';card.className='avatar-card';card.dataset.id=a.avatar_id;
    const title=document.createElement('b');title.textContent=a.display_name;
    const meta=document.createElement('small');meta.textContent=`${a.status==='active'?'Ativo':'Revogado'} · v${a.version} · ${a.reference_count} ref. · ${a.consent?.basis==='self'?'própria pessoa':'autorizado'}`;
    card.append(title,meta);card.onclick=()=>selectAvatar(a.avatar_id);box.appendChild(card);
  });
  syncVideoAvatars();
  const exists=avatars.some(a=>a.avatar_id===selectedAvatarId&&a.status==='active');if(!exists)selectAvatar(activeAvatars()[0]?.avatar_id||'');else selectAvatar(selectedAvatarId);
}
async function refreshAvatarState(){
  try{
    const state=await req('/api/visio/avatars/ready');
    $('#avatarState').innerHTML=`<small>Persistência ativa · consentimento ${state.consent_version} · até ${state.max_references} referências</small>`;
    const d=await req('/api/visio/avatars?include_revoked=1');avatars=d.avatars||[];renderAvatars();
  }catch(e){
    $('#avatarState').innerHTML='<small>Persistência indisponível neste momento.</small>';
    avatars=[];renderAvatars();
  }
}

$('#genBtn').onclick=async()=>{clearError();busy(true);try{const d=await req('/api/visio/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:$('#genPrompt').value,size:$('#genSize').value,quality:$('#genQuality').value})});showImage(d.image_data_url||d.image_url,'Imagem gerada',d.model)}catch(e){error(e)}finally{busy(false)}};

$('#avatarCreateBtn').onclick=async()=>{
  clearError();busy(true);
  try{
    const files=[...$('#avatarFiles').files];if(!files.length)throw new Error('Envie ao menos uma referência.');if(files.length>4)throw new Error('Use no máximo quatro referências.');
    if(!$('#avatarConsent').checked)throw new Error('Confirme a autorização para criar e reutilizar esta identidade visual.');
    const references=[];for(const f of files)references.push(await readAvatarFile(f));
    const d=await req('/api/visio/avatars',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      display_name:$('#avatarDisplayName').value||'Meu avatar',references,
      consent:{confirmed:true,basis:$('#avatarBasis').value,commercial_use:$('#avatarCommercial').checked,voice_use:false}
    })});
    selectedAvatarId=d.avatar.avatar_id;$('#avatarFiles').value='';$('#avatarConsent').checked=false;await refreshAvatarState();
    showText(`Avatar persistente criado.\navatar_id: ${d.avatar.avatar_id}\nReferências: ${d.avatar.reference_count}\nStatus: ${d.avatar.status}`,'Avatar persistente');
  }catch(e){error(e)}finally{busy(false)}
};
$('#avatarRefreshBtn').onclick=()=>refreshAvatarState().catch(error);
$('#avatarRenderBtn').onclick=async()=>{
  clearError();if(!selectedAvatarId)return error(new Error('Selecione um avatar.'));
  busy(true);try{
    const d=await req(`/api/visio/avatars/${encodeURIComponent(selectedAvatarId)}/render`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({direction:$('#avatarDirection').value,quality:'high'})});
    showImage(d.image_url,'Imagem do avatar persistente',d.model);
  }catch(e){error(e)}finally{busy(false)}
};
$('#avatarRevokeBtn').onclick=async()=>{
  if(!selectedAvatarId||!confirm('Revogar este avatar? Novas gerações com ele serão bloqueadas.'))return;
  clearError();busy(true);try{await req(`/api/visio/avatars/${encodeURIComponent(selectedAvatarId)}/revoke`,{method:'POST'});selectedAvatarId='';await refreshAvatarState();showText('Avatar revogado. Novas gerações foram bloqueadas.','Avatar revogado')}catch(e){error(e)}finally{busy(false)}
};
$('#avatarDeleteBtn').onclick=async()=>{
  if(!selectedAvatarId||!confirm('Excluir definitivamente este avatar e suas referências?'))return;
  clearError();busy(true);try{const id=selectedAvatarId;await req(`/api/visio/avatars/${encodeURIComponent(id)}/delete`,{method:'POST'});selectedAvatarId='';await refreshAvatarState();showText(`Avatar ${id} excluído.`,'Avatar excluído')}catch(e){error(e)}finally{busy(false)}
};

$('#analyzeBtn').onclick=async()=>{clearError();busy(true);try{const img=await readFile($('#analyzeFile').files[0]);if(!img)throw new Error('Escolha uma imagem.');const d=await req('/api/visio/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_data_url:img,instruction:$('#analyzeInstruction').value})});showText(d.analysis,'Análise visual',d.model)}catch(e){error(e)}finally{busy(false)}};
$('#editBtn').onclick=async()=>{clearError();busy(true);try{const img=await readFile($('#editFile').files[0]);if(!img)throw new Error('Escolha uma imagem.');const d=await req('/api/visio/edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_data_url:img,prompt:$('#editPrompt').value,quality:'high'})});showImage(d.image_data_url||d.image_url,'Imagem editada',d.model)}catch(e){error(e)}finally{busy(false)}};
$('#voiceBtn').onclick=async()=>{clearError();busy(true);try{const d=await req('/api/visio/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:$('#voiceText').value,voice:$('#voiceName').value,instructions:$('#voiceDirection').value||'Fale em português do Brasil, de forma natural, clara e profissional.'})});showAudio(d.audio_url||d.audio_data_url,'Voz sintética',d.model)}catch(e){error(e)}finally{busy(false)}};

async function pollVideo(id){
  clearInterval(videoTimer);videoTimer=setInterval(async()=>{
    try{
      const d=await req('/api/visio/video/'+encodeURIComponent(id));$('#resultTitle').textContent=`Vídeo: ${d.status} · ${d.progress||0}%`;
      if(d.status==='completed'){clearInterval(videoTimer);$('#canvas').innerHTML=`<video controls autoplay src="${API}/api/visio/video/${encodeURIComponent(id)}/content"></video>`;$('#resultTitle').textContent='Vídeo concluído'}
      if(d.status==='failed'){clearInterval(videoTimer);throw new Error('A geração do vídeo falhou.')}
    }catch(e){clearInterval(videoTimer);error(e)}
  },4000)
}
$('#videoBtn').onclick=async()=>{
  clearError();busy(true);
  try{
    const avatarId=$('#videoAvatar').value;
    let path='/api/visio/animate',payload={script:$('#videoScript').value,direction:$('#videoDirection').value,seconds:Number($('#seconds').value),size:$('#videoSize').value};
    if(avatarId){path=`/api/visio/avatars/${encodeURIComponent(avatarId)}/animate`}
    else payload.image_data_url=await readFile($('#videoFile').files[0]);
    const d=await req(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    $('#canvas').innerHTML=`<div class="empty"><span>▶</span><b>Vídeo em produção</b><small>Job ${d.video_id}</small></div>`;$('#resultTitle').textContent='Vídeo enfileirado';$('#model').textContent=d.model;pollVideo(d.video_id);
  }catch(e){error(e)}finally{busy(false)}
};
$('#new').onclick=()=>location.reload();
$('#logout').onclick=async()=>{await fetch(API+'/api/auth/logout',{method:'POST',credentials:'include'}).catch(()=>{});location.replace('/')};
auth();
