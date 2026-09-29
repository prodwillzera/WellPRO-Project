import { listarChaves, devolverChave } from './modules/dados.js';
import { celula, mensagem } from './modules/interface.js';
const form = document.querySelector('form'); const select = form.elements.chave;
async function carregar() {
  const chaves = (await listarChaves()).filter(c => c.status === 'retirada');
  select.replaceChildren(...chaves.map(c => new Option(c.identificacao, c.id)));
  form.querySelector('button').disabled = !chaves.length;
  const corpo = document.querySelector('tbody'); corpo.replaceChildren();
  chaves.forEach(c => { const tr = document.createElement('tr'); [c.identificacao,c.localizacao,c.status,c.responsavel,'Selecione abaixo'].forEach((v,i) => celula(tr,['Chave','Localização','Situação','Responsável','Ação'][i],v)); corpo.append(tr); });
  document.querySelector('#responsavel').textContent = chaves.find(c => c.id === select.value)?.responsavel || '—';
  select.onchange = () => { document.querySelector('#responsavel').textContent = chaves.find(c => c.id === select.value)?.responsavel || '—'; };
  if (!chaves.length) mensagem('Nenhuma retirada em aberto.');
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  try { await devolverChave(Object.fromEntries(new FormData(form))); form.reset(); await carregar(); mensagem('Devolução registrada.'); }
  catch (erro) { mensagem(erro.message); }
});
carregar().catch(e => mensagem(e.message));
