async function api(caminho,body) {
  const r=await fetch('/api'+caminho,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-WellPro':'1'},body:body?JSON.stringify(body):undefined});
  const dados=await r.json();if(r.status===401)location.assign('index.html');if(!r.ok)throw new Error(dados.erro||'Falha na operação.');return dados;
}
export function listarChaves(){return api('/chaves');}
export function listarMovimentacoes(){return api('/movimentacoes');}
export function cadastrarChave(dados){return api('/chaves',dados);}
export function retirarChave(dados){return api('/retiradas',dados);}
export function devolverChave(dados){return api('/devolucoes',dados);}
export function marcarPerdida(id){return api('/chaves/'+id+'/perda',{});}
