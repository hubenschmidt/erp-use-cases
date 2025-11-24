import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data');

interface Product {
  sku: string;
  name: string;
  unit_cost: number;
}

let products: Map<string, Product> | null = null;

const loadData = (): void => {
  if (products) return;

  const data = JSON.parse(readFileSync(join(DATA_PATH, 'products.json'), 'utf-8'));
  products = new Map(data.products.map((p: Product) => [p.sku, p]));
};

export const getAllProducts = (): Product[] => {
  loadData();
  return Array.from(products!.values());
};

export const findProductBySku = (sku: string): Product | undefined => {
  loadData();
  return products!.get(sku);
};
