export function cnpjValido(entrada: string): boolean {
  const cnpj = entrada.replace(/[^\d]/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  function calcularDigito(base: string, pesos: number[]): number {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) {
      soma += Number(base[i]) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const d1 = calcularDigito(cnpj.substring(0, 12), pesos1);
  if (d1 !== Number(cnpj[12])) return false;

  const d2 = calcularDigito(cnpj.substring(0, 13), pesos2);
  if (d2 !== Number(cnpj[13])) return false;

  return true;
}

export function dataDeEntradaValida(data: Date): boolean {
  const agora = Date.now();
  const noventaDias = 90 * 24 * 60 * 60 * 1000;
  return data.getTime() <= agora && agora - data.getTime() <= noventaDias;
}
