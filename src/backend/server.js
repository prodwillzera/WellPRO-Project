import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerEstado, alterarEstado } from './modules/repositorio.js';
import { salvarUsuario, publico, verificarSenha } from './modules/usuarios.js';
import * as sessoes from './config/sessoes.js';
import { cadastrar, retirar, devolver, perder, encontrar } from './modules/chaves.js';

const app = express();
const frontend = fileURLToPath(new URL('../frontend/', import.meta.url));
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// O cabeçalho e a origem impedem envio de formulários por outros sites.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (req.get('X-WellPro') !== '1') return res.status(403).json({ erro: 'Requisição inválida.' });
    if (req.get('origin') && req.get('origin') !== `${req.protocol}://${req.get('host')}`) {
      return res.status(403).json({ erro: 'Origem não permitida.' });
    }
  }
  next();
});

app.get('/api/configuracao-inicial', (req, res) => {
  res.json({ necessario: lerEstado().usuarios.length === 0 });
});

app.post('/api/configuracao-inicial', (req, res) => {
  const usuario = alterarEstado((estado) => {
    if (estado.usuarios.length) {
      const erro = new Error('O primeiro administrador já foi cadastrado.');
      erro.status = 403;
      throw erro;
    }
    return salvarUsuario(estado, { ...req.body, perfil: 'administrador', ativo: true });
  });
  sessoes.criar(res, usuario);
  res.status(201).json(usuario);
});

app.post('/api/login', (req, res) => {
  const login = String(req.body.login || '')
    .trim()
    .toLowerCase();
  const usuario = lerEstado().usuarios.find((u) => u.ativo && u.login.toLowerCase() === login);
  if (!usuario || !verificarSenha(req.body.senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'Login ou senha inválidos.' });
  }
  sessoes.sair(req, res);
  sessoes.criar(res, usuario);
  res.json(publico(usuario));
});

app.use('/api', (req, res, next) => {
  req.usuario = sessoes.atual(req, lerEstado());
  if (!req.usuario) return res.status(401).json({ erro: 'Sua sessão terminou. Entre novamente.' });
  next();
});

function admin(req, res, next) {
  if (req.usuario.perfil !== 'administrador') {
    return res.status(403).json({ erro: 'Acesso de administrador necessário.' });
  }
  next();
}

app.get('/api/sessao', (req, res) => res.json(publico(req.usuario)));
app.post('/api/logout', (req, res) => {
  sessoes.sair(req, res);
  res.json({ ok: true });
});
app.get('/api/usuarios', admin, (req, res) => res.json(lerEstado().usuarios.map(publico)));
app.post('/api/usuarios', admin, (req, res) => {
  const usuario = alterarEstado((estado) => salvarUsuario(estado, req.body));
  res.status(201).json(usuario);
});
app.put('/api/usuarios/:id', admin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ erro: 'ID inválido.' });
  const usuario = alterarEstado((estado) => salvarUsuario(estado, req.body, id));
  sessoes.invalidar(id);
  res.json({ ...usuario, entrarNovamente: id === req.usuario.id });
});

