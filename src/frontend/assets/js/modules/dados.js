// Uma função pequena para tratar os erros comuns das requisições.
export async function api(caminho, metodo = 'GET', corpo) {
  let resposta;
  try {
    resposta = await fetch('/api' + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'X-WellPro': '1' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira se o npm start está rodando.');
  }
  const dados = await resposta.json().catch(() => ({ erro: 'Resposta inválida do servidor.' }));
  if (!resposta.ok) {
    if (resposta.status === 401 && !['/login', '/configuracao-inicial'].includes(caminho)) {
      location.assign('index.html');
    }
    throw new Error(dados.erro || 'Não foi possível concluir a operação.');
  }
  return dados;
}
export function listarChaves() {
  return api('/chaves');
}
export function listarMovimentacoes() {
  return api('/movimentacoes');
}
export function cadastrarChave(dados) {
  return api('/chaves', 'POST', dados);
}
export function retirarChave(dados) {
  return api('/retiradas', 'POST', dados);
}
export function devolverChave(dados) {
  return api('/devolucoes', 'POST', dados);
}
export function marcarPerdida(id) {
  return api('/chaves/' + id + '/perda', 'POST', {});
}
export function marcarEncontrada(id) {
  return api('/chaves/' + id + '/encontrada', 'POST', {});
}
