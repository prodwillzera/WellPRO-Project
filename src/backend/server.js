import express from 'express';
import { fileURLToPath } from 'node:url';
import { lerEstado, gravarEstado } from './modules/repositorio.js';
import { salvarUsuario, publico, verificarSenha } from './modules/usuarios.js';
import * as sessoes from './config/sessoes.js';
import { cadastrar, retirar, devolver, perder } from './modules/chaves.js';
const app=express();
app.use(express.json({limit:'2mb'}));
app.use('/api',(req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method)) {
    if(req.get('X-WellPro')!=='1')return res.status(403).json({erro:'Requisição inválida.'});
    if(req.get('origin')&&req.get('origin')!==`${req.protocol}://${req.get('host')}`)return res.status(403).json({erro:'Origem não permitida.'});
  }next();
});
app.post('/api/login',(req,res)=>{
  const e=lerEstado();const u=e.usuarios.find(u=>u.ativo&&u.login.toLowerCase()===String(req.body.login||'').trim().toLowerCase());
  if(!u||!verificarSenha(req.body.senha,u.senha_hash))return res.status(401).json({erro:'Login ou senha inválidos.'});
  sessoes.criar(res,u);res.json(publico(u));
});
app.use('/api',(req,res,next)=>{const u=sessoes.atual(req,lerEstado());if(!u)return res.status(401).json({erro:'Entre na sua conta.'});req.usuario=u;next();});
app.get('/api/sessao',(req,res)=>res.json(publico(req.usuario)));
app.post('/api/logout',(req,res)=>{sessoes.sair(req,res);res.json({ok:true});});
function admin(req,res,next){if(req.usuario.perfil!=='administrador')return res.status(403).json({erro:'Acesso de administrador necessário.'});next();}
app.get('/api/usuarios',admin,(req,res)=>res.json(lerEstado().usuarios.map(publico)));
app.post('/api/usuarios',admin,(req,res,next)=>{try{const e=lerEstado();const u=salvarUsuario(e,req.body);gravarEstado(e);res.status(201).json(u);}catch(e){next(e);}});
app.put('/api/usuarios/:id',admin,(req,res,next)=>{try{const e=lerEstado();const id=Number(req.params.id);const u=salvarUsuario(e,req.body,id);gravarEstado(e);sessoes.invalidar(id);res.json(u);}catch(e){next(e);}});
app.get('/api/chaves',(req,res)=>res.json(lerEstado().chaves));
app.get('/api/movimentacoes',(req,res)=>res.json(lerEstado().movimentacoes));
function alterar(fn){return (req,res,next)=>{try{const e=lerEstado();const resultado=fn(e,req);gravarEstado(e);res.json(resultado||{ok:true});}catch(e){next(e);}};}
app.post('/api/chaves',admin,alterar((e,r)=>cadastrar(e,r.body)));
app.post('/api/retiradas',alterar((e,r)=>retirar(e,r.body,r.usuario)));
app.post('/api/devolucoes',alterar((e,r)=>devolver(e,r.body,r.usuario)));
app.post('/api/chaves/:id/perda',alterar((e,r)=>perder(e,r.params.id)));
app.use('/api',(req,res)=>res.status(404).json({erro:'Rota inexistente.'}));
app.get('/',(req,res)=>res.redirect('/pages/index.html'));
app.use('/pages',(req,res,next)=>{
  if(req.path==='/index.html')return next();
  const u=sessoes.atual(req,lerEstado());if(!u)return res.redirect('/pages/index.html');
  if(['/usuarios.html','/cadastro.html'].includes(req.path)&&u.perfil!=='administrador')return res.status(403).send('Acesso restrito ao administrador.');next();
});
app.use(express.static(fileURLToPath(new URL('../frontend/',import.meta.url)),{index:false}));
app.use((erro,req,res,next)=>res.status(400).json({erro:erro.message}));
app.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('WellPro em http://localhost:'+(process.env.PORT||3000)));
