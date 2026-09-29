import { mensagem, celula } from './modules/interface.js';
const form = document.querySelector('#form-usuario'); let editando = null;
async function api(url,method='GET',body) {
  const r=await fetch('/api'+url,{method,headers:{'Content-Type':'application/json','X-WellPro':'1'},body:body?JSON.stringify(body):undefined});
  const dados=await r.json();if(!r.ok)throw new Error(dados.erro||'Falha no servidor.');return dados;
}
async function renderizar() {
  const usuarios=await api('/usuarios');const corpo=document.querySelector('tbody');corpo.replaceChildren();
  usuarios.forEach(u=>{const tr=document.createElement('tr');[u.nome,u.login,u.perfil,u.ativo?'Ativo':'Inativo'].forEach((v,i)=>celula(tr,['Nome','Login','Perfil','Situação'][i],v));
    const td=celula(tr,'Ações','');const b=document.createElement('button');b.type='button';b.textContent='Editar';b.onclick=()=>{editando=u.id;for(const n of ['nome','login','perfil'])form.elements[n].value=u[n];form.elements.ativo.checked=u.ativo;form.elements.senha.value='';form.elements.senha.required=false;form.elements.nome.focus();};td.append(b);corpo.append(tr);});
}
form.addEventListener('submit',async e=>{e.preventDefault();try{await api(editando?'/usuarios/'+editando:'/usuarios',editando?'PUT':'POST',{...Object.fromEntries(new FormData(form)),ativo:form.elements.ativo.checked});form.reset();editando=null;form.elements.senha.required=true;await renderizar();mensagem('Usuário salvo.');}catch(e){mensagem(e.message);}});
document.querySelector('#cancelar').onclick=()=>{form.reset();editando=null;form.elements.senha.required=true;};
renderizar().catch(e=>mensagem(e.message));
