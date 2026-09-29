import { mensagem } from './modules/interface.js';
const form=document.querySelector('form');
form.addEventListener('submit',async e=>{e.preventDefault();try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json','X-WellPro':'1'},body:JSON.stringify({login:form.elements.usuario.value,senha:form.elements.senha.value})});const dados=await r.json();if(!r.ok)throw new Error(dados.erro);location.assign('painel.html');}catch(e){mensagem(e.message);}});
