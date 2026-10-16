import { DashboardData } from './types.ts';

export const initialDashboardData: DashboardData = {
  title: 'Sistem Pemantauan Pesanan Belum Kirim & Titipan Stok PT. MBP',
  subtitle: 'Dashboard Monitoring Pengiriman & Stok © 2026 PT. MBP',
  warehouseStatus: 'Status Gudang Active',
  updatedAt: '15 Okt 2026, 15:36 WIB',
  belumKirim: {
    sectionTitle: 'BELUM KIRIM',
    sectionSubtitle: 'Daftar pesanan yang belum dikirimkan ke ekspedisi',
    groups: [
      {
        id: 'group-1',
        title: 'SHOPEE MT 12/10',
        items: [
          {
            id: 'item-1',
            name: 'Expo 770 hitam',
            orderNumber: '2610107PDQBYWE',
            courier: 'J&T',
            isWoodPacking: true,
            isDelayed: true,
          },
          {
            id: 'item-2',
            name: 'Ks 10000',
            orderNumber: '261012EESPK9JF',
            courier: 'J&T',
            isWoodPacking: false,
            isDelayed: true,
          },
        ],
      },
      {
        id: 'group-2',
        title: 'SHOPEE MT 13/10',
        items: [
          {
            id: 'item-3',
            name: 'Tf 1000sn',
            orderNumber: '261012EN9JDAMF',
            courier: 'J&T',
            isWoodPacking: true,
            isDelayed: false,
          },
        ],
      },
      {
        id: 'group-3',
        title: 'SHOPEE MT 14/10',
        items: [
          {
            id: 'item-4',
            name: 'Rtw 120l 5ch',
            orderNumber: '261013HHTMPPBT',
            courier: 'J&T',
            isWoodPacking: true,
            isDelayed: false,
          },
          {
            id: 'item-5',
            name: '102g',
            orderNumber: '261014JSY25EDE',
            courier: 'J&T',
            isWoodPacking: true,
            isDelayed: false,
          },
          {
            id: 'item-6',
            name: 'Ysn st6 & gm dz 400',
            orderNumber: '261014JUQP24F0',
            courier: 'J&T',
            isWoodPacking: false,
            isDelayed: false,
          },
          {
            id: 'item-7',
            name: 'Cf 310',
            orderNumber: '261014JYMXDMHD',
            courier: 'JNE',
            isWoodPacking: false,
            isDelayed: false,
          },
          {
            id: 'item-8',
            name: 'Cf 460',
            orderNumber: '261014K9K0YS7W',
            courier: 'JNE',
            isWoodPacking: true,
            isDelayed: false,
          },
        ],
      },
      {
        id: 'group-4',
        title: 'SHOPEE TANGSEL 14/10',
        items: [
          {
            id: 'item-9',
            name: '12ssgce',
            orderNumber: '261014JQS4SR3Y',
            courier: 'JNE',
            isWoodPacking: true,
            isDelayed: false,
          },
        ],
      },
    ],
  },
  stokTitipan: {
    sectionTitle: 'STOK TANGERANG TITIP DI PT. MBP',
    sectionSubtitle: 'Inventaris fisik barang yang saat ini tersedia di gudang PT. MBP',
    items: [
      {
        id: 'stock-1',
        name: 'Gm dh3p',
        quantity: 1,
        notes: '🛠️ Perlu di perbaiki',
      },
      {
        id: 'stock-2',
        name: 'Wk 120',
        quantity: 2,
        notes: '-',
      },
      {
        id: 'stock-3',
        name: 'Wk 150',
        quantity: 1,
        notes: '-',
      },
      {
        id: 'stock-4',
        name: 'Xs 110',
        quantity: 1,
        notes: '-',
      },
      {
        id: 'stock-5',
        name: 'Loyang 3cm gomesin',
        quantity: 91,
        notes: '-',
      },
      {
        id: 'stock-6',
        name: 'Loyang 3cm chefprimax',
        quantity: 16,
        notes: '🔥 Utamakan habiskan ini',
      },
      {
        id: 'stock-7',
        name: 'De 08a',
        quantity: 1,
        notes: '-',
      },
      {
        id: 'stock-8',
        name: 'Ruby 200',
        quantity: 2,
        notes: '-',
      },
      {
        id: 'stock-9',
        name: 'Ruby 240',
        quantity: 1,
        notes: '-',
      },
      {
        id: 'stock-10',
        name: 'Gsp 650',
        quantity: 1,
        notes: '-',
      },
      {
        id: 'stock-11',
        name: 'Ab 108',
        quantity: 3,
        notes: '💳 13/10 mbg belum bayar 1 unit',
      },
    ],
  },
};
