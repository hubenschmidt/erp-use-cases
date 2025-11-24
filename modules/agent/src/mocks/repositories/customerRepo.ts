import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data');

export interface Customer {
  id: string;
  name: string;
  email: string;
  shipping_address: string;
}

let customers: Map<string, Customer> | null = null;

const loadData = (): void => {
  if (customers) return;

  const data = JSON.parse(readFileSync(join(DATA_PATH, 'customers.json'), 'utf-8'));
  customers = new Map(data.customers.map((c: Customer) => [c.id, c]));
};

export const getAllCustomers = (): Customer[] => {
  loadData();
  return Array.from(customers!.values());
};

export const findCustomerById = (customerId: string): Customer | undefined => {
  loadData();
  return customers!.get(customerId);
};
