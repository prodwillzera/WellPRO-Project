import { api } from './modules/dados.js';
import { celula, badge, linhaVazia, mensagem } from './modules/interface.js';
try {
  const dados = await api('/painel');
  const numeros = [dados.total, dados.disponiveis, dados.retiradas, dados.perdidas];
  document.querySelectorAll('.indicador strong').forEach((el, i) => (el.textContent = numeros[i]));
  const corpo = document.querySelector('tbody');
  corpo.replaceChildren();
  for (const chave of dados.emUso) {
    const linha = document.createElement('tr');
    celula(linha, 'Chave', chave.identificacao);
    celula(linha, 'Localização', chave.localizacao);
    badge(linha, chave.status);
    celula(linha, 'Responsável', chave.responsavel);
    const link = document.createElement('a');
    link.href = 'devolucao.html?chave=' + chave.id;
    link.className = 'link';
    link.textContent = 'Devolver';
    celula(linha, 'Ação', '').append(link);
    corpo.append(linha);
  }
  if (!dados.emUso.length) linhaVazia(corpo, 'Nenhuma chave em uso.');
} catch (erro) {
  mensagem(erro.message);
}
