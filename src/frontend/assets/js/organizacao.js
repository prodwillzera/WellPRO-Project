import { api } from './modules/dados.js';
import { mensagem } from './modules/interface.js';
const form = document.querySelector('#form-organizacao');
function mostrar(dados) {
  document.querySelector('#nome-organizacao').textContent = dados.nome;
  document.querySelector('#unidade-organizacao').textContent = dados.unidade;
  const imagem = document.querySelector('#imagem-organizacao');
  imagem.hidden = !dados.imagem;
  imagem.alt = dados.nome;
  if (dados.imagem) imagem.src = dados.imagem;
  imagem.onerror = () => {
    imagem.hidden = true;
    mensagem('Imagem não encontrada. Confira o arquivo em assets/img.');
  };
  for (const campo of ['nome', 'unidade', 'imagem']) form.elements[campo].value = dados[campo];
  document.querySelector('[data-organizacao-nome]').textContent = dados.nome;
  document.querySelector('[data-organizacao-unidade]').textContent = dados.unidade;
  const logo = document.querySelector('[data-organizacao-imagem]');
  logo.hidden = !dados.imagem;
  if (dados.imagem) logo.src = dados.imagem;
}
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = form.querySelector('button');
  botao.disabled = true;
  try {
    const dados = await api('/organizacao', 'PUT', Object.fromEntries(new FormData(form)));
    mostrar(dados);
    mensagem('Organização atualizada.');
  } catch (erro) {
    mensagem(erro.message);
  } finally {
    botao.disabled = false;
  }
});
api('/organizacao')
  .then((dados) => {
    mostrar(dados);
    for (const campo of form.elements) campo.disabled = false;
  })
  .catch((erro) => mensagem(erro.message));
