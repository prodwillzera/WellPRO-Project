import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export function hashSenha(senha) {
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 128) throw new Error('Senha deve ter de 8 a 128 caracteres.');
  const sal = randomBytes(16).toString('hex');
  return `${sal}:${scryptSync(senha,sal,64).toString('hex')}`;
}
export function verificarSenha(senha, hash) {
  if (typeof senha !== 'string' || senha.length > 128) return false;
  const [sal,digest] = String(hash).split(':');
  if (!sal || !digest) return false;
  const valor = Buffer.from(digest,'hex');
  return valor.length === 64 && timingSafeEqual(valor,scryptSync(senha,sal,64));
}
export function publico({senha_hash,...usuario}) { return usuario; }
export function salvarUsuario(estado, dados, id) {
  const nome = String(dados.nome || '').trim(); const login = String(dados.login || '').trim();
  if (!nome || nome.length > 120 || !/^[a-zA-Z0-9_.-]{3,60}$/.test(login)) throw new Error('Informe nome e login de 3 a 60 caracteres (letras, números, ponto, hífen ou sublinhado).');
  if (!['administrador','operador'].includes(dados.perfil)) throw new Error('Perfil inválido.');
  if (estado.usuarios.some(u => u.id !== id && u.login.toLowerCase() === login.toLowerCase())) throw new Error('Login já cadastrado.');
  if (dados.ativo !== undefined && typeof dados.ativo !== 'boolean') throw new Error('Ativação inválida.');
  let usuario = id ? estado.usuarios.find(u => u.id === id) : null;
  if (id && !usuario) throw new Error('Usuário não encontrado.');
  const ativo = dados.ativo ?? true;
  if (usuario?.ativo && usuario.perfil === 'administrador' && (!ativo || dados.perfil !== 'administrador') && !estado.usuarios.some(u => u.id !== id && u.ativo && u.perfil === 'administrador')) throw new Error('Mantenha ao menos um administrador ativo.');
  if (!estado.usuarios.length && (!ativo || dados.perfil !== 'administrador')) throw new Error('O primeiro usuário deve ser administrador ativo.');
  const senha_hash = dados.senha ? hashSenha(dados.senha) : usuario?.senha_hash;
  if (!senha_hash) throw new Error('Informe a senha inicial.');
  if (!usuario) { usuario = {id: Math.max(0,...estado.usuarios.map(u=>u.id))+1, criado_em:new Date().toISOString()}; estado.usuarios.push(usuario); }
  Object.assign(usuario,{nome,login,perfil:dados.perfil,ativo,senha_hash}); return publico(usuario);
}
