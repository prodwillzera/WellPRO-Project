export const rotulos = {disponivel: 'Disponível', retirada: 'Retirada', perdida: 'Perdida'};
export function podeRetirar(chave) { return chave?.status === 'disponivel'; }
export function podeDevolver(chave) { return chave?.status === 'retirada'; }
export function alterarStatus(chave, status, responsavel = '') {
  if (!rotulos[status]) throw new Error('Situação inválida.');
  chave.status = status; chave.responsavel = responsavel;
}
