import { api } from './modules/dados.js';
import { celula, badge, dataHora, mensagem, linhaVazia } from './modules/interface.js';
const busca = document.querySelector('#busca');
const inicio = document.querySelector('#inicio');
const fim = document.querySelector('#fim');
const operacao = document.querySelector('#operacao');
const exportar = document.querySelector('#exportar');
const nomes = {
  retirada: 'Retirada',
  devolucao: 'Devolução',
  perda: 'Chave perdida',
  encontrada: 'Chave encontrada'
};
let eventos = [];
let filtrados = [];

function renderizar() {
  const corpo = document.querySelector('tbody');
  corpo.replaceChildren();
  mensagem('');
  if (inicio.value && fim.value && inicio.value > fim.value) {
    filtrados = [];
    exportar.disabled = true;
    mensagem('Data inicial não pode ser posterior à final.');
    return;
  }
  filtrados = eventos.filter((evento) => {
    const valor = evento.ocorrido_em.includes('T')
      ? evento.ocorrido_em
      : evento.ocorrido_em.replace(' ', 'T') + 'Z';
    const data = new Date(valor);
    const dia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    return (
      `${evento.chave} ${evento.responsavel} ${evento.operador}`
        .toLocaleLowerCase()
        .includes(busca.value.toLocaleLowerCase()) &&
      (!inicio.value || dia >= inicio.value) &&
      (!fim.value || dia <= fim.value) &&
      (!operacao.value || evento.tipo === operacao.value)
    );
  });
  for (const evento of filtrados) {
    const linha = document.createElement('tr');
    celula(linha, 'Chave', evento.chave);
    celula(linha, 'Responsável', evento.responsavel || '—');
    celula(linha, 'Operação', nomes[evento.tipo]);
    celula(linha, 'Data / hora', dataHora(evento.ocorrido_em));
    badge(linha, evento.status);
    celula(linha, 'Registrado por', evento.operador || 'Registro anterior');
    celula(linha, 'Observações', evento.observacoes || '—');
    corpo.append(linha);
  }
  if (!filtrados.length) linhaVazia(corpo, 'Nenhum evento encontrado.', 7);
  exportar.disabled = !filtrados.length;
}

function campoCSV(valor) {
  let texto = String(valor ?? '');
  if (/^[\s]*[=+@-]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replaceAll('"', '""') + '"';
}
exportar.onclick = () => {
  const linhas = [
    ['Chave', 'Responsável', 'Operação', 'Data/hora', 'Situação', 'Registrado por', 'Observações']
  ];
  for (const evento of filtrados)
    linhas.push([
      evento.chave,
      evento.responsavel,
      nomes[evento.tipo],
      dataHora(evento.ocorrido_em),
      evento.status,
      evento.operador,
      evento.observacoes
    ]);
  const csv = '\uFEFF' + linhas.map((linha) => linha.map(campoCSV).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wellpro-historico.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
[busca, inicio, fim, operacao].forEach((campo) => campo.addEventListener('input', renderizar));
api('/historico')
  .then((dados) => {
    eventos = dados;
    renderizar();
  })
  .catch((erro) => mensagem(erro.message));
