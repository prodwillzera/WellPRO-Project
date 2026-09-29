const CHAVE = 'wellpro.chaves';
export function listarChaves() { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); }
export function cadastrarChave(dados) {
  const chaves = listarChaves();
  const identificacao = dados.identificacao.trim();
  if (!identificacao) throw new Error('Informe a identificação.');
  if (chaves.some(c => c.identificacao.toLocaleLowerCase() === identificacao.toLocaleLowerCase())) throw new Error('Identificação já cadastrada.');
  chaves.push({id: crypto.randomUUID(), identificacao, descricao: dados.descricao.trim(), finalidade: dados.finalidade, localizacao: dados.localizacao.trim(), status: 'disponivel'});
  localStorage.setItem(CHAVE, JSON.stringify(chaves));
}
