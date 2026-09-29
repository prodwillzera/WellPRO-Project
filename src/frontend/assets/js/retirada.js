import { listarChaves, listarMovimentacoes, retirarChave } from './modules/dados.js';
import { mensagem } from './modules/interface.js';
const form = document.querySelector('form');
const select = form.elements.chave;
const botao = form.querySelector('button');
let disponiveis = [];

async function carregar() {
  disponiveis = (await listarChaves()).filter((c) => c.status === 'disponivel');
  select.replaceChildren(
    new Option('Selecione uma chave', ''),
    ...disponiveis.map((c) => new Option(c.identificacao, c.id))
  );
  const id = new URLSearchParams(location.search).get('chave');
  if (disponiveis.some((c) => String(c.id) === id)) select.value = id;
  botao.disabled = !disponiveis.length;
  if (!disponiveis.length) mensagem('Nenhuma chave disponível. Consulte o inventário.');
}
async function carregarPessoas() {
  const movimentos = await listarMovimentacoes();
  const nomes = [...new Set(movimentos.map((m) => m.responsavel))];
  document.querySelector('#pessoas').replaceChildren(...nomes.map((nome) => new Option(nome)));
}
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  botao.disabled = true;
  try {
    await retirarChave(Object.fromEntries(new FormData(form)));
    form.reset();
    await carregar();
    await carregarPessoas();
    mensagem('Retirada registrada. A chave está em uso.');
  } catch (erro) {
    mensagem(erro.message);
  } finally {
    botao.disabled = !disponiveis.length;
  }
});
carregar().catch((erro) => mensagem(erro.message));
carregarPessoas().catch((erro) => mensagem(erro.message));
