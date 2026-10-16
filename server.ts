import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { initialDashboardData } from './src/initialData.ts';
import { DashboardData, HistoryEntry } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Increase payload limit for base64 images (up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Set up persistent data store directory
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DASHBOARD_FILE = path.join(DATA_DIR, 'dashboard.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Initialize data if not present
function getDashboardData(): DashboardData {
  try {
    if (fs.existsSync(DASHBOARD_FILE)) {
      const content = fs.readFileSync(DASHBOARD_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading dashboard.json, falling back to initial data:', err);
  }
  // Save initial data
  saveDashboardData(initialDashboardData);
  return initialDashboardData;
}

function saveDashboardData(data: DashboardData) {
  fs.writeFileSync(DASHBOARD_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getHistory(): HistoryEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading history.json:', err);
  }
  return [];
}

function saveHistory(history: HistoryEntry[]) {
  // Keep last 50 snapshots
  const trimmed = history.slice(0, 50);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

// Format Indonesian timestamp e.g. "15 Okt 2026, 16:14 WIB"
function formatIndonesianTimestamp(date = new Date()): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y}, ${hours}:${minutes} WIB`;
}

// Compute statistics helper
function calculateStats(data: DashboardData) {
  let totalOrders = 0;
  let totalDelayed = 0;
  let totalWood = 0;
  let totalStockUnits = 0;

  for (const group of data.belumKirim.groups) {
    for (const item of group.items) {
      totalOrders++;
      if (item.isDelayed) totalDelayed++;
      if (item.isWoodPacking) totalWood++;
    }
  }

  for (const stock of data.stokTitipan.items) {
    totalStockUnits += Number(stock.quantity) || 0;
  }

  return { totalOrders, totalDelayed, totalWood, totalStockUnits };
}

// Initialize default history entry if empty
if (!fs.existsSync(HISTORY_FILE)) {
  const initial = getDashboardData();
  const stats = calculateStats(initial);
  const now = new Date();
  const initialHistory: HistoryEntry[] = [
    {
      id: 'init-1',
      timestamp: now.toISOString(),
      formattedTime: formatIndonesianTimestamp(now),
      note: 'Data Awal Sistem (14-15 Oktober 2026)',
      sourceType: 'manual_edit',
      ...stats,
      data: initial,
    },
  ];
  saveHistory(initialHistory);
}

// Initialize Gemini client on server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API Routes
app.get('/api/data', (_req, res) => {
  const data = getDashboardData();
  res.json(data);
});

app.post('/api/save', (req, res) => {
  try {
    const { data, note, sourceType = 'manual_edit' } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const now = new Date();
    const updatedData: DashboardData = {
      ...data,
      updatedAt: formatIndonesianTimestamp(now),
    };

    saveDashboardData(updatedData);

    // Record into history
    const stats = calculateStats(updatedData);
    const history = getHistory();
    const newEntry: HistoryEntry = {
      id: 'hist-' + Date.now(),
      timestamp: now.toISOString(),
      formattedTime: formatIndonesianTimestamp(now),
      note: note || (sourceType === 'image_upload' ? 'Upload Foto / Screenshot WhatsApp' : 'Pembaruan Data'),
      sourceType: sourceType as any,
      ...stats,
      data: updatedData,
    };

    history.unshift(newEntry);
    saveHistory(history);

    res.json({ success: true, data: updatedData, entry: newEntry });
  } catch (err: any) {
    console.error('Error in /api/save:', err);
    res.status(500).json({ error: err.message || 'Failed to save data' });
  }
});

app.get('/api/history', (_req, res) => {
  const history = getHistory();
  res.json(history);
});

app.post('/api/history/restore/:id', (req, res) => {
  try {
    const { id } = req.params;
    const history = getHistory();
    const target = history.find((h) => h.id === id);

    if (!target) {
      return res.status(404).json({ error: 'Riwayat snapshot tidak ditemukan' });
    }

    const now = new Date();
    const restoredData: DashboardData = {
      ...target.data,
      updatedAt: formatIndonesianTimestamp(now) + ' (Dipulihkan)',
    };

    saveDashboardData(restoredData);

    const stats = calculateStats(restoredData);
    const restoreEntry: HistoryEntry = {
      id: 'hist-' + Date.now(),
      timestamp: now.toISOString(),
      formattedTime: formatIndonesianTimestamp(now),
      note: `Dipulihkan dari riwayat ${target.formattedTime}`,
      sourceType: 'restore',
      ...stats,
      data: restoredData,
    };

    history.unshift(restoreEntry);
    saveHistory(history);

    res.json({ success: true, data: restoredData });
  } catch (err: any) {
    console.error('Error restoring history:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    let history = getHistory();
    const beforeCount = history.length;
    history = history.filter((h) => h.id !== id);

    if (history.length === beforeCount) {
      return res.status(404).json({ error: 'Riwayat tidak ditemukan' });
    }

    saveHistory(history);
    res.json({ success: true, remaining: history.length });
  } catch (err: any) {
    console.error('Error deleting history entry:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI OCR & Parser from Screenshot / Image
app.post('/api/parse-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan' });
    }

    // Clean base64 header if included
    const cleanedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const systemPrompt = `
Anda adalah asisten AI khusus parser data logistik & gudang PT. MBP.
Tugas Anda adalah membaca gambar/screenshot pesan teks WhatsApp atau catatan daftar barang berikut, lalu mengubahnya menjadi JSON terstruktur yang presisi.

Struktur yang harus dihasilkan:
1. BELUM KIRIM (Daftar pesanan berdasarkan grup tanggal/channel):
   Setiap grup memiliki:
   - title: nama grup, misalnya "SHOPEE MT 12/10", "SHOPEE MT 13/10", "SHOPEE MT 14/10", "SHOPEE TANGSEL 14/10", dll.
   - items: list pesanan dalam grup tersebut:
     - name: nama produk/barang (contoh: "Expo 770 hitam", "Ks 10000", "Tf 1000sn", "Rtw 120l 5ch", "102g", "Ysn st6 & gm dz 400", "Cf 310", "Cf 460", "12ssgce")
     - orderNumber: nomor pesanan/resi (contoh: "2610107PDQBYWE", "261012EESPK9JF", "261012EN9JDAMF", dll). Perhatikan huruf kapital dan digit angka secara teliti!
     - courier: ekspedisi pengiriman seperti "J&T", "JNE", "SiCepat", "Shopee Xpress", dll. Huruf besar/kapital rapi.
     - isWoodPacking: boolean (true jika ada kata 'kayu', false jika tidak ada)
     - isDelayed: boolean (true jika ada kata 'TERLAMBAT' atau 'terlambat', false jika tidak)
     - notes: catatan tambahan jika ada

2. STOK TANGERANG TITIP DI PT. MBP (Inventaris barang titipan):
   - sectionTitle: "STOK TANGERANG TITIP DI PT. MBP" (atau sesuai teks di foto seperti "STOK TANGERANG TITIP DI MBG")
   - items: list barang:
     - name: nama barang (contoh: "Gm dh3p", "Wk 120", "Wk 150", "Xs 110", "Loyang 3cm gomesin", "Loyang 3cm chefprimax", "De 08a", "Ruby 200", "Ruby 240", "Gsp 650", "Ab 108")
     - quantity: jumlah unit (integer). Contoh: "Wk 120 2" -> quantity: 2; "Loyang 3cm gomesin 91" -> quantity: 91; "Loyang 3cm chefprimax 16" -> quantity: 16; "Ab 108 3" -> quantity: 3.
     - notes: catatan khusus jika ada di baris tersebut.
       Contoh:
       - jika ada "perlu di perbaiki", notes: "🛠️ Perlu di perbaiki"
       - jika ada "utamakan habiskan ini", notes: "🔥 Utamakan habiskan ini"
       - jika ada "13/10 mbg belum bayar 1 unit", notes: "💳 13/10 mbg belum bayar 1 unit"
       - jika tidak ada catatan khusus, isi "-"

Harap sangat teliti membaca teks pada gambar tanpa melewatkan satupun item! Kembalikan hasil dalam format JSON yang valid.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanedBase64,
            },
          },
          {
            text: systemPrompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            warehouseStatus: { type: Type.STRING },
            belumKirim: {
              type: Type.OBJECT,
              properties: {
                sectionTitle: { type: Type.STRING },
                sectionSubtitle: { type: Type.STRING },
                groups: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      items: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            orderNumber: { type: Type.STRING },
                            courier: { type: Type.STRING },
                            isWoodPacking: { type: Type.BOOLEAN },
                            isDelayed: { type: Type.BOOLEAN },
                            notes: { type: Type.STRING },
                          },
                          required: ['name', 'orderNumber', 'courier', 'isWoodPacking', 'isDelayed'],
                        },
                      },
                    },
                    required: ['title', 'items'],
                  },
                },
              },
              required: ['groups'],
            },
            stokTitipan: {
              type: Type.OBJECT,
              properties: {
                sectionTitle: { type: Type.STRING },
                sectionSubtitle: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      quantity: { type: Type.INTEGER },
                      notes: { type: Type.STRING },
                    },
                    required: ['name', 'quantity'],
                  },
                },
              },
              required: ['items'],
            },
          },
          required: ['belumKirim', 'stokTitipan'],
        },
      },
    });

    const parsedJsonText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(parsedJsonText);

    // Ensure IDs are generated for groups & items
    const now = new Date();
    const finalData: DashboardData = {
      title: parsedData.title || 'Sistem Pemantauan Pesanan Belum Kirim & Titipan Stok PT. MBP',
      subtitle: parsedData.subtitle || 'Dashboard Monitoring Pengiriman & Stok © 2026 PT. MBP',
      warehouseStatus: parsedData.warehouseStatus || 'Status Gudang Active',
      updatedAt: formatIndonesianTimestamp(now),
      belumKirim: {
        sectionTitle: parsedData.belumKirim?.sectionTitle || 'BELUM KIRIM',
        sectionSubtitle: parsedData.belumKirim?.sectionSubtitle || 'Daftar pesanan yang belum dikirimkan ke ekspedisi',
        groups: (parsedData.belumKirim?.groups || []).map((g: any, gIdx: number) => ({
          id: `group-${Date.now()}-${gIdx}`,
          title: g.title || `Grup ${gIdx + 1}`,
          items: (g.items || []).map((it: any, itIdx: number) => ({
            id: `item-${Date.now()}-${gIdx}-${itIdx}`,
            name: it.name || '',
            orderNumber: it.orderNumber || '',
            courier: (it.courier || 'J&T').toUpperCase(),
            isWoodPacking: Boolean(it.isWoodPacking),
            isDelayed: Boolean(it.isDelayed),
            notes: it.notes || '',
          })),
        })),
      },
      stokTitipan: {
        sectionTitle: parsedData.stokTitipan?.sectionTitle || 'STOK TANGERANG TITIP DI PT. MBP',
        sectionSubtitle: parsedData.stokTitipan?.sectionSubtitle || 'Inventaris fisik barang yang saat ini tersedia di gudang PT. MBP',
        items: (parsedData.stokTitipan?.items || []).map((s: any, sIdx: number) => ({
          id: `stock-${Date.now()}-${sIdx}`,
          name: s.name || '',
          quantity: Number(s.quantity) || 0,
          notes: s.notes || '-',
        })),
      },
    };

    res.json({ success: true, data: finalData });
  } catch (err: any) {
    console.error('Error in /api/parse-image:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses gambar' });
  }
});

