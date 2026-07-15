import { ClientAccount } from "./types";

/** Fallback when gateway client-account search is unavailable (Add Item / local dev). */
export const mockClientAccounts: ClientAccount[] = [
  { _key: "client-001", account_name: "Sarah Thompson Family" },
  { _key: "client-002", account_name: "James Carter Household" },
  { _key: "client-003", account_name: "Amelia Grant Office" },
  { _key: "client-004", account_name: "Harrington Family Account" },
];
