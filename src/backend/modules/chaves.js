function texto(v,max=250) { if(typeof v!=='string'||v.trim().length>max)throw new Error('Texto inválido.');return v.trim(); }
function proximo(lista) { return Math.max(0,...lista.map(x=>x.id))+1; }
export function cadastrar(estado,dados) {
  const identificacao=texto(dados.identificacao,120);
  if(!identificacao)throw new Error('Informe a identificação.');
  if(estado.chaves.some(c=>c.identificacao.toLowerCase()===identificacao.toLowerCase()))throw new Error('Identificação já cadastrada.');
  if(!['Sala','Laboratório','Armário','Outro'].includes(dados.finalidade))throw new Error('Finalidade inválida.');
  const c={id:proximo(estado.chaves),identificacao,descricao:texto(dados.descricao||''),finalidade:dados.finalidade,localizacao:texto(dados.localizacao||''),status:'disponivel',responsavel:'',criado_em:new Date().toISOString()};
  estado.chaves.push(c);return c;
}
export function retirar(estado,dados,usuario) {
  const c=estado.chaves.find(c=>c.id===Number(dados.chave));
  if(!c||c.status!=='disponivel'||estado.movimentacoes.some(m=>m.chave_id===c.id&&!m.devolucao_em))throw new Error('Chave indisponível.');
  const responsavel=texto(dados.responsavel,120);if(!responsavel)throw new Error('Informe responsável.');
  estado.movimentacoes.push({id:proximo(estado.movimentacoes),chave_id:c.id,responsavel,identificacao:texto(dados.identificacao||'',120),observacao:texto(dados.observacao||'',1000),retirada_em:new Date().toISOString(),devolucao_em:null,usuario_retirada_id:usuario.id,usuario_devolucao_id:null});
  c.status='retirada';c.responsavel=responsavel;
}
export function devolver(estado,dados,usuario) {
  const c=estado.chaves.find(c=>c.id===Number(dados.chave));const m=estado.movimentacoes.find(m=>m.chave_id===c?.id&&!m.devolucao_em);
  if(!c||c.status!=='retirada'||!m)throw new Error('Não há retirada em aberto.');
  m.devolucao_em=new Date().toISOString();m.usuario_devolucao_id=usuario.id;m.observacao_devolucao=texto(dados.observacao||'',1000);c.status='disponivel';c.responsavel='';
}
export function perder(estado,id) {
  const c=estado.chaves.find(c=>c.id===Number(id));if(!c||c.status==='perdida')throw new Error('Chave inexistente ou já perdida.');c.status='perdida';
}
