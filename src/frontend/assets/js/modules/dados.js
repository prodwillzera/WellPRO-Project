import { podeRetirar, podeDevolver, alterarStatus } from './status.js';
const CHAVE = 'wellpro.chaves';
export function listarChaves() { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); }
export function cadastrarChave(dados) {
  const chaves = listarChaves();
  const identificacao = dados.identificacao.trim();
  if (!identificacao) throw new Error('Informe a identificação.');
  if (chaves.some(c => c.identificacao.toLocaleLowerCase() === identificacao.toLocaleLowerCase())) throw new Error('Identificação já cadastrada.');
  chaves.push({id: crypto.randomUUID(), identificacao, descricao: dados.descricao.trim(), finalidade: dados.finalidade, localizacao: dados.localizacao.trim(), status: 'disponivel'});
  localStorage.setItem(CHAVE, JSON.stringify(chaves));
}

export function listarMovimentacoes() { return JSON.parse(localStorage.getItem('wellpro.movimentacoes') || '[]'); }
export function retirarChave(dados) {
  const chaves = listarChaves(); const c = chaves.find(c => c.id === dados.chave);
  if (!podeRetirar(c)) throw new Error('Chave indisponível.');
  if (!dados.responsavel.trim()) throw new Error('Informe o responsável.');
  const movimentos = listarMovimentacoes();
  movimentos.push({id: crypto.randomUUID(), chave_id: c.id, responsavel: dados.responsavel.trim(), identificacao: dados.identificacao.trim(), observacao: dados.observacao.trim(), retirada_em: new Date().toISOString(), devolucao_em: null});
  alterarStatus(c, 'retirada', dados.responsavel.trim());
  localStorage.setItem('wellpro.movimentacoes', JSON.stringify(movimentos));
  localStorage.setItem(CHAVE, JSON.stringify(chaves));
}

export function devolverChave(dados) {
  const chaves = listarChaves(); const c = chaves.find(c => c.id === dados.chave);
  const movimentos = listarMovimentacoes(); const m = movimentos.find(m => m.chave_id === dados.chave && !m.devolucao_em);
  if (!podeDevolver(c) || !m) throw new Error('Não há retirada em aberto para esta chave.');
  m.devolucao_em = new Date().toISOString(); m.observacao_devolucao = dados.observacao.trim();
  alterarStatus(c, 'disponivel');
  localStorage.setItem('wellpro.movimentacoes', JSON.stringify(movimentos));
  localStorage.setItem(CHAVE, JSON.stringify(chaves));
}
