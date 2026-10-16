import React, { useState, useMemo } from 'react';
import { DashboardData } from '../types';
import { 
  Share2, 
  Printer, 
  Search, 
  Copy, 
  Check, 
  Lock, 
  ExternalLink, 
  Package, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Building2, 
  MessageCircle,
  KeyRound
} from 'lucide-react';

interface PublicDashboardProps {
  data: DashboardData;
  onOpenAdmin: () => void;
  publicUrl: string;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({
  data,
  onOpenAdmin,
  publicUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'terlambat' | 'kayu'>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Compute live statistics
  const stats = useMemo(() => {
    let totalOrders = 0;
    let delayedOrders = 0;
    let woodOrders = 0;
    let totalStockUnits = 0;

    data.belumKirim.groups.forEach((group) => {
      group.items.forEach((item) => {
        totalOrders++;
        if (item.isDelayed) delayedOrders++;
        if (item.isWoodPacking) woodOrders++;
      });
    });

    data.stokTitipan.items.forEach((stock) => {
      totalStockUnits += Number(stock.quantity) || 0;
    });

    return { totalOrders, delayedOrders, woodOrders, totalStockUnits };
  }, [data]);

  // Filter belum kirim groups and items
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return data.belumKirim.groups
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          // Status filter
          if (filterType === 'terlambat' && !item.isDelayed) return false;
          if (filterType === 'kayu' && !item.isWoodPacking) return false;

          // Search query filter
          if (!q) return true;
          const searchContent = `${item.name} ${item.orderNumber} ${item.courier} ${group.title} ${item.notes || ''}`.toLowerCase();
          return searchContent.includes(q);
        });

        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter((group) => group.items.length > 0 || !searchQuery);
  }, [data.belumKirim.groups, searchQuery, filterType]);

  // Filter stock items
  const filteredStock = useMemo(() => {
    if (filterType !== 'all') {
      return []; // Stock items are not tagged as 'terlambat' or 'kayu'
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.stokTitipan.items;

    return data.stokTitipan.items.filter((item) => {
      const searchContent = `${item.name} ${item.notes} ${item.quantity}`.toLowerCase();
      return searchContent.includes(q);
    });
  }, [data.stokTitipan.items, searchQuery, filterType]);

  // Copy order number handler
  const handleCopyOrderNumber = (orderNumber: string, id: string) => {
    navigator.clipboard.writeText(orderNumber);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  // Copy share URL handler
  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(publicUrl || window.location.href);
    setCopiedShareUrl(true);
    setTimeout(() => setCopiedShareUrl(false), 3000);
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo, berikut link dashboard pemantauan pesanan belum kirim & stok titipan PT. MBP terbaru:\n${publicUrl || window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Courier badge styling helper
  const getCourierBadge = (courier: string) => {
    const upper = (courier || '').toUpperCase();
    if (upper.includes('J&T')) {
      return 'bg-blue-50 text-blue-700 border-blue-100';
    }
    if (upper.includes('JNE')) {
      return 'bg-orange-50 text-orange-700 border-orange-100';
    }
    if (upper.includes('SICEPAT')) {
      return 'bg-red-50 text-red-700 border-red-100';
    }
    if (upper.includes('SHOPEE') || upper.includes('SPX')) {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-slate-100 text-slate-800 min-h-screen pb-12 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div>
        {/* Read-Only Notice Banner */}
        <div className="bg-indigo-900 text-indigo-100 px-4 py-2.5 text-xs sm:text-sm font-medium border-b border-indigo-800 no-print sticky top-0 z-40 shadow-sm backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider gap-1 border border-indigo-700">
                <Lock className="w-3 h-3 text-indigo-300" />
                Read-Only
              </span>
              <span className="text-xs sm:text-sm">
                Tampilan terbatas (Hanya Lihat). Anda tidak dapat mengubah data pada link ini.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan / Print PDF</span>
              </button>
              <button
                onClick={onOpenAdmin}
                title="Masuk sebagai pengelola untuk upload foto / edit data"
                className="bg-indigo-950/70 hover:bg-indigo-800 text-indigo-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border border-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>Akses Pengelola</span>
              </button>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <header className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                  <span>📦</span> {data.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-indigo-100">
                  <span>{data.subtitle}</span>
                  <span className="text-indigo-300">•</span>
                  <span className="bg-indigo-800/60 px-2 py-0.5 rounded text-xs font-mono">
                    Update: {data.updatedAt}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-indigo-800/60 backdrop-blur-md px-4 py-2 rounded-xl border border-indigo-400/30 text-xs font-medium self-start md:self-auto shadow-inner">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-emerald-100">{data.warehouseStatus || 'Status Gudang Active'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-8">
          {/* Summary Cards / Statistics Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pesanan</p>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {stats.totalOrders} <span className="text-xs font-normal text-slate-500">Item</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Terlambat</p>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats.delayedOrders} <span className="text-xs font-normal text-slate-500">Item</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Packing Kayu</p>
                <span className="text-sm">🪵</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {stats.woodOrders} <span className="text-xs font-normal text-slate-500">Item</span>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Unit Stok</p>
                <Building2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {stats.totalStockUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
              </p>
            </div>
          </div>

          {/* Search & Filter Controls (No Print) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between no-print">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama barang / no. pesanan..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Data
              </button>
              <button
                onClick={() => setFilterType('terlambat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'terlambat'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                ⚠️ Terlambat Only
              </button>
              <button
                onClick={() => setFilterType('kayu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'kayu'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                🪵 Kayu Only
              </button>
            </div>
          </div>

          {/* Toast Notification when Order Number Copied */}
          {copiedOrderId && (
            <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 z-50 animate-bounce">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Nomor pesanan berhasil disalin!</span>
            </div>
          )}

          {/* SECTION 1: BELUM KIRIM */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print-break-inside-avoid">
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-lg font-bold text-lg leading-none flex items-center justify-center">
                  ⏳
                </div>
                <div>
                  <h2 className="font-bold text-lg tracking-wide uppercase">
                    {data.belumKirim.sectionTitle}
                  </h2>
                  <p className="text-slate-400 text-xs">
                    {data.belumKirim.sectionSubtitle}
                  </p>
                </div>
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                Pending Delivery
              </span>
            </div>

            <div className="p-4 sm:p-6 space-y-8">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-slate-600">Tidak ada pesanan ditemukan</p>
                  <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
                </div>
              ) : (
                filteredGroups.map((group, gIndex) => (
                  <div
                    key={group.id || gIndex}
                    className={`space-y-3 ${
                      gIndex > 0 ? 'pt-4 border-t border-slate-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                      <h3 className="font-bold text-indigo-900 text-sm sm:text-base uppercase tracking-wide">
                        {group.title}
                      </h3>
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-100">
                        {group.items.length} Pesanan
                      </span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-xs">
                          <tr>
                            <th className="py-3 px-4 w-1/3">Nama Barang</th>
                            <th className="py-3 px-4 w-1/3">Nomor Pesanan</th>
                            <th className="py-3 px-4">Ekspedisi</th>
                            <th className="py-3 px-4">Status / Catatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50 transition-colors group"
                            >
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {item.name}
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleCopyOrderNumber(item.orderNumber, item.id)}
                                  title="Klik untuk menyalin nomor pesanan"
                                  className="font-mono text-xs text-slate-700 bg-slate-50 hover:bg-indigo-50 px-2 py-1 rounded border border-slate-200 hover:border-indigo-200 flex items-center gap-1.5 transition-all text-left group-hover:border-slate-300 cursor-pointer"
                                >
                                  <span>{item.orderNumber}</span>
                                  {copiedOrderId === item.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${getCourierBadge(
                                    item.courier
                                  )}`}
                                >
                                  {item.courier}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.isWoodPacking && (
                                    <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-md font-semibold border border-amber-200">
                                      🪵 kayu
                                    </span>
                                  )}
                                  {item.isDelayed && (
                                    <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-md font-bold border border-red-200 animate-pulse">
                                      ⚠️ TERLAMBAT
                                    </span>
                                  )}
                                  {!item.isWoodPacking && !item.isDelayed && (
                                    <span className="text-slate-400 font-mono text-xs">
                                      {item.notes || '-'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 shadow-xs"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-slate-900 text-base">
                              {item.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold uppercase border whitespace-nowrap ${getCourierBadge(
                                item.courier
                              )}`}
                            >
                              {item.courier}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs text-slate-400 block uppercase font-medium">
                              Nomor Pesanan
                            </span>
                            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200 mt-0.5">
                              <span className="font-mono text-xs text-slate-700 select-all">
                                {item.orderNumber}
                              </span>
                              <button
                                onClick={() => handleCopyOrderNumber(item.orderNumber, item.id)}
                                className="text-slate-400 hover:text-indigo-600 p-1"
                                title="Salin nomor pesanan"
                              >
                                {copiedOrderId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {(item.isWoodPacking || item.isDelayed || item.notes) && (
                            <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-slate-200/80">
                              {item.isWoodPacking && (
                                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold border border-amber-200">
                                  🪵 kayu
                                </span>
                              )}
                              {item.isDelayed && (
                                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold border border-red-200">
                                  ⚠️ TERLAMBAT
                                </span>
                              )}
                              {item.notes && !item.isWoodPacking && !item.isDelayed && (
                                <span className="text-slate-500 text-xs font-medium">
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SECTION 2: STOK TANGERANG TITIP DI PT. MBP */}
          {filteredStock.length > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print-break-inside-avoid">
              <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-lg font-bold text-lg leading-none flex items-center justify-center">
                    🏢
                  </div>
                  <div>
                    <h2 className="font-bold text-lg tracking-wide uppercase">
                      {data.stokTitipan.sectionTitle}
                    </h2>
                    <p className="text-slate-400 text-xs">
                      {data.stokTitipan.sectionSubtitle}
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                  In Stock ({filteredStock.length} Jenis)
                </span>
              </div>

              <div className="p-4 sm:p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold">Nama Barang</th>
                        <th className="py-3.5 px-4 font-bold text-center w-28">Jumlah (Unit)</th>
                        <th className="py-3.5 px-4 font-bold">Catatan / Status Khusus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredStock.map((stock) => {
                        const isUrgent = stock.notes.toLowerCase().includes('utamakan');
                        const isRepair = stock.notes.toLowerCase().includes('perbaiki');
                        const isPayment = stock.notes.toLowerCase().includes('belum bayar');

                        let rowClass = 'hover:bg-slate-50/80 transition-colors';
                        if (isUrgent) rowClass += ' bg-amber-50/30';
                        if (isPayment) rowClass += ' bg-red-50/20';

                        return (
                          <tr key={stock.id} className={rowClass}>
                            <td
                              className={`py-3 px-4 ${
                                isUrgent || isPayment ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                              }`}
                            >
                              {stock.name}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-lg font-bold inline-block ${
                                  isUrgent
                                    ? 'bg-amber-100 text-amber-900 border border-amber-200 font-extrabold'
                                    : isPayment
                                    ? 'bg-red-100 text-red-900 border border-red-200 font-extrabold'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {stock.quantity}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isRepair && (
                                <span className="text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-md text-xs border border-red-200 inline-block">
                                  {stock.notes}
                                </span>
                              )}
                              {isUrgent && (
                                <span className="text-amber-900 font-extrabold bg-amber-100 px-2.5 py-1 rounded-md text-xs border border-amber-300 inline-block">
                                  {stock.notes}
                                </span>
                              )}
                              {isPayment && (
                                <span className="text-red-700 font-bold bg-red-100 px-2.5 py-1 rounded-md text-xs border border-red-200 inline-block">
                                  {stock.notes}
                                </span>
                              )}
                              {!isRepair && !isUrgent && !isPayment && (
                                <span className="text-slate-400 font-mono text-xs">
                                  {stock.notes || '-'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 relative border border-slate-100">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl text-xl">
                🔗
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Bagikan Dashboard</h3>
                <p className="text-xs text-slate-500">
                  Kirim link ini ke tim / klien (Hanya Lihat tanpa bisa ubah)
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-600 block">
                Link Akses Publik (Read-Only):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl || window.location.href}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none select-all"
                />
                <button
                  onClick={handleCopyShareUrl}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  {copiedShareUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <button
                onClick={handleShareWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim via WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setTimeout(() => window.print(), 300);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-lg border border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Simpan sebagai PDF / Cetak Laporan</span>
              </button>
            </div>

            {copiedShareUrl && (
              <p className="text-xs text-emerald-600 font-bold text-center pt-1 animate-fade-in">
                ✓ Link publik berhasil disalin ke clipboard!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 mt-12 text-center text-slate-500 text-xs space-y-2 no-print">
        <p>Dashboard Monitoring Pengiriman & Stok &copy; 2026 PT. MBP</p>
        <div className="pt-2">
          <button
            onClick={onOpenAdmin}
            className="text-slate-400 hover:text-indigo-600 hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <Lock className="w-3 h-3" />
            <span>Portal Pengelola (Upload Foto & Edit)</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
