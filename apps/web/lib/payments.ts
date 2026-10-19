export type BankAccount = {
  id: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  holder: string;
  taxId: string;
};

// PLACEHOLDER: replace with official accounts. These values come from the
// Stitch mock design and are NOT real; do not publish them as-is.
export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "bancolombia",
    bank: "Bancolombia",
    accountType: "Cuenta Corriente Corporativa",
    accountNumber: "824-000492-18",
    holder: "ORTHOPRO LAB S.A.S",
    taxId: "901.482.319-4",
  },
  {
    id: "davivienda",
    bank: "Davivienda",
    accountType: "Cuenta de Ahorros Empresarial",
    accountNumber: "045-882910-44",
    holder: "ORTHOPRO LAB S.A.S",
    taxId: "901.482.319-4",
  },
];
