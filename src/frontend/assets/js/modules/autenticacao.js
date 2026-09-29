import { api } from './dados.js';
import { mensagem } from './interface.js';

// Apenas texto, permissões e imagens são atualizados. O menu continua no HTML.
try {
  const usuario = await api('/sessao');
  if (usuario.perfil !== 'administrador') {
    document
      .querySelectorAll('a[href="usuarios.html"], a[href="cadastro.html"], [data-admin]')
      .forEach((el) => (el.hidden = true));
  } else {
    document.querySelectorAll('[data-admin]').forEach((el) => (el.hidden = false));
  }
  const sair = document.querySelector('#sair');
  sair.textContent = 'Sair (' + usuario.nome + ')';
  sair.onclick = async (evento) => {
    evento.preventDefault();
    try {
      await api('/logout', 'POST', {});
      location.assign('index.html');
    } catch (erro) {
      mensagem(erro.message);
    }
  };
  const organizacao = await api('/organizacao');
  document.querySelector('[data-organizacao-nome]').textContent = organizacao.nome;
  document.querySelector('[data-organizacao-unidade]').textContent = organizacao.unidade;
  const imagem = document.querySelector('[data-organizacao-imagem]');
  if (organizacao.imagem) {
    imagem.src = organizacao.imagem;
    imagem.alt = organizacao.nome;
    imagem.hidden = false;
    imagem.onerror = () => (imagem.hidden = true);
  }
} catch (erro) {
  mensagem(erro.message);
}
