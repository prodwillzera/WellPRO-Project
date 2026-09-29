import { randomBytes } from 'node:crypto';
const sessoes = new Map();
export function criar(res, usuario) {
  const token = randomBytes(32).toString('hex');
  sessoes.set(token, { id: usuario.id, expira: Date.now() + 8 * 60 * 60 * 1000 });
  res.cookie('wellpro_sessao', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });
}
function token(req) {
  return (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('wellpro_sessao='))
    ?.split('=')[1];
}
export function atual(req, estado) {
  const t = token(req);
  const s = sessoes.get(t);
  if (!s || s.expira < Date.now()) {
    sessoes.delete(t);
    return null;
  }
  return estado.usuarios.find((u) => u.id === s.id && u.ativo) || null;
}
export function sair(req, res) {
  sessoes.delete(token(req));
  res.clearCookie('wellpro_sessao', { path: '/' });
}
export function invalidar(id) {
  for (const [t, s] of sessoes) if (s.id === id) sessoes.delete(t);
}