app.get('/api/chaves', (req, res) => res.json(lerEstado().chaves.filter((c) => c.ativo)));
app.get('/api/movimentacoes', (req, res) => res.json(lerEstado().movimentacoes));
app.post('/api/chaves', admin, (req, res) => {
  res.status(201).json(alterarEstado((estado) => cadastrar(estado, req.body)));
});
app.post('/api/retiradas', (req, res) => {
  alterarEstado((estado) => retirar(estado, req.body, req.usuario));
  res.json({ ok: true });
});
app.post('/api/devolucoes', (req, res) => {
  alterarEstado((estado) => devolver(estado, req.body, req.usuario));
  res.json({ ok: true });
});
app.post('/api/chaves/:id/perda', (req, res) => {
  alterarEstado((estado) => perder(estado, req.params.id, req.usuario));
  res.json({ ok: true });
});
app.post('/api/chaves/:id/encontrada', (req, res) => {
  alterarEstado((estado) => encontrar(estado, req.params.id, req.usuario));
  res.json({ ok: true });
});
app.get('/api/historico', (req, res) => {
  const estado = lerEstado();
  const eventos = estado.eventos.map((evento) => ({
    ...evento,
    chave: estado.chaves.find((c) => c.id === evento.chave_id)?.identificacao || 'Chave arquivada'
  }));
  res.json(eventos.sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em) || b.id - a.id));
});
app.get('/api/painel', (req, res) => {
  const chaves = lerEstado().chaves.filter((c) => c.ativo);
  res.json({
    total: chaves.length,
    disponiveis: chaves.filter((c) => c.status === 'disponivel').length,
    retiradas: chaves.filter((c) => c.status === 'retirada').length,
    perdidas: chaves.filter((c) => c.status === 'perdida').length,
    emUso: chaves.filter((c) => c.status === 'retirada')
  });
});
app.get('/api/organizacao', (req, res) => res.json(lerEstado().organizacao));
app.put('/api/organizacao', admin, (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const unidade = String(req.body.unidade || '').trim();
  const imagem = String(req.body.imagem || '').trim();
  if (!nome || nome.length > 120 || unidade.length > 120) {
    return res
      .status(400)
      .json({ erro: 'Informe nome de até 120 caracteres e unidade de até 120 caracteres.' });
  }
  if (
    imagem &&
    (!/^\/assets\/img\/[\w.-]+\.(png|jpe?g|svg|webp)$/i.test(imagem) ||
      !fs.existsSync(path.join(frontend, imagem)))
  ) {
    return res
      .status(400)
      .json({
        erro: 'Coloque a imagem em assets/img e informe um caminho válido, como /assets/img/campus.png.'
      });
  }
  alterarEstado((estado) => {
    estado.organizacao = { nome, unidade, imagem };
  });
  res.json({ nome, unidade, imagem });
});

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.get('/', (req, res) => res.redirect('/pages/index.html'));
app.use('/pages', (req, res, next) => {
  const pagina = path.posix.normalize(decodeURIComponent(req.path));
  res.set('Cache-Control', 'no-store');
  if (pagina === '/index.html') return next();
  const usuario = sessoes.atual(req, lerEstado());
  if (!usuario) return res.redirect('/pages/index.html');
  if (['/usuarios.html', '/cadastro.html'].includes(pagina) && usuario.perfil !== 'administrador') {
    return res
      .status(403)
      .send('Acesso restrito ao administrador. <a href="/pages/painel.html">Voltar ao painel</a>');
  }
  next();
});
// Só assets e pages são públicos; o banco e o código backend nunca são servidos.
app.use('/assets', express.static(path.join(frontend, 'assets')));
app.use('/pages', express.static(path.join(frontend, 'pages'), { index: false }));
app.use((req, res) =>
  res.status(404).send('Página não encontrada. <a href="/">Voltar ao início</a>')
);
app.use((erro, req, res, next) => {
  console.error(erro.message);
  if (erro.code?.startsWith('ERR_SQLITE') || /SQLITE|database/i.test(erro.message)) {
    return res
      .status(503)
      .json({
        erro: 'Não foi possível gravar ou consultar o banco. Tente novamente e verifique o terminal do servidor.'
      });
  }
  if (erro.type === 'entity.parse.failed')
    return res.status(400).json({ erro: 'Os dados enviados não são válidos.' });
  res
    .status(erro.status || 400)
    .json({ erro: erro.message || 'Não foi possível concluir a operação.' });
});

const porta = Number(process.env.PORT || 3002);
const servidor = app.listen(porta, '127.0.0.1', () =>
  console.log(`WellPro: http://localhost:${porta}`)
);
servidor.on('error', (erro) => {
  console.error(
    erro.code === 'EADDRINUSE'
      ? 'Porta ocupada. Pare o outro servidor ou altere PORT.'
      : 'Não foi possível iniciar: ' + erro.message
  );
  process.exitCode = 1;
});
