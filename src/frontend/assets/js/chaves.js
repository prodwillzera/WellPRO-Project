import { listarChaves, marcarPerdida, marcarEncontrada } from './modules/dados.js';
import { celula, mensagem, badge, linhaVazia } from './modules/interface.js';
const busca = document.querySelector('input[type="search"]');
const situacao = document.querySelector('.filtros select');
let chaves = [];

function renderizar() {
  const corpo = document.querySelector('tbody');
  corpo.replaceChildren();
  const filtro = busca.value.toLocaleLowerCase();
  const filtradas = chaves.filter(
    (c) =>
      `${c.identificacao} ${c.descricao} ${c.localizacao} ${c.responsavel}`
        .toLocaleLowerCase()
        .includes(filtro) &&
      (!situacao.value || c.status === situacao.value)
  );
  for (const chave of filtradas) {
    const linha = document.createElement('tr');
    const identificacao = celula(linha, 'Chave', chave.identificacao);
    const descricao = document.createElement('small');
    descricao.textContent = [chave.finalidade, chave.descricao].filter(Boolean).join(' · ');
    identificacao.append(descricao);
    celula(linha, 'Localização', chave.localizacao || '—');
    badge(linha, chave.status);
    celula(linha, 'Responsável', chave.responsavel || '—');
    const acao = celula(linha, 'Ação', '');
    acao.className = 'acoes-tabela';
    if (chave.status !== 'perdida') {
      const link = document.createElement('a');
      link.className = 'link';
      link.href =
        (chave.status === 'disponivel' ? 'retirada.html' : 'devolucao.html') + '?chave=' + chave.id;
      link.textContent = chave.status === 'disponivel' ? 'Retirar' : 'Devolver';
      acao.append(link);
    }
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent =
      chave.status === 'perdida' ? 'Marcar como encontrada' : 'Marcar como perdida';
    botao.onclick = async () => {
      const perdida = chave.status === 'perdida';
      const pergunta = perdida
        ? 'Confirma que a chave voltou ao ponto de controle? A retirada em aberto será encerrada e a chave ficará disponível.'
        : 'Confirmar que esta chave foi perdida?';
      if (!confirm(pergunta)) return;
      botao.disabled = true;
      try {
        if (perdida) await marcarEncontrada(chave.id);
        else await marcarPerdida(chave.id);
        await carregar();
        mensagem(
          perdida
            ? 'Chave encontrada e disponível. Evento registrado no histórico.'
            : 'Chave marcada como perdida. Evento registrado no histórico.'
        );
      } catch (erro) {
        mensagem(erro.message);
        botao.disabled = false;
      }
    };
    acao.append(botao);
    corpo.append(linha);
  }
  if (!filtradas.length) linhaVazia(corpo, 'Nenhuma chave encontrada.');
}
async function carregar() {
  chaves = await listarChaves();
  renderizar();
}
busca.addEventListener('input', renderizar);
situacao.addEventListener('change', renderizar);
carregar().catch((erro) => mensagem(erro.message));
