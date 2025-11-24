import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data');

export interface SalesRecord {
  id: string;
  sku: string;
  qty_sold: number;
  sale_date: string;
  location: string;
}

let salesHistory: SalesRecord[] = [];

const loadData = (): void => {
  if (salesHistory.length > 0) return;

  const data = JSON.parse(readFileSync(join(DATA_PATH, 'salesHistory.json'), 'utf-8'));
  salesHistory = data.salesHistory;
};

export const getAllSalesHistory = (): SalesRecord[] => {
  loadData();
  return salesHistory;
};

export const findSalesBySku = (sku: string): SalesRecord[] => {
  loadData();
  return salesHistory.filter((s) => s.sku === sku);
};

export const findSalesByDateRange = (startDate: string, endDate: string): SalesRecord[] => {
  loadData();
  return salesHistory.filter((s) => s.sale_date >= startDate && s.sale_date <= endDate);
};

export const findSalesBySkuAndDateRange = (
  sku: string,
  startDate: string,
  endDate: string
): SalesRecord[] => {
  loadData();
  return salesHistory.filter(
    (s) => s.sku === sku && s.sale_date >= startDate && s.sale_date <= endDate
  );
};

export const getUniqueSKUs = (): string[] => {
  loadData();
  return [...new Set(salesHistory.map((s) => s.sku))];
};
