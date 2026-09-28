export type Permissao =
  | "gerenciar_contas"
  | "cadastrar_organizacao"
  | "registrar_lote"
  | "triar_equipamento"
  | "consultar_historico"
  | "gerar_relatorio";

export abstract class Usuario {
  nome: string;
  hash: string;
  sal: string;

  constructor(nome: string, hash: string, sal: string) {
    this.nome = nome;
    this.hash = hash;
    this.sal = sal;
  }

  abstract get papel(): string;
  abstract permissoes(): Permissao[];

  temPermissao(permissao: Permissao): boolean {
    return this.permissoes().includes(permissao);
  }
}

export class Administrador extends Usuario {
  get papel() { return "administrador"; }
  permissoes(): Permissao[] {
    return ["gerenciar_contas", "consultar_historico", "gerar_relatorio"];
  }
}

export class OperadorCadastro extends Usuario {
  get papel() { return "operador_cadastro"; }
  permissoes(): Permissao[] {
    return ["cadastrar_organizacao", "consultar_historico"];
  }
}

export class GestorAlmoxarifado extends Usuario {
  get papel() { return "gestor_almoxarifado"; }
  permissoes(): Permissao[] {
    return ["registrar_lote", "triar_equipamento", "consultar_historico"];
  }
}

export class Auditor extends Usuario {
  get papel() { return "auditor"; }
  permissoes(): Permissao[] {
    return ["consultar_historico", "gerar_relatorio"];
  }
}

export function criarUsuario(papel: string, nome: string, hash: string, sal: string): Usuario {
  if (papel === "administrador") return new Administrador(nome, hash, sal);
  if (papel === "operador_cadastro") return new OperadorCadastro(nome, hash, sal);
  if (papel === "gestor_almoxarifado") return new GestorAlmoxarifado(nome, hash, sal);
  if (papel === "auditor") return new Auditor(nome, hash, sal);
  throw new Error("papel invalido: " + papel);
}
