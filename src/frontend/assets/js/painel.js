import { listarChaves } from './modules/dados.js';
import { celula, mensagem } from './modules/interface.js';
try {
  const chaves = await listarChaves();
  const numeros = [chaves.length, ...['disponivel','retirada','perdida'].map(s => chaves.filter(c => c.status === s).length)];
  document.querySelectorAll('.indicador strong').forEach((el,i) => el.textContent = numeros[i]);
  const corpo = document.querySelector('tbody'); corpo.replaceChildren();
  chaves.filter(c => c.status === 'retirada').forEach(c => {
    const tr = document.createElement('tr'); [c.identificacao,c.localizacao,'Retirada',c.responsavel,'Consulte Devolução'].forEach((v,i) => celula(tr,['Chave','Localização','Situação','Responsável','Ação'][i],v)); corpo.append(tr);
  });
} catch(e) { mensagem(e.message); }
