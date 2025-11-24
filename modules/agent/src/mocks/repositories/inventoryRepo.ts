import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data');

export interface StockItem {
  sku: string;
  product_name: string;
  location: string;
  qty_on_hand: number;
  qty_reserved: number;
  reorder_point: number;
  last_movement: string;
}

export interface Location {
  id: string;
  name: string;
  type: string;
}

let stock: StockItem[] = [];
let locations: Location[] = [];

const loadData = (): void => {
  if (stock.length > 0) return;

  const data = JSON.parse(readFileSync(join(DATA_PATH, 'inventory.json'), 'utf-8'));
  stock = data.stock;
  locations = data.locations;
};

export const getAllStock = (): StockItem[] => {
  loadData();
  return stock;
};

export const findStockBySku = (sku: string): StockItem[] => {
  loadData();
  return stock.filter((s) => s.sku === sku);
};

export const findStockByLocation = (location: string): StockItem[] => {
  loadData();
  return stock.filter((s) => s.location === location);
};

export const findStockItem = (sku: string, location: string): StockItem | undefined => {
  loadData();
  return stock.find((s) => s.sku === sku && s.location === location);
};

export const updateStockItem = (
  sku: string,
  location: string,
  updates: Partial<StockItem>
): StockItem | undefined => {
  loadData();
  const item = findStockItem(sku, location);
  if (!item) return undefined;

  Object.assign(item, updates);
  return item;
};

export const appendStockItem = (item: StockItem): StockItem => {
  loadData();
  stock.push(item);
  return item;
};

export const getAllLocations = (): Location[] => {
  loadData();
  return locations;
};
