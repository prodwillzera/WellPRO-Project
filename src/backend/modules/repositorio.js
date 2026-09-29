import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const arquivo =
  process.env.WELLPRO_DB || fileURLToPath(new URL('../../../database/wellpro.db', import.meta.url));
const schema = fs.readFileSync(
  fileURLToPath(new URL('../../../database/schema.sql', import.meta.url)),
  'utf8'
);
fs.mkdirSync(path.dirname(arquivo), { recursive: true });
if (fs.existsSync(arquivo) && !fs.existsSync(arquivo + '.antes-finalizacao.bak'))
  fs.copyFileSync(arquivo, arquivo + '.antes-finalizacao.bak');
const db = new DatabaseSync(arquivo);
db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
// Upgrade não destrutivo da estrutura recebida em 1.3.2.
const tabela = db
  .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chaves'")
  .get();
if (tabela && !tabela.sql.includes("'outro'")) {
  db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
  try {
    const criacao = schema
      .match(/CREATE TABLE IF NOT EXISTS chaves \([\s\S]*?\);/)[0]
      .replace('IF NOT EXISTS chaves', 'chaves_nova');
    db.exec(criacao);
    db.exec(
      'INSERT INTO chaves_nova (id,identificacao,finalidade,localizacao,status,ativo,observacoes,criado_em) SELECT id,identificacao,finalidade,localizacao,status,ativo,observacoes,criado_em FROM chaves; DROP TABLE chaves; ALTER TABLE chaves_nova RENAME TO chaves;'
    );
    if (db.prepare('PRAGMA foreign_key_check').all().length)
      throw new Error('Referências inválidas na migração.');
    db.exec('COMMIT;');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  } finally {
    db.exec('PRAGMA foreign_keys=ON;');
  }
}
db.exec(schema);
const colunas = db
  .prepare('PRAGMA table_info(movimentacoes)')
  .all()
  .map((c) => c.name);
for (const nome of ['identificacao_responsavel', 'observacao_devolucao'])
  if (!colunas.includes(nome)) db.exec(`ALTER TABLE movimentacoes ADD COLUMN ${nome} TEXT`);
const finalidades = {
  sala: 'Sala',
  laboratorio: 'Laboratório',
  armario: 'Armário',
  outro: 'Outro'
};
const inverso = Object.fromEntries(Object.entries(finalidades).map(([k, v]) => [v, k]));
function utc(data) {
  return data && !data.includes('T') ? data.replace(' ', 'T') + 'Z' : data;
}
export function lerEstado() {
  const usuarios = db
    .prepare('SELECT * FROM usuarios ORDER BY id')
    .all()
    .map((u) => ({ ...u, ativo: !!u.ativo }));
  const movimentacoes = db
    .prepare('SELECT * FROM movimentacoes ORDER BY id')
    .all()
    .map((m) => ({
      id: m.id,
      chave_id: m.chave_id,
      responsavel: m.responsavel_nome,
      identificacao: m.identificacao_responsavel || '',
      observacao: m.observacoes || '',
      observacao_devolucao: m.observacao_devolucao || '',
      retirada_em: utc(m.retirada_em),
      devolucao_em: utc(m.devolucao_em),
      usuario_retirada_id: m.usuario_retirada_id,
      usuario_devolucao_id: m.usuario_devolucao_id
    }));
  const chaves = db
    .prepare('SELECT * FROM chaves ORDER BY id')
    .all()
    .map((c) => ({
      id: c.id,
      ativo: !!c.ativo,
      identificacao: c.identificacao,
      descricao: c.descricao || '',
      finalidade: finalidades[c.finalidade],
      localizacao: c.localizacao || '',
      status: c.status,
      responsavel:
        movimentacoes.find((m) => m.chave_id === c.id && !m.devolucao_em)?.responsavel || '',
      criado_em: c.criado_em
    }));
  const eventos = db.prepare('SELECT * FROM eventos ORDER BY id').all().map(evento => ({...evento, ocorrido_em: utc(evento.ocorrido_em)}));
  const organizacao = { nome: 'Sua organização', unidade: 'Gestão de ambientes', imagem: '' };
  for (const campo of Object.keys(organizacao)) {
    const item = db
      .prepare('SELECT valor FROM configuracoes WHERE chave=?')
      .get('organizacao.' + campo);
    if (item) organizacao[campo] = item.valor;
  }
  return { usuarios, chaves, movimentacoes, eventos, organizacao };
}
function gravarEstado(e) {
  try {
    const usuario = db.prepare(
      'INSERT INTO usuarios(id,nome,login,senha_hash,perfil,ativo,criado_em) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nome=excluded.nome,login=excluded.login,senha_hash=excluded.senha_hash,perfil=excluded.perfil,ativo=excluded.ativo'
    );
    e.usuarios.forEach((u) =>
      usuario.run(u.id, u.nome, u.login, u.senha_hash, u.perfil, Number(u.ativo), u.criado_em)
    );
    const chave = db.prepare(
      'INSERT INTO chaves(id,identificacao,descricao,finalidade,localizacao,status,criado_em) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET identificacao=excluded.identificacao,descricao=excluded.descricao,finalidade=excluded.finalidade,localizacao=excluded.localizacao,status=excluded.status'
    );
    e.chaves.forEach((c) =>
      chave.run(
        c.id,
        c.identificacao,
        c.descricao || '',
        inverso[c.finalidade],
        c.localizacao,
        c.status,
        c.criado_em || new Date().toISOString()
      )
    );
    const mov = db.prepare(
      'INSERT INTO movimentacoes(id,chave_id,responsavel_nome,identificacao_responsavel,observacoes,observacao_devolucao,retirada_em,devolucao_em,usuario_retirada_id,usuario_devolucao_id) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET devolucao_em=excluded.devolucao_em,usuario_devolucao_id=excluded.usuario_devolucao_id,observacao_devolucao=excluded.observacao_devolucao'
    );
    e.movimentacoes.forEach((m) =>
      mov.run(
        m.id,
        m.chave_id,
        m.responsavel,
        m.identificacao || '',
        m.observacao || '',
        m.observacao_devolucao || '',
        m.retirada_em,
        m.devolucao_em,
        m.usuario_retirada_id,
        m.usuario_devolucao_id
      )
    );
    const evento = db.prepare(`INSERT INTO eventos
      (id,chave_id,movimentacao_id,tipo,status,responsavel,usuario_id,operador,ocorrido_em,observacoes)
      VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`);
    for (const item of e.eventos) {
      evento.run(
        item.id,
        item.chave_id,
        item.movimentacao_id,
        item.tipo,
        item.status,
        item.responsavel,
        item.usuario_id,
        item.operador,
        item.ocorrido_em,
        item.observacoes
      );
    }
    for (const campo of ['nome', 'unidade', 'imagem']) {
      db.prepare(
        'INSERT INTO configuracoes(chave,valor) VALUES(?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor'
      ).run('organizacao.' + campo, e.organizacao[campo]);
    }
  } catch (erro) {
    throw erro;
  }
}

