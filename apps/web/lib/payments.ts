export type BankAccount = {
  id: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  holder: string;
  /** Optional: hidden until the lab provides the tax id. */
  taxId?: string;
};

// Official account. Do not add others without the lab confirming them.
export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "bancolombia",
    bank: "Bancolombia",
    accountType: "Cuenta de ahorros",
    accountNumber: "00861243320",
    holder: "Flavio Alberto Paz",
  },
];
