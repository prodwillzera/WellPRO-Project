import { rotulos } from './modules/status.js';
import { listarChaves } from './modules/dados.js';
import { celula, mensagem } from './modules/interface.js';
const busca = document.querySelector('input[type="search"]');
const situacao = document.querySelector('.filtros select');
situacao.addEventListener('change', renderizar);
async function renderizar() {
  try {
    const corpo = document.querySelector('tbody'); corpo.replaceChildren();
    const filtro = busca.value.toLocaleLowerCase();
    const chaves = (await listarChaves()).filter(c => `${c.identificacao} ${c.localizacao}`.toLocaleLowerCase().includes(filtro) && (!situacao.value || c.status === situacao.value));
    for (const c of chaves) {
      const tr = document.createElement('tr');
      celula(tr, 'Chave', `${c.identificacao} · ${c.finalidade}`);
      celula(tr, 'Localização', c.localizacao); celula(tr, 'Situação', rotulos[c.status]);
      celula(tr, 'Responsável', c.responsavel || '—'); celula(tr, 'Ação', '—'); corpo.append(tr);
    }
    if (!chaves.length) { const tr = document.createElement('tr'); celula(tr, 'Resultado', 'Nenhuma chave encontrada.').colSpan = 5; corpo.append(tr); }
  } catch (erro) { mensagem(erro.message); }
}
busca.addEventListener('input', renderizar);
renderizar();