export function alterarEstado(operacao) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const estado = lerEstado();
    const resultado = operacao(estado);
    gravarEstado(estado);
    db.exec('COMMIT');
    return resultado;
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

// Preserve retiradas/devoluções antigas como eventos, uma única vez.
if (!db.prepare("SELECT valor FROM configuracoes WHERE chave='eventos_inicializados'").get()) {
  alterarEstado((estado) => {
    if (estado.eventos.length) return;
    function inserir(chave, movimento, tipo, status, data, usuarioId, observacoes) {
      const usuario = estado.usuarios.find((u) => u.id === usuarioId);
      estado.eventos.push({
        id: estado.eventos.length + 1,
        chave_id: chave.id,
        movimentacao_id: movimento?.id || null,
        tipo,
        status,
        responsavel: movimento?.responsavel || '',
        usuario_id: usuarioId || null,
        operador: usuario?.nome || '',
        ocorrido_em: data,
        observacoes
      });
    }
    for (const movimento of estado.movimentacoes) {
      const chave = estado.chaves.find((c) => c.id === movimento.chave_id);
      inserir(
        chave,
        movimento,
        'retirada',
        'retirada',
        movimento.retirada_em,
        movimento.usuario_retirada_id,
        movimento.observacao
      );
      if (movimento.devolucao_em)
        inserir(
          chave,
          movimento,
          'devolucao',
          'disponivel',
          movimento.devolucao_em,
          movimento.usuario_devolucao_id,
          movimento.observacao_devolucao
        );
    }
    for (const chave of estado.chaves.filter((c) => c.status === 'perdida')) {
      const movimento = estado.movimentacoes.find(
        (m) => m.chave_id === chave.id && !m.devolucao_em
      );
      inserir(
        chave,
        movimento,
        'perda',
        'perdida',
        new Date().toISOString(),
        null,
        'Perda preexistente: data original desconhecida. Este horário registra a migração.'
      );
    }
  });
  db.prepare("INSERT INTO configuracoes(chave,valor) VALUES('eventos_inicializados','1')").run();
}
if (db.prepare('PRAGMA foreign_key_check').all().length) {
  throw new Error('Banco com referências inválidas. Verifique a cópia de segurança.');
}
