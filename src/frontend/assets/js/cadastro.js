import { cadastrarChave } from './modules/dados.js';
import { mensagem } from './modules/interface.js';
const form = document.querySelector('form');
form.addEventListener('submit', async e => {
  e.preventDefault();
  try { await cadastrarChave(Object.fromEntries(new FormData(form))); form.reset(); mensagem('Chave cadastrada. Consulte a tela Chaves.'); }
  catch (erro) { mensagem(erro.message); }
});
