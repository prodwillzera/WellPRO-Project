import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const arquivo = process.env.WELLPRO_JSON || fileURLToPath(new URL('../../../data/usuarios.json',import.meta.url));
export function lerEstado() {
  return fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo,'utf8')) : {usuarios:[]};
}
export function gravarEstado(estado) {
  fs.mkdirSync(path.dirname(arquivo),{recursive:true});
  fs.writeFileSync(arquivo+'.tmp',JSON.stringify(estado,null,2)); fs.renameSync(arquivo+'.tmp',arquivo);
}
