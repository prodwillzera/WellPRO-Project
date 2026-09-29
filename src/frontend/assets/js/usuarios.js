import { api } from './modules/dados.js';
import { mensagem, celula, linhaVazia } from './modules/interface.js';
const form = document.querySelector('#form-usuario');
let editando = null;
function limpar() {
  form.reset();
  editando = null;
  form.elements.senha.required = true;
  document.querySelector('#modo-usuario').textContent = 'Novo usuário';
}
async function renderizar() {
  const usuarios = await api('/usuarios');
  const corpo = document.querySelector('tbody');
  corpo.replaceChildren();
  for (const usuario of usuarios) {
    const linha = document.createElement('tr');
    celula(linha, 'Nome', usuario.nome);
    celula(linha, 'Login', usuario.login);
    celula(linha, 'Perfil', usuario.perfil);
    celula(linha, 'Situação', usuario.ativo ? 'Ativo' : 'Inativo');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'Editar';
    botao.onclick = () => {
      editando = usuario.id;
      for (const campo of ['nome', 'login', 'perfil']) form.elements[campo].value = usuario[campo];
      form.elements.ativo.checked = usuario.ativo;
      form.elements.senha.value = '';
      form.elements.senha.required = false;
      document.querySelector('#modo-usuario').textContent = 'Editar usuário: ' + usuario.nome;
      form.elements.nome.focus();
    };
    celula(linha, 'Ações', '').append(botao);
    corpo.append(linha);
  }
  if (!usuarios.length) linhaVazia(corpo, 'Nenhum usuário cadastrado.');
}
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    const dados = Object.fromEntries(new FormData(form));
    dados.ativo = form.elements.ativo.checked;
    const resultado = await api(
      editando ? '/usuarios/' + editando : '/usuarios',
      editando ? 'PUT' : 'POST',
      dados
    );
    if (resultado.entrarNovamente) {
      location.assign('index.html');
      return;
    }
    limpar();
    await renderizar();
    mensagem('Usuário salvo.');
  } catch (erro) {
    mensagem(erro.message);
  } finally {
    botao.disabled = false;
  }
});
document.querySelector('#cancelar').onclick = limpar;
renderizar().catch((erro) => mensagem(erro.message));
