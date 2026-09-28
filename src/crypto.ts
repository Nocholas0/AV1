import * as crypto from "crypto";

export function gerarChave(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function criptografar(texto: string, chave: string): string {
  const iv = crypto.randomBytes(16);
  const cifra = crypto.createCipheriv("aes-256-cbc", Buffer.from(chave, "hex"), iv);
  const resultado = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return iv.toString("hex") + ":" + resultado.toString("hex");
}

export function descriptografar(texto: string, chave: string): string {
  const [ivHex, dadosHex] = texto.split(":");
  const decifra = crypto.createDecipheriv("aes-256-cbc", Buffer.from(chave, "hex"), Buffer.from(ivHex, "hex"));
  const resultado = Buffer.concat([decifra.update(Buffer.from(dadosHex, "hex")), decifra.final()]);
  return resultado.toString("utf8");
}

export function gerarSal(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function hashSenha(senha: string, sal: string): string {
  return crypto.createHash("sha256").update(senha + sal).digest("hex");
}
