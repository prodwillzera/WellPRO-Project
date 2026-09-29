import { listarChaves, retirarChave } from './modules/dados.js';
import { mensagem } from './modules/interface.js';
const form = document.querySelector('form'); const select = form.elements.chave;
async function carregar() {
  const chaves = (await listarChaves()).filter(c => c.status === 'disponivel');
  select.replaceChildren(...chaves.map(c => new Option(c.identificacao, c.id)));
  form.querySelector('button').disabled = !chaves.length;
  if (!chaves.length) mensagem('Nenhuma chave disponível. Cadastre uma chave primeiro.');
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  try { await retirarChave(Object.fromEntries(new FormData(form))); form.reset(); await carregar(); mensagem('Retirada registrada.'); }
  catch (erro) { mensagem(erro.message); }
});
carregar().catch(e => mensagem(e.message));
