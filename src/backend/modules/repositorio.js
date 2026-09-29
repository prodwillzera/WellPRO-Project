import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const arquivo=process.env.WELLPRO_DB||fileURLToPath(new URL('../../../database/wellpro.db',import.meta.url));
const jsonAntigo=process.env.WELLPRO_JSON||fileURLToPath(new URL('../../../data/usuarios.json',import.meta.url));
const schema=fs.readFileSync(fileURLToPath(new URL('../../../database/schema.sql',import.meta.url)),'utf8');
fs.mkdirSync(path.dirname(arquivo),{recursive:true});
if(fs.existsSync(arquivo)&&!fs.existsSync(arquivo+'.antes-1.3.11.bak'))fs.copyFileSync(arquivo,arquivo+'.antes-1.3.11.bak');
const db=new DatabaseSync(arquivo);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
// Upgrade não destrutivo da estrutura recebida em 1.3.2.
const tabela=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chaves'").get();
if(tabela&&!tabela.sql.includes("'outro'")){
  db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
  try{
    const criacao=schema.match(/CREATE TABLE IF NOT EXISTS chaves \([\s\S]*?\);/)[0].replace('IF NOT EXISTS chaves','chaves_nova');
    db.exec(criacao);
    db.exec('INSERT INTO chaves_nova (id,identificacao,finalidade,localizacao,status,ativo,observacoes,criado_em) SELECT id,identificacao,finalidade,localizacao,status,ativo,observacoes,criado_em FROM chaves; DROP TABLE chaves; ALTER TABLE chaves_nova RENAME TO chaves;');
    if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Referências inválidas na migração.');
    db.exec('COMMIT;');
  }catch(e){db.exec('ROLLBACK;');throw e;}finally{db.exec('PRAGMA foreign_keys=ON;');}
}
db.exec(schema);
const colunas=db.prepare('PRAGMA table_info(movimentacoes)').all().map(c=>c.name);
for(const nome of ['identificacao_responsavel','observacao_devolucao'])if(!colunas.includes(nome))db.exec(`ALTER TABLE movimentacoes ADD COLUMN ${nome} TEXT`);
const finalidades={sala:'Sala',laboratorio:'Laboratório',armario:'Armário',outro:'Outro'};
const inverso=Object.fromEntries(Object.entries(finalidades).map(([k,v])=>[v,k]));
export function lerEstado(){
  const usuarios=db.prepare('SELECT * FROM usuarios ORDER BY id').all().map(u=>({...u,ativo:!!u.ativo}));
  const movimentacoes=db.prepare('SELECT * FROM movimentacoes ORDER BY id').all().map(m=>({id:m.id,chave_id:m.chave_id,responsavel:m.responsavel_nome,identificacao:m.identificacao_responsavel||'',observacao:m.observacoes||'',observacao_devolucao:m.observacao_devolucao||'',retirada_em:m.retirada_em,devolucao_em:m.devolucao_em,usuario_retirada_id:m.usuario_retirada_id,usuario_devolucao_id:m.usuario_devolucao_id}));
  const chaves=db.prepare('SELECT * FROM chaves WHERE ativo=1 ORDER BY id').all().map(c=>({id:c.id,identificacao:c.identificacao,descricao:c.descricao||'',finalidade:finalidades[c.finalidade],localizacao:c.localizacao||'',status:c.status,responsavel:movimentacoes.find(m=>m.chave_id===c.id&&!m.devolucao_em)?.responsavel||'',criado_em:c.criado_em}));
  return {usuarios,chaves,movimentacoes};
}
export function gravarEstado(e){
  db.exec('BEGIN IMMEDIATE;');
  try{
    const usuario=db.prepare('INSERT INTO usuarios(id,nome,login,senha_hash,perfil,ativo,criado_em) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nome=excluded.nome,login=excluded.login,senha_hash=excluded.senha_hash,perfil=excluded.perfil,ativo=excluded.ativo');
    e.usuarios.forEach(u=>usuario.run(u.id,u.nome,u.login,u.senha_hash,u.perfil,Number(u.ativo),u.criado_em));
    const chave=db.prepare('INSERT INTO chaves(id,identificacao,descricao,finalidade,localizacao,status,criado_em) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET identificacao=excluded.identificacao,descricao=excluded.descricao,finalidade=excluded.finalidade,localizacao=excluded.localizacao,status=excluded.status');
    e.chaves.forEach(c=>chave.run(c.id,c.identificacao,c.descricao||'',inverso[c.finalidade],c.localizacao,c.status,c.criado_em||new Date().toISOString()));
    const mov=db.prepare('INSERT INTO movimentacoes(id,chave_id,responsavel_nome,identificacao_responsavel,observacoes,observacao_devolucao,retirada_em,devolucao_em,usuario_retirada_id,usuario_devolucao_id) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET devolucao_em=excluded.devolucao_em,usuario_devolucao_id=excluded.usuario_devolucao_id,observacao_devolucao=excluded.observacao_devolucao');
    e.movimentacoes.forEach(m=>mov.run(m.id,m.chave_id,m.responsavel,m.identificacao||'',m.observacao||'',m.observacao_devolucao||'',m.retirada_em,m.devolucao_em,m.usuario_retirada_id,m.usuario_devolucao_id));
    db.exec('COMMIT;');
  }catch(erro){db.exec('ROLLBACK;');throw erro;}
}
// Migra a etapa 1.3.10 uma única vez, mantendo o JSON original como cópia.
if(!db.prepare("SELECT valor FROM configuracoes WHERE chave='transicao_json'").get()){
  const quantidade=['usuarios','chaves','movimentacoes'].reduce((n,t)=>n+db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n,0);
  if(fs.existsSync(jsonAntigo)&&quantidade===0){
    const e=JSON.parse(fs.readFileSync(jsonAntigo,'utf8'));
    gravarEstado({usuarios:e.usuarios||[],chaves:e.chaves||[],movimentacoes:e.movimentacoes||[]});
    console.log('Dados da etapa JSON migrados para SQLite. JSON preservado.');
  }else if(fs.existsSync(jsonAntigo)&&quantidade>0){console.log('SQLite já contém dados: JSON não foi importado para evitar sobrescrita.');}
  db.prepare("INSERT INTO configuracoes(chave,valor) VALUES('transicao_json','concluida')").run();
}
if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Banco contém referências inválidas. Restaure o backup antes de continuar.');
