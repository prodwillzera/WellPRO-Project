import { listarChaves, devolverChave } from './modules/dados.js';
import { celula, badge, linhaVazia, mensagem } from './modules/interface.js';
const form = document.querySelector('form');
const select = form.elements.chave;
const botao = form.querySelector('button');
let chaves = [];
function responsavel() {
  document.querySelector('#responsavel').textContent =
    chaves.find((c) => String(c.id) === select.value)?.responsavel || '—';
}
async function carregar() {
  chaves = (await listarChaves()).filter((c) => c.status === 'retirada');
  select.replaceChildren(
    new Option('Selecione uma chave', ''),
    ...chaves.map((c) => new Option(c.identificacao, c.id))
  );
  const id = new URLSearchParams(location.search).get('chave');
  if (chaves.some((c) => String(c.id) === id)) select.value = id;
  botao.disabled = !chaves.length;
  const corpo = document.querySelector('tbody');
  corpo.replaceChildren();
  for (const chave of chaves) {
    const linha = document.createElement('tr');
    celula(linha, 'Chave', chave.identificacao);
    celula(linha, 'Localização', chave.localizacao);
    badge(linha, chave.status);
    celula(linha, 'Responsável', chave.responsavel);
    const selecionar = document.createElement('button');
    selecionar.type = 'button';
    selecionar.textContent = 'Selecionar';
    selecionar.onclick = () => {
      select.value = chave.id;
      responsavel();
      select.focus();
    };
    celula(linha, 'Ação', '').append(selecionar);
    corpo.append(linha);
  }
  if (!chaves.length) linhaVazia(corpo, 'Nenhuma retirada em aberto para devolução.');
  responsavel();
}
select.addEventListener('change', responsavel);
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  botao.disabled = true;
  try {
    await devolverChave(Object.fromEntries(new FormData(form)));
    form.reset();
    await carregar();
    mensagem('Devolução registrada. A chave está disponível.');
  } catch (erro) {
    mensagem(erro.message);
  } finally {
    botao.disabled = !chaves.length;
  }
});
carregar().catch((erro) => mensagem(erro.message));
