import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { gerarChave, gerarSal, hashSenha } from "./crypto";
import { cnpjValido, dataDeEntradaValida } from "./validacoes";
import { Usuario, criarUsuario, Permissao } from "./usuarios";
import { PASTA_DADOS, lerLista, escreverLista, registrarNoJournal } from "./armazenamento";

interface Organizacao {
  codigo: string;
  cnpj: string;
  razaoSocial: string;
}

interface Lote {
  codigo: string;
  codigoOrganizacao: string;
  notaFiscal: string;
  transportadora: string;
  dataEntrada: string;
}

interface Equipamento {
  codigo: string;
  codigoLote: string;
  descricao: string;
  status: string;
  estadoFisico: string;
}

interface Movimentacao {
  data: string;
  codigoEquipamento: string;
  usuario: string;
  statusAnterior: string;
  statusNovo: string;
}

const ORDEM_ESTADOS = ["novo", "bom", "regular", "ruim", "inservivel"];

const CAMINHO_CONFIG = path.join(PASTA_DADOS, "config.json");
const CAMINHO_HISTORICO = path.join(PASTA_DADOS, "historico.txt");

function pergunta(rl: readline.Interface, texto: string): Promise<string> {
  return new Promise((resolve) => rl.question(texto, resolve));
}

async function principal() {
  if (!fs.existsSync(CAMINHO_CONFIG)) {
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
    const chave = gerarChave();
    fs.writeFileSync(CAMINHO_CONFIG, JSON.stringify({ chave }), "utf8");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const nome = await pergunta(rl, "Nome do administrador: ");
    const senha = await pergunta(rl, "Senha do administrador: ");
    rl.close();

    const sal = gerarSal();
    const admin = criarUsuario("administrador", nome, hashSenha(senha, sal), sal);
    const usuarios = [admin];
    escreverLista("credenciais.dat", serializarUsuarios(usuarios), chave);

    console.log("Administrador criado. Execute de novo para fazer login.");
    return;
  }
// aura 6767676776767676767676767
  const chave = JSON.parse(fs.readFileSync(CAMINHO_CONFIG, "utf8")).chave;

  const historico = fs.existsSync(CAMINHO_HISTORICO)
    ? fs.readFileSync(CAMINHO_HISTORICO, "utf8").split("\n").filter((l) => l.trim() !== "").reverse()
    : [];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, history: historico });

  let usuarioLogado: Usuario | undefined;
  let ultimoAcesso = Date.now();

  while (!usuarioLogado) {
    const nome = await pergunta(rl, "Usuario: ");
    const senha = await pergunta(rl, "Senha: ");
    const usuarios = carregarUsuarios(chave);
    const encontrado = usuarios.find((u) => u.nome === nome);
    if (encontrado && hashSenha(senha, encontrado.sal) === encontrado.hash) {
      usuarioLogado = encontrado;
      ultimoAcesso = Date.now();
    } else {
      console.log("Usuario ou senha invalidos.");
    }
  }

  console.log("Login realizado.");
  mostrarMenu(usuarioLogado);

  let continuar = true;
  while (continuar) {
    const linha = await pergunta(rl, "\ngreencode> ");
    if (linha.trim() === "") continue;
    fs.appendFileSync(CAMINHO_HISTORICO, linha + "\n", "utf8");

    if (linha.trim() === "sair") break;

    const minutosParados = (Date.now() - ultimoAcesso) / (1000 * 60);
    if (minutosParados > 30) {
      console.log("Sessao expirada por inatividade.");
      break;
    }
    ultimoAcesso = Date.now();

    const partes = linha.trim().split(/\s+/);
    const entidade = partes[0];
    const acao = partes[1];
    const opcoes: Record<string, string> = {};
    for (let i = 2; i < partes.length; i++) {
      if (partes[i].startsWith("--")) {
        opcoes[partes[i].substring(2)] = partes[i + 1] ?? "";
        i++;
      }
    }

    try {
      if (entidade === "usuario" && acao === "criar") {
        if (!usuarioLogado.temPermissao("gerenciar_contas")) {
          console.log("Sem permissao.");
        } else {
          const sal = gerarSal();
          const novo = criarUsuario(opcoes.papel, opcoes.nome, hashSenha(opcoes.senha, sal), sal);
          const usuarios = carregarUsuarios(chave);
          usuarios.push(novo);
          escreverLista("credenciais.dat", serializarUsuarios(usuarios), chave);
          registrarNoJournal(chave, "usuario criar " + opcoes.nome);
          console.log("Usuario criado.");
        }
      } else if (entidade === "org" && acao === "criar") {
        if (!usuarioLogado.temPermissao("cadastrar_organizacao")) {
          console.log("Sem permissao.");
        } else if (!cnpjValido(opcoes.cnpj)) {
          console.log("CNPJ invalido.");
        } else {
          const orgs = lerLista<Organizacao>("organizacoes.dat", chave);
          orgs.push({ codigo: opcoes.codigo, cnpj: opcoes.cnpj, razaoSocial: opcoes.razao });
          escreverLista("organizacoes.dat", orgs, chave);
          registrarNoJournal(chave, "org criar " + opcoes.codigo);
          console.log("Organizacao cadastrada.");
        }
      } else if (entidade === "lote" && acao === "criar") {
        if (!usuarioLogado.temPermissao("registrar_lote")) {
          console.log("Sem permissao.");
        } else if (!dataDeEntradaValida(new Date())) {
          console.log("Data de entrada invalida.");
        } else {
          const lotes = lerLista<Lote>("lotes.dat", chave);
          const codigo = "LOTE-" + Date.now();
          lotes.push({
            codigo,
            codigoOrganizacao: opcoes.org,
            notaFiscal: opcoes.nf,
            transportadora: opcoes.transp,
            dataEntrada: new Date().toISOString(),
          });
          escreverLista("lotes.dat", lotes, chave);
          registrarNoJournal(chave, "lote criar " + codigo);
          console.log("Lote criado: " + codigo);
        }
      } else if (entidade === "equipamento" && acao === "cadastrar") {
        if (!usuarioLogado.temPermissao("registrar_lote")) {
          console.log("Sem permissao.");
        } else {
          const equipamentos = lerLista<Equipamento>("equipamentos.dat", chave);
          const codigo = "EQ-" + Date.now();
          equipamentos.push({
            codigo,
            codigoLote: opcoes.lote,
            descricao: opcoes.descricao ?? "",
            status: "recebido",
            estadoFisico: "novo",
          });
          escreverLista("equipamentos.dat", equipamentos, chave);
          console.log("Equipamento cadastrado: " + codigo);
        }
      } else if (entidade === "equipamento" && acao === "triar") {
        if (!usuarioLogado.temPermissao("triar_equipamento")) {
          console.log("Sem permissao.");
        } else {
          const equipamentos = lerLista<Equipamento>("equipamentos.dat", chave);
          const equipamento = equipamentos.find((e) => e.codigo === opcoes.codigo);
          if (!equipamento) {
            console.log("Equipamento nao encontrado.");
          } else {
            const posicaoAntes = ORDEM_ESTADOS.indexOf(equipamento.estadoFisico);
            const posicaoDepois = ORDEM_ESTADOS.indexOf(opcoes.estado);
            if (posicaoDepois - posicaoAntes >= 2 && !opcoes.justificativa) {
              console.log("Precisa de justificativa para essa queda de estado.");
            } else {
              equipamento.estadoFisico = opcoes.estado;
              equipamento.status = "triagem_completa";
              escreverLista("equipamentos.dat", equipamentos, chave);
              registrarMovimentacao(chave, opcoes.codigo, usuarioLogado.nome, "recebido", "triagem_completa");
              console.log("Equipamento triado.");
            }
          }
        }
      } else if (entidade === "equipamento" && acao === "desmontar") {
        if (!usuarioLogado.temPermissao("registrar_lote")) {
          console.log("Sem permissao.");
        } else {
          const equipamentos = lerLista<Equipamento>("equipamentos.dat", chave);
          const equipamento = equipamentos.find((e) => e.codigo === opcoes.codigo);
          if (!equipamento) {
            console.log("Equipamento nao encontrado.");
          } else if (equipamento.status !== "triagem_completa") {
            console.log("Equipamento precisa passar por triagem antes do desmonte.");
          } else {
            equipamento.status = "desmonte";
            escreverLista("equipamentos.dat", equipamentos, chave);
            registrarMovimentacao(chave, opcoes.codigo, usuarioLogado.nome, "triagem_completa", "desmonte");
            console.log("Equipamento movido para desmonte.");
          }
        }
      } else if (entidade === "equipamento" && acao === "historico") {
        if (!usuarioLogado.temPermissao("consultar_historico")) {
          console.log("Sem permissao.");
        } else {
          const movimentacoes = lerLista<Movimentacao>("movimentacoes.dat", chave)
            .filter((m) => m.codigoEquipamento === opcoes.codigo);
          movimentacoes.forEach((m) =>
            console.log(m.data + " " + m.statusAnterior + " -> " + m.statusNovo + " por " + m.usuario)
          );
        }
      } else if (entidade === "relatorio" && acao === "gerar") {
        if (!usuarioLogado.temPermissao("gerar_relatorio")) {
          console.log("Sem permissao.");
        } else {
          const equipamentos = lerLista<Equipamento>("equipamentos.dat", chave);
          const totais: Record<string, number> = {};
          equipamentos.forEach((e) => (totais[e.status] = (totais[e.status] ?? 0) + 1));
          Object.entries(totais).forEach(([status, total]) => console.log(status + ": " + total));
        }
      } else {
        console.log("Comando nao reconhecido.");
      }
    } catch (erro) {
      console.log("Erro: " + (erro as Error).message);
    }
  }

  rl.close();
}

