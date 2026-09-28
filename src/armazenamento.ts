import * as fs from "fs";
import * as path from "path";
import { criptografar, descriptografar } from "./crypto";

export const PASTA_DADOS = path.join(__dirname, "..", "dados");

export function lerLista<T>(nomeArquivo: string, chave: string): T[] {
  const caminho = path.join(PASTA_DADOS, nomeArquivo);
  if (!fs.existsSync(caminho)) return [];
  const conteudo = fs.readFileSync(caminho, "utf8");
  if (conteudo.trim() === "") return [];
  return JSON.parse(descriptografar(conteudo, chave));
}

export function escreverLista<T>(nomeArquivo: string, lista: T[], chave: string): void {
  if (!fs.existsSync(PASTA_DADOS)) fs.mkdirSync(PASTA_DADOS, { recursive: true });
  const caminho = path.join(PASTA_DADOS, nomeArquivo);
  const temporario = caminho + ".tmp";
  fs.writeFileSync(temporario, criptografar(JSON.stringify(lista), chave), "utf8");
  fs.renameSync(temporario, caminho);
}

export function registrarNoJournal(chave: string, texto: string): void {
  const caminho = path.join(PASTA_DADOS, "journal.log");
  if (fs.existsSync(caminho) && fs.statSync(caminho).size > 10 * 1024 * 1024) {
    const nomeAntigo = caminho.replace(".log", "." + Date.now() + ".log");
    fs.renameSync(caminho, nomeAntigo);
  }
  fs.appendFileSync(caminho, criptografar(texto, chave) + "\n", "utf8");
}
