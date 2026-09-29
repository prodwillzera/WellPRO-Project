import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const raiz = fileURLToPath(new URL('../', import.meta.url));

test('Fluxos reais no SQLite: acesso, retirada, devolução, perda e recuperação', { timeout: 30000 }, async () => {
  const pasta = await mkdtemp(path.join(tmpdir(), 'wellpro-test-'));
  const arquivo = path.join(pasta, 'teste.db');
  const porta = 3461;
  const base = `http://127.0.0.1:${porta}`;
  let servidor;
  async function iniciar() {
    servidor = spawn(process.execPath, ['src/backend/server.js'], {
      cwd: raiz,
      env: { ...process.env, PORT: String(porta), WELLPRO_DB: arquivo },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let erro = '';
    servidor.stderr.on('data', texto => erro += texto);
    await Promise.race([
      once(servidor.stdout, 'data'),
      once(servidor, 'exit').then(() => { throw new Error('Falha ao iniciar: ' + erro); })
    ]);
  }
  async function parar() {
    if (servidor && servidor.exitCode === null) {
      const terminou = once(servidor, 'exit');
      servidor.kill();
      await terminou;
    }
  }
  async function api(rota, metodo = 'GET', corpo, cookie) {
    const resposta = await fetch(base + '/api' + rota, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'X-WellPro': '1', ...(cookie ? { Cookie: cookie } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
    return { status: resposta.status, dados: await resposta.json(), cookie: resposta.headers.get('set-cookie')?.match(/wellpro_sessao=[a-f0-9]+/)?.[0] };
  }
  try {
    await iniciar();
    assert.equal((await api('/configuracao-inicial')).dados.necessario, true);
    assert.equal((await api('/configuracao-inicial', 'POST', {nome: 'Teste', login: 'admin', senha: 'curta'})).status, 400);
    const inicial = await api('/configuracao-inicial', 'POST', {nome: 'Administrador de teste', login: 'admin', senha: 'SenhaTeste123!'});
    assert.equal(inicial.status, 201);
    let admin = inicial.cookie;
    assert.equal((await api('/configuracao-inicial', 'POST', {nome: 'X', login: 'outro', senha: 'OutraSenha123'})).status, 403);
    assert.equal((await api('/login', 'POST', {login: 'admin', senha: 'errada'})).status, 401);
    assert.equal((await api('/chaves')).status, 401);
    assert.equal((await fetch(base+'/pages/painel.html', {redirect:'manual'})).status, 302);
    for (const nome of ['index','painel','chaves','cadastro','retirada','devolucao','historico','usuarios','organizacao']) {
      const resposta = await fetch(base + '/pages/' + nome + '.html', {headers:{Cookie:admin}});
      assert.equal(resposta.status, 200);
      const html = await resposta.text();
      assert.match(html, /<main/);
      if (nome !== 'index') assert.match(html, /<aside class="menu">/);
      for (const [, asset] of html.matchAll(/(?:src|href)="(\.\.\/assets\/[^\"]+)"/g)) {
        assert.equal((await fetch(new URL(asset, base+'/pages/'+nome+'.html'))).status,200);
      }
    }
    const operador = await api('/usuarios','POST',{nome:'Operador de teste',login:'operador',senha:'SenhaTeste123!',perfil:'operador',ativo:true},admin);
    assert.equal(operador.status,201);
    let op=(await api('/login','POST',{login:'operador',senha:'SenhaTeste123!'})).cookie;
    assert.equal((await api('/usuarios','GET',undefined,op)).status,403);
    assert.equal((await api('/chaves','POST',{identificacao:'negada'},op)).status,403);
    assert.equal((await api('/usuarios/1','PUT',{nome:'Teste',login:'admin',perfil:'operador',ativo:false},admin)).status,400);
    const nova=await api('/chaves','POST',{identificacao:'CH-TESTE',descricao:'Porta principal',finalidade:'Outro',localizacao:'Bloco A'},admin);
    assert.equal(nova.status,201);const id=nova.dados.id;
    assert.equal((await api('/chaves','POST',{identificacao:'ch-teste',finalidade:'Sala'},admin)).status,400);
    assert.equal((await api('/chaves','POST',{identificacao:' ',finalidade:'Sala'},admin)).status,400);
    assert.equal((await api('/retiradas','POST',{chave:999999,responsavel:'Teste'},op)).status,404);
    assert.equal((await api('/retiradas','POST',{chave:id,responsavel:' '},op)).status,400);
    const simultaneas=await Promise.all([1,2].map(()=>api('/retiradas','POST',{chave:id,responsavel:'Pessoa de teste',identificacao:'T001'},op)));
    assert.deepEqual(simultaneas.map(r=>r.status).sort(),[200,400]);
    assert.equal((await api('/devolucoes','POST',{chave:id,observacao:'Devolvida'},op)).status,200);
    assert.equal((await api('/devolucoes','POST',{chave:id},op)).status,400);
    await api('/retiradas','POST',{chave:id,responsavel:'Segunda pessoa'},op);
    assert.equal((await api('/chaves/'+id+'/perda','POST',{},op)).status,200);
    assert.equal((await api('/chaves/'+id+'/perda','POST',{},op)).status,400);
    assert.equal((await api('/retiradas','POST',{chave:id,responsavel:'Bloqueada'},op)).status,400);
    assert.equal((await api('/devolucoes','POST',{chave:id},op)).status,400);
    let chaves=(await api('/chaves','GET',undefined,op)).dados;
    assert.equal(chaves[0].status,'perdida');assert.equal(chaves[0].responsavel,'Segunda pessoa');
    assert.equal((await api('/chaves/'+id+'/encontrada','POST',{},op)).status,200);
    assert.equal((await api('/chaves/'+id+'/encontrada','POST',{},op)).status,400);
    const movimentos=(await api('/movimentacoes','GET',undefined,op)).dados;
    assert.ok(movimentos.every(m=>m.devolucao_em));
    const historico=(await api('/historico','GET',undefined,op)).dados;
    assert.deepEqual(historico.slice().reverse().map(e=>e.tipo),['retirada','devolucao','retirada','perda','encontrada']);
    assert.equal(historico.find(e=>e.tipo==='perda').status,'perdida');
    assert.equal(historico.find(e=>e.tipo==='encontrada').status,'disponivel');
    assert.equal((await api('/retiradas','POST',{chave:id,responsavel:'Terceira pessoa'},op)).status,200);
    await api('/devolucoes','POST',{chave:id},op);
    // Perda de chave sem empréstimo também deve deixar os dois eventos.
    await api('/chaves/'+id+'/perda','POST',{},op);await api('/chaves/'+id+'/encontrada','POST',{},op);
    const painel=(await api('/painel','GET',undefined,op)).dados;
    assert.equal(painel.total,1);assert.equal(painel.disponiveis,1);assert.equal(painel.perdidas,0);
    assert.equal((await api('/organizacao','PUT',{nome:'Campus teste',unidade:'Unidade teste',imagem:''},op)).status,403);
    assert.equal((await api('/organizacao','PUT',{nome:'Campus teste',unidade:'Unidade teste',imagem:''},admin)).status,200);
    assert.equal((await api('/organizacao','PUT',{nome:'Teste',imagem:'/assets/img/inexistente.png'},admin)).status,400);
    assert.equal((await api('/usuarios/'+operador.dados.id,'PUT',{nome:'Operador',login:'operador',perfil:'operador',ativo:false},admin)).status,200);
    assert.equal((await api('/chaves','GET',undefined,op)).status,401);
    assert.equal((await api('/login','POST',{login:'operador',senha:'SenhaTeste123!'})).status,401);
    assert.equal((await api('/logout','POST',{},admin)).status,200);
    assert.equal((await api('/chaves','GET',undefined,admin)).status,401);
    await parar();await iniciar();
    admin=(await api('/login','POST',{login:'admin',senha:'SenhaTeste123!'})).cookie;
    assert.equal((await api('/historico','GET',undefined,admin)).dados.length,9);
    assert.equal((await api('/organizacao','GET',undefined,admin)).dados.nome,'Campus teste');
    const db=new DatabaseSync(arquivo);
    assert.equal(db.prepare('SELECT status FROM chaves').get().status,'disponivel');
    assert.equal(db.prepare('SELECT count(*) AS n FROM eventos').get().n,9);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.notEqual(db.prepare('SELECT senha_hash FROM usuarios WHERE id=1').get().senha_hash,'SenhaTeste123!');
    db.close();
  } finally { await parar();await rm(pasta,{recursive:true,force:true}); }
});

test('Migração preserva dados do schema original e não duplica eventos', async () => {
  const pasta = await mkdtemp(path.join(tmpdir(), 'wellpro-migracao-'));
  const arquivo = path.join(pasta, 'antigo.db');
  try {
    const db = new DatabaseSync(arquivo);
    db.exec(await readFile(path.join(raiz, 'tests/fixtures/schema-antigo.sql'), 'utf8'));
    db.prepare('INSERT INTO usuarios(id,nome,login,senha_hash,perfil) VALUES(1,?,?,?,?)').run('Operador anterior','anterior','hash-anterior-preservado','administrador');
    db.prepare('INSERT INTO chaves(id,identificacao,finalidade,status) VALUES(1,?,?,?)').run('CH-ANTIGA','sala','perdida');
    db.prepare('INSERT INTO movimentacoes(id,chave_id,responsavel_nome,usuario_retirada_id,retirada_em) VALUES(1,1,?,1,?)').run('Pessoa anterior','2026-09-01 12:30:00');
    db.close();
    async function migrar() {
      const processo=spawn(process.execPath,['--input-type=module','-e',"await import('./src/backend/modules/repositorio.js')"],{cwd:raiz,env:{...process.env,WELLPRO_DB:arquivo},stdio:['ignore','pipe','pipe']});
      let erro='';processo.stderr.on('data',s=>erro+=s);const [codigo]=await once(processo,'exit');assert.equal(codigo,0,erro);
    }
    await migrar();await migrar();
    const conferir=new DatabaseSync(arquivo);
    assert.equal(conferir.prepare('SELECT senha_hash FROM usuarios').get().senha_hash,'hash-anterior-preservado');
    assert.equal(conferir.prepare('SELECT responsavel_nome FROM movimentacoes').get().responsavel_nome,'Pessoa anterior');
    assert.equal(conferir.prepare('SELECT count(*) AS n FROM eventos').get().n,2);
    assert.match(conferir.prepare("SELECT observacoes FROM eventos WHERE tipo='perda'").get().observacoes,/data original desconhecida/);
    assert.deepEqual(conferir.prepare('PRAGMA foreign_key_check').all(),[]);
    conferir.close();
  } finally { await rm(pasta,{recursive:true,force:true}); }
});
