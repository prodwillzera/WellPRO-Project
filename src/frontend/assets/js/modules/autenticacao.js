import { mensagem } from './interface.js';
try {
  const r=await fetch('/api/sessao');if(!r.ok)throw new Error('Sessão encerrada.');const u=await r.json();
  if(u.perfil!=='administrador')document.querySelectorAll('a[href="usuarios.html"],a[href="cadastro.html"],[data-admin]').forEach(el=>el.hidden=true);
  document.querySelectorAll('.instituicao a[href="index.html"]').forEach(a=>{a.textContent='Sair ('+u.nome+')';a.onclick=async e=>{e.preventDefault();const r=await fetch('/api/logout',{method:'POST',headers:{'X-WellPro':'1'}});if(r.ok)location.assign('index.html');else mensagem('Não foi possível sair.');};});
}catch(e){location.replace('index.html');}
