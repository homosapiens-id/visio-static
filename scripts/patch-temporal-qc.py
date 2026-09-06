from pathlib import Path

p = Path("app/studio.js")
s = p.read_text()

old = r"""async function pollVideo(id){
  clearInterval(videoTimer);videoTimer=setInterval(async()=>{
    try{
      const d=await req('/api/visio/video/'+encodeURIComponent(id));$('#resultTitle').textContent=`Vídeo: ${d.status} · ${d.progress||0}%`;
      if(d.status==='completed'){clearInterval(videoTimer);$('#canvas').innerHTML=`<video controls autoplay src="${API}/api/visio/video/${encodeURIComponent(id)}/content"></video>`;$('#resultTitle').textContent='Vídeo concluído'}
      if(d.status==='failed'){clearInterval(videoTimer);throw new Error('A geração do vídeo falhou.')}
    }catch(e){clearInterval(videoTimer);error(e)}
  },4000)
}"""

new = r"""async function pollVideo(id,avatarId=''){
  clearInterval(videoTimer);videoTimer=setInterval(async()=>{
    try{
      const statusPath=avatarId
        ? `/api/visio/avatars/${encodeURIComponent(avatarId)}/video/${encodeURIComponent(id)}`
        : '/api/visio/video/'+encodeURIComponent(id);
      const d=await req(statusPath),qc=d.identity_qc;
      $('#resultTitle').textContent=`Vídeo: ${d.status} · ${d.progress||0}%${qc?.status&&qc.status!=='pending_video_validation'?` · QC ${qc.status}`:''}`;
      if(d.status==='completed'){
        clearInterval(videoTimer);
        if(avatarId&&qc?.status!=='pass'){
          const detail=qc?.status==='fail'
            ? `QC de identidade reprovado · score ${qc.overall_score??'—'} · mínimo estrito ${qc.strict_min??'—'}`
            : `QC de identidade não verificado · ${qc?.reason||'avaliação indisponível'}`;
          showText(`${detail}\nO vídeo foi retido e não será exibido automaticamente.`,'Vídeo retido pelo QC de identidade');
          return;
        }
        $('#canvas').innerHTML=`<video controls autoplay src="${API}/api/visio/video/${encodeURIComponent(id)}/content"></video>`;
        $('#resultTitle').textContent=avatarId?`Vídeo concluído · QC aprovado · score ${qc?.overall_score??'—'}`:'Vídeo concluído';
      }
      if(d.status==='failed'){clearInterval(videoTimer);throw new Error('A geração do vídeo falhou.')}
    }catch(e){clearInterval(videoTimer);error(e)}
  },4000)
}"""

if "async function pollVideo(id,avatarId='')" not in s:
    if old not in s:
        raise SystemExit("pollVideo marker missing")
    s = s.replace(old, new, 1)

s = s.replace("pollVideo(d.video_id);", "pollVideo(d.video_id,avatarId);", 1)

for marker in [
    "async function pollVideo(id,avatarId='')",
    "QC de identidade reprovado",
    "Vídeo retido pelo QC de identidade",
    "pollVideo(d.video_id,avatarId)"
]:
    if marker not in s:
        raise SystemExit(f"contract marker missing: {marker}")

p.write_text(s)