// Also support Raw Text Parser (in case user copied text directly from WhatsApp)
app.post('/api/parse-text', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Teks tidak boleh kosong' });
    }

    const systemPrompt = `
Anda adalah parser data logistik & gudang PT. MBP.
Ubah teks pesan WhatsApp berikut menjadi JSON terstruktur persis:

${rawText}

Ekstrak semua grup 'BELUM KIRIM' (nama grup tanggal, daftar nama barang, nomor pesanan/resi, ekspedisi, flag kayu, flag terlambat)
dan bagian 'STOK TITIPAN' (nama barang, jumlah unit integer, dan catatan khusus).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || '{}');
    const now = new Date();

    const finalData: DashboardData = {
      title: parsedData.title || 'Sistem Pemantauan Pesanan Belum Kirim & Titipan Stok PT. MBP',
      subtitle: parsedData.subtitle || 'Dashboard Monitoring Pengiriman & Stok © 2026 PT. MBP',
      warehouseStatus: 'Status Gudang Active',
      updatedAt: formatIndonesianTimestamp(now),
      belumKirim: {
        sectionTitle: parsedData.belumKirim?.sectionTitle || 'BELUM KIRIM',
        sectionSubtitle: 'Daftar pesanan yang belum dikirimkan ke ekspedisi',
        groups: (parsedData.belumKirim?.groups || []).map((g: any, gIdx: number) => ({
          id: `group-${Date.now()}-${gIdx}`,
          title: g.title || `Grup ${gIdx + 1}`,
          items: (g.items || []).map((it: any, itIdx: number) => ({
            id: `item-${Date.now()}-${gIdx}-${itIdx}`,
            name: it.name || '',
            orderNumber: it.orderNumber || '',
            courier: (it.courier || 'J&T').toUpperCase(),
            isWoodPacking: Boolean(it.isWoodPacking),
            isDelayed: Boolean(it.isDelayed),
            notes: it.notes || '',
          })),
        })),
      },
      stokTitipan: {
        sectionTitle: parsedData.stokTitipan?.sectionTitle || 'STOK TANGERANG TITIP DI PT. MBP',
        sectionSubtitle: 'Inventaris fisik barang yang saat ini tersedia di gudang PT. MBP',
        items: (parsedData.stokTitipan?.items || []).map((s: any, sIdx: number) => ({
          id: `stock-${Date.now()}-${sIdx}`,
          name: s.name || '',
          quantity: Number(s.quantity) || 0,
          notes: s.notes || '-',
        })),
      },
    };

    res.json({ success: true, data: finalData });
  } catch (err: any) {
    console.error('Error in /api/parse-text:', err);
    res.status(500).json({ error: err.message || 'Gagal memproses teks' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
