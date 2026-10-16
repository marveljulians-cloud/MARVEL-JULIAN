export interface OrderItem {
  id: string;
  name: string;
  orderNumber: string;
  courier: string;
  isWoodPacking: boolean;
  isDelayed: boolean;
  notes?: string;
}

export interface OrderGroup {
  id: string;
  title: string;
  items: OrderItem[];
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  notes: string;
}

export interface DashboardData {
  title: string;
  subtitle: string;
  warehouseStatus: string;
  updatedAt: string;
  belumKirim: {
    sectionTitle: string;
    sectionSubtitle: string;
    groups: OrderGroup[];
  };
  stokTitipan: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: StockItem[];
  };
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  formattedTime: string;
  note: string;
  sourceType: 'image_upload' | 'manual_edit' | 'restore';
  totalOrders: number;
  totalDelayed: number;
  totalWood: number;
  totalStockUnits: number;
  data: DashboardData;
}