function registrarMovimentacao(chave: string, codigoEquipamento: string, usuario: string, statusAnterior: string, statusNovo: string) {
  const movimentacoes = lerLista<Movimentacao>("movimentacoes.dat", chave);
  movimentacoes.push({ data: new Date().toISOString(), codigoEquipamento, usuario, statusAnterior, statusNovo });
  escreverLista("movimentacoes.dat", movimentacoes, chave);
}

function serializarUsuarios(usuarios: Usuario[]) {
  return usuarios.map((u) => ({ nome: u.nome, papel: u.papel, hash: u.hash, sal: u.sal }));
}

function carregarUsuarios(chave: string): Usuario[] {
  const salvos = lerLista<{ nome: string; papel: string; hash: string; sal: string }>("credenciais.dat", chave);
  return salvos.map((u) => criarUsuario(u.papel, u.nome, u.hash, u.sal));
}

function mostrarMenu(usuario: Usuario) {
  console.log("Usuario: " + usuario.nome + " | Papel: " + usuario.papel);
  const opcoes: { permissao: Permissao; texto: string }[] = [
    { permissao: "gerenciar_contas", texto: "usuario criar --nome <nome> --senha <senha> --papel <papel>" },
    { permissao: "cadastrar_organizacao", texto: "org criar --codigo <codigo> --cnpj <cnpj> --razao <razao>" },
    { permissao: "registrar_lote", texto: "lote criar --org <codigo> --nf <nota> --transp <transportadora>" },
    { permissao: "registrar_lote", texto: "equipamento cadastrar --lote <codigo> --descricao <texto>" },
    { permissao: "triar_equipamento", texto: "equipamento triar --codigo <codigo> --estado <estado> [--justificativa <texto>]" },
    { permissao: "registrar_lote", texto: "equipamento desmontar --codigo <codigo>" },
    { permissao: "consultar_historico", texto: "equipamento historico --codigo <codigo>" },
    { permissao: "gerar_relatorio", texto: "relatorio gerar" },
  ];
  opcoes.filter((o) => usuario.temPermissao(o.permissao)).forEach((o) => console.log("  " + o.texto));
  console.log("  sair");
}

principal();
