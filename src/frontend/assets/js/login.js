import { api } from './modules/dados.js';
import { mensagem } from './modules/interface.js';
const login = document.querySelector('#form-login');
const inicial = document.querySelector('#form-inicial');

async function verificarPrimeiroAcesso() {
  try {
    const dados = await api('/configuracao-inicial');
    login.hidden = dados.necessario;
    inicial.hidden = !dados.necessario;
    document.querySelector('#titulo-acesso').textContent = dados.necessario
      ? 'Primeiro acesso'
      : 'Acesse sua conta';
    document.querySelector('#orientacao').textContent = dados.necessario
      ? 'Crie a primeira conta de administrador para começar.'
      : 'Informe seu login e senha.';
    login.querySelector('button').disabled = false;
    inicial.querySelector('button').disabled = false;
  } catch (erro) {
    mensagem(erro.message);
  }
}

login.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = login.querySelector('button');
  botao.disabled = true;
  try {
    await api('/login', 'POST', {
      login: login.elements.usuario.value,
      senha: login.elements.senha.value
    });
    location.assign('painel.html');
  } catch (erro) {
    mensagem(erro.message);
    botao.disabled = false;
  }
});
inicial.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (inicial.elements.senha.value !== inicial.elements.confirmacao.value)
    return mensagem('As senhas não conferem.');
  const botao = inicial.querySelector('button');
  botao.disabled = true;
  try {
    await api('/configuracao-inicial', 'POST', {
      nome: inicial.elements.nome.value,
      login: inicial.elements.login.value,
      senha: inicial.elements.senha.value
    });
    location.assign('painel.html');
  } catch (erro) {
    mensagem(erro.message);
    botao.disabled = false;
  }
});
verificarPrimeiroAcesso();
