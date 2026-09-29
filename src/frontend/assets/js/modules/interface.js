import { rotulos } from './status.js';

export function mensagem(texto) {
  const campo = document.querySelector('#mensagem');
  campo.textContent = texto;
  campo.hidden = !texto;
}

export function celula(linha, rotulo, valor) {
  const td = document.createElement('td');
  td.dataset.label = rotulo;
  td.textContent = valor ?? '—';
  linha.append(td);
  return td;
}

export function badge(linha, status) {
  const td = celula(linha, 'Situação', '');
  const span = document.createElement('span');
  span.className = 'status ' + status;
  span.textContent = rotulos[status];
  td.append(span);
}

export function linhaVazia(corpo, texto, colunas = 5) {
  const linha = document.createElement('tr');
  celula(linha, 'Resultado', texto).colSpan = colunas;
  corpo.append(linha);
}

export function dataHora(iso) {
  if (!iso) return '—';
  // CURRENT_TIMESTAMP do SQLite antigo não traz o sufixo UTC.
  const data = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  return new Date(data).toLocaleString('pt-BR');
}
