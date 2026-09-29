import { listarChaves, listarMovimentacoes } from './modules/dados.js';
import { celula, dataHora, mensagem } from './modules/interface.js';
const [busca,inicio,fim] = document.querySelectorAll('.filtros input');
async function renderizar() {
  try {
    const chaves = await listarChaves(); const movimentos = await listarMovimentacoes();
    const corpo = document.querySelector('tbody'); corpo.replaceChildren();
    if (inicio.value && fim.value && inicio.value > fim.value) { mensagem('Data inicial não pode ser posterior à final.'); return; }
    for (const m of movimentos.slice().reverse()) {
      const c = chaves.find(c => c.id === m.chave_id); const dia = new Date(m.retirada_em).toLocaleDateString('en-CA');
      if (!`${c?.identificacao} ${m.responsavel}`.toLocaleLowerCase().includes(busca.value.toLocaleLowerCase()) || (inicio.value && dia < inicio.value) || (fim.value && dia > fim.value)) continue;
      const tr = document.createElement('tr');
      [c?.identificacao || 'Chave não encontrada',m.responsavel,dataHora(m.retirada_em),dataHora(m.devolucao_em),m.devolucao_em ? 'Devolvida' : c?.status === 'perdida' ? 'Perdida' : 'Retirada'].forEach((v,i) => celula(tr,['Chave','Responsável','Retirada','Devolução','Situação'][i],v)); corpo.append(tr);
    }
    if (!corpo.children.length) { const tr = document.createElement('tr'); celula(tr,'Resultado','Nenhuma movimentação encontrada.').colSpan=5; corpo.append(tr); }
  } catch(e) { mensagem(e.message); }
}
[busca,inicio,fim].forEach(el => el.addEventListener('input',renderizar)); renderizar();
