export function mensagem(texto) {
  let p = document.querySelector('#mensagem');
  if (!p) { p = document.createElement('p'); p.id = 'mensagem'; p.className = 'aviso'; p.setAttribute('role', 'status'); document.querySelector('main').prepend(p); }
  p.textContent = texto;
}
export function celula(linha, rotulo, valor) {
  const td = document.createElement('td'); td.dataset.label = rotulo; td.textContent = valor ?? '—'; linha.append(td); return td;
}
