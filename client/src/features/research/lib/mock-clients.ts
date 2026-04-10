import { ClientAccount, Recipient } from "./types";

export const mockClientAccounts: ClientAccount[] = [
  { _key: "client-001", account_name: "Sarah Thompson Family" },
  { _key: "client-002", account_name: "James Carter Household" },
  { _key: "client-003", account_name: "Amelia Grant Office" },
  { _key: "client-004", account_name: "Harrington Family Account" },
];

export const mockRecipients: Recipient[] = [
  { _key: "recipient-001", name: "Sarah Thompson", client_account_key: "client-001" },
  { _key: "recipient-002", name: "Tom Thompson", client_account_key: "client-001" },
  { _key: "recipient-003", name: "James Carter", client_account_key: "client-002" },
  { _key: "recipient-004", name: "Olivia Carter", client_account_key: "client-002" },
  { _key: "recipient-005", name: "Amelia Grant", client_account_key: "client-003" },
  { _key: "recipient-006", name: "Henry Harrington", client_account_key: "client-004" },
];
