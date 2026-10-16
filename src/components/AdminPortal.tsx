import React, { useState, useEffect, useRef } from 'react';
import { DashboardData, HistoryEntry, OrderGroup, StockItem } from '../types';
import {
  Upload,
  Sparkles,
  History,
  Edit3,
  Copy,
  Check,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Plus,
  Lock,
  Unlock,
  ExternalLink,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  RefreshCw,
  Eye,
  KeyRound
} from 'lucide-react';

interface AdminPortalProps {
  currentData: DashboardData;
  onSaveData: (newData: DashboardData, note?: string, sourceType?: string) => Promise<boolean>;
  onBackToDashboard: () => void;
  publicUrl: string;
  adminKey: string;
  setAdminKey: (key: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentData,
  onSaveData,
  onBackToDashboard,
  publicUrl,
  adminKey,
  setAdminKey,
}) => {
  // Tabs: 'upload' | 'edit' | 'history' | 'links'
  const [activeTab, setActiveTab] = useState<'upload' | 'edit' | 'history' | 'links'>('upload');

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Upload & OCR states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [pasteNotice, setPasteNotice] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isRawTextMode, setIsRawTextMode] = useState(false);

  // Edit draft states
  const [draftData, setDraftData] = useState<DashboardData>(currentData);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // History states
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyActionMsg, setHistoryActionMsg] = useState('');

  // Copy states
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default secret PIN is 'mbp2026' or 'admin123'
  const DEFAULT_PIN = 'admin123';

  // Check initial authentication
  useEffect(() => {
    // If URL contains key or localStorage has key matching or entered
    const storedKey = localStorage.getItem('pt_mbp_admin_key');
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get('key');

    if (urlKey && (urlKey === DEFAULT_PIN || urlKey === adminKey)) {
      setIsAuthenticated(true);
      setAdminKey(urlKey);
      localStorage.setItem('pt_mbp_admin_key', urlKey);
    } else if (storedKey && (storedKey === DEFAULT_PIN || storedKey === adminKey)) {
      setIsAuthenticated(true);
    }
  }, [adminKey, setAdminKey]);

  // Keep draftData in sync if currentData updates externally
  useEffect(() => {
    setDraftData(currentData);
  }, [currentData]);

  // Global Ctrl + V listener for image paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isAuthenticated) return;
      if (activeTab !== 'upload') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleImageFile(blob);
            setPasteNotice(true);
            setTimeout(() => setPasteNotice(false), 3000);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAuthenticated, activeTab]);

  // Fetch history list
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'history') {
      loadHistory();
    }
  }, [isAuthenticated, activeTab]);

  // Verify PIN
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === DEFAULT_PIN || enteredPin === 'mbp2026' || enteredPin === adminKey) {
      setIsAuthenticated(true);
      setAdminKey(enteredPin);
      localStorage.setItem('pt_mbp_admin_key', enteredPin);
      setAuthError('');
    } else {
      setAuthError('Kunci PIN salah. Gunakan: admin123');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pt_mbp_admin_key');
    setIsAuthenticated(false);
    setEnteredPin('');
  };

  // Convert File to Base64
  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setImageMime(file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini AI Image Parser
  const handleProcessImageWithAI = async () => {
    if (!imagePreview) return;

    try {
      setIsProcessingAI(true);
      setProcessingStatus('Mengunggah & membaca gambar...');

      // Step animation updates
      const timer1 = setTimeout(() => {
        setProcessingStatus('Menganalisis pesanan belum kirim & ekspedisi...');
      }, 1500);

      const timer2 = setTimeout(() => {
        setProcessingStatus('Menyusun daftar barang titipan stok & catatan...');
      }, 3000);

      const response = await fetch('/api/parse-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imageMime,
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Gagal memproses gambar');
      }

      const result = await response.json();
      if (result.data) {
        setDraftData(result.data);
        // Automatically save to publish!
        await onSaveData(result.data, 'Ekstrak Otomatis Screenshot WhatsApp via AI', 'image_upload');
        setSaveSuccessMsg('Data dari foto berhasil diekstrak dan otomatis diperbarui ke link publik!');
        setActiveTab('edit');
        setTimeout(() => setSaveSuccessMsg(''), 6000);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error saat mengekstrak gambar: ' + (err.message || 'Silakan coba lagi'));
    } finally {
      setIsProcessingAI(false);
      setProcessingStatus('');
    }
  };

  // Process Raw WhatsApp Text
  const handleProcessRawText = async () => {
    if (!rawText.trim()) return;

    try {
      setIsProcessingAI(true);
      setProcessingStatus('Memproses teks WhatsApp dengan AI...');

      const response = await fetch('/api/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Gagal memproses teks');
      }

      const result = await response.json();
      if (result.data) {
        setDraftData(result.data);
        await onSaveData(result.data, 'Ekstrak Teks WhatsApp via AI', 'manual_edit');
        setSaveSuccessMsg('Data teks berhasil diekstrak dan disimpan!');
        setActiveTab('edit');
        setTimeout(() => setSaveSuccessMsg(''), 6000);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsProcessingAI(false);
      setProcessingStatus('');
    }
  };

  // Manual Draft Save
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const success = await onSaveData(draftData, 'Pembaruan data manual oleh pengelola', 'manual_edit');
      if (success) {
        setSaveSuccessMsg('Data berhasil disimpan dan link publik langsung terupdate!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Restore History
  const handleRestoreHistory = async (id: string, timeLabel: string) => {
    if (!window.confirm(`Yakin ingin memulihkan data dashboard ke versi snapshot (${timeLabel})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/history/restore/${id}`, { method: 'POST' });
      if (res.ok) {
        const resData = await res.json();
        setDraftData(resData.data);
        setHistoryActionMsg(`Snapshot (${timeLabel}) berhasil dipulihkan ke dashboard live!`);
        setTimeout(() => setHistoryActionMsg(''), 5000);
        loadHistory();
      } else {
        alert('Gagal memulihkan snapshot');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Delete History
  const handleDeleteHistory = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus catatan riwayat ini?')) return;

    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistoryList((prev) => prev.filter((h) => h.id !== id));
        setHistoryActionMsg('Catatan riwayat berhasil dihapus.');
        setTimeout(() => setHistoryActionMsg(''), 3000);
      } else {
        alert('Gagal menghapus riwayat');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Helper to add group
  const handleAddGroup = () => {
    const newGroup: OrderGroup = {
      id: 'group-' + Date.now(),
      title: 'SHOPEE MT ' + new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
      items: [
        {
          id: 'item-' + Date.now(),
          name: '',
          orderNumber: '',
          courier: 'J&T',
          isWoodPacking: false,
          isDelayed: false,
          notes: '',
        },
      ],
    };
    setDraftData({
      ...draftData,
      belumKirim: {
        ...draftData.belumKirim,
        groups: [...draftData.belumKirim.groups, newGroup],
      },
    });
  };

  // Helper to add item to group
  const handleAddItemToGroup = (groupId: string) => {
    setDraftData({
      ...draftData,
      belumKirim: {
        ...draftData.belumKirim,
        groups: draftData.belumKirim.groups.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              items: [
                ...g.items,
                {
                  id: 'item-' + Date.now(),
                  name: '',
                  orderNumber: '',
                  courier: 'J&T',
                  isWoodPacking: false,
                  isDelayed: false,
                  notes: '',
                },
              ],
            };
          }
          return g;
        }),
      },
    });
  };

  // Helper to remove group
  const handleRemoveGroup = (groupId: string) => {
    if (!window.confirm('Hapus seluruh grup pesanan ini?')) return;
    setDraftData({
      ...draftData,
      belumKirim: {
        ...draftData.belumKirim,
        groups: draftData.belumKirim.groups.filter((g) => g.id !== groupId),
      },
    });
  };

  // Helper to remove item from group
  const handleRemoveItem = (groupId: string, itemId: string) => {
    setDraftData({
      ...draftData,
      belumKirim: {
        ...draftData.belumKirim,
        groups: draftData.belumKirim.groups.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              items: g.items.filter((it) => it.id !== itemId),
            };
          }
          return g;
        }),
      },
    });
  };

  // Helper to add stock item
  const handleAddStockItem = () => {
    const newItem: StockItem = {
      id: 'stock-' + Date.now(),
      name: '',
      quantity: 1,
      notes: '-',
    };
    setDraftData({
      ...draftData,
      stokTitipan: {
        ...draftData.stokTitipan,
        items: [...draftData.stokTitipan.items, newItem],
      },
    });
  };

  // Helper to remove stock item
  const handleRemoveStockItem = (id: string) => {
    setDraftData({
      ...draftData,
      stokTitipan: {
        ...draftData.stokTitipan,
        items: draftData.stokTitipan.items.filter((s) => s.id !== id),
      },
    });
  };

  // Secret admin URL with key
  const adminSecretUrl = `${window.location.origin}${window.location.pathname}?admin=true&key=${adminKey || DEFAULT_PIN}`;

  // If not authenticated, show PIN login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Portal Pengelola (Admin)</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Masukkan Kunci PIN Pengelola untuk upload foto screenshot WhatsApp & mengubah data dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kunci PIN Pengelola
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Ketik PIN (default: admin123)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
              {authError ? (
                <p className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1.5">
                  Petunjuk default: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">admin123</code>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Buka Portal Pengelola</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              onClick={onBackToDashboard}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Kembali ke Dashboard Publik (Hanya Lihat)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Admin Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Lihat Link Publik</span>
            </button>
            <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
            <div>
              <span className="font-extrabold text-sm sm:text-base flex items-center gap-1.5 text-white">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Portal Pengelola Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
              ● Mode Admin Aktif
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Upload Foto / AI Scan</span>
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'edit'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>2. Edit Data Manual</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>3. Riwayat Update ({historyList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('links')}
            className={`py-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'links'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>4. Bagikan Link</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
        {/* Success / Alert Banner */}
        {saveSuccessMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-medium text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              onClick={onBackToDashboard}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all shadow-xs"
            >
              Lihat Tampilan Publik →
            </button>
          </div>
        )}

        {/* ================= TAB 1: UPLOAD FOTO / AI SCAN ================= */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Upload Foto / Screenshot WhatsApp
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Tarik (drag & drop) gambar ke area di bawah atau cukup tekan{' '}
                    <kbd className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-xs font-mono font-bold text-slate-700">
                      Ctrl + V
                    </kbd>{' '}
                    di halaman ini untuk mem-paste screenshot langsung dari clipboard!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRawTextMode(!isRawTextMode)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-all border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isRawTextMode ? 'Mode Gambar' : 'Alternatif: Paste Teks WA'}</span>
                  </button>
                </div>
              </div>

              {pasteNotice && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                  <Check className="w-4 h-4 text-indigo-600" />
                  <span>Gambar berhasil ditempel (Ctrl+V) dari clipboard!</span>
                </div>
              )}

              {/* Alternative: Raw Text Paste Mode */}
              {isRawTextMode ? (
                <div className="space-y-4 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Tempel Teks Lengkap WhatsApp (Belum Kirim + Stok Titipan):
                  </label>
                  <textarea
                    rows={10}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Contoh:\nBELUM KIRIM :\nSHOPE MT 12/10\nExpo 770 hitam kayu, 2610107PDQBYWE, j&t TERLAMBAT\nKs 10000, 261012EESPK9JF, j&t TERLAMBAT\n\nSTOK TANGERANG TITIP DI PT. MBP\nGm dh3p 1 perlu di perbaiki\nWk 120 2`}
                    className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                  />
                  <button
                    onClick={handleProcessRawText}
                    disabled={isProcessingAI || !rawText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isProcessingAI ? processingStatus : 'Ekstrak Teks dengan AI & Perbarui'}</span>
                  </button>
                </div>
              ) : (
                /* Main Image Dropzone */
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleImageFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                      imagePreview
                        ? 'border-indigo-400 bg-indigo-50/20'
                        : 'border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFile(e.target.files[0]);
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />

                    {imagePreview ? (
                      <div className="space-y-3 w-full max-w-sm">
                        <img
                          src={imagePreview}
                          alt="Screenshot Preview"
                          className="max-h-64 mx-auto rounded-xl shadow-md border border-slate-200 object-contain"
                        />
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                            ✓ Gambar siap diproses
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImagePreview(null);
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 bg-red-50 rounded"
                          >
                            Ganti Foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                          <Upload className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-sm sm:text-base font-bold text-slate-800">
                            Tarik foto ke sini atau klik untuk memilih file
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Atau tekan <span className="font-bold text-indigo-600">Ctrl + V</span> di mana saja jika sudah copy screenshot!
                          </p>
                        </div>
                        <span className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full shadow-xs font-medium">
                          Mendukung JPG, PNG, WEBP, Screenshot WhatsApp
                        </span>
                      </>
                    )}
                  </div>

                  {imagePreview && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Siap memproses dengan AI Vision (Gemini)
                        </p>
                        <p className="text-xs text-slate-500">
                          Sistem akan membaca nomor pesanan, status kayu, ekspedisi, dan stok titipan secara otomatis.
                        </p>
                      </div>

                      <button
                        onClick={handleProcessImageWithAI}
                        disabled={isProcessingAI}
                        className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-extrabold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                      >
                        {isProcessingAI ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{processingStatus || 'Memproses Foto...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Ekstrak Data & Perbarui Link Publik</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Preview Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Status Data Publik Saat Ini
                  </h3>
                  <p className="text-xs text-slate-500">
                    Terakhir diperbarui: {currentData.updatedAt}
                  </p>
                </div>
                <button
                  onClick={onBackToDashboard}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-indigo-200 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka Tampilan Publik</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Grup Pesanan</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {currentData.belumKirim.groups.length}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Total Belum Kirim</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {currentData.belumKirim.groups.reduce((acc, g) => acc + g.items.length, 0)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Item Terlambat</p>
                  <p className="text-xl font-bold text-red-600 mt-0.5">
                    {currentData.belumKirim.groups.reduce(
                      (acc, g) => acc + g.items.filter((it) => it.isDelayed).length,
                      0
                    )}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500">Jenis Stok Titipan</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">
                    {currentData.stokTitipan.items.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: EDIT DATA MANUAL ================= */}
        {activeTab === 'edit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-16 z-30 backdrop-blur-md">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  Editor Data Langsung
                </h2>
                <p className="text-xs text-slate-500">
                  Periksa atau ubah data hasil scan foto sebelum / sesudah dipublikasikan ke link umum.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan & Publikasikan'}</span>
                </button>
              </div>
            </div>

            {/* General Settings */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Informasi Utama Header
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Judul Dashboard
                  </label>
                  <input
                    type="text"
                    value={draftData.title}
                    onChange={(e) => setDraftData({ ...draftData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Subjudul / Perusahaan
                  </label>
                  <input
                    type="text"
                    value={draftData.subtitle}
                    onChange={(e) => setDraftData({ ...draftData, subtitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* BELUM KIRIM Groups Editor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>⏳</span> Bagian: BELUM KIRIM
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kelompokkan pesanan berdasarkan channel atau tanggal
                  </p>
                </div>
                <button
                  onClick={handleAddGroup}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Grup Baru</span>
                </button>
              </div>

              {draftData.belumKirim.groups.map((group, gIdx) => (
                <div
                  key={group.id}
                  className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      <input
                        type="text"
                        value={group.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftData({
                            ...draftData,
                            belumKirim: {
                              ...draftData.belumKirim,
                              groups: draftData.belumKirim.groups.map((g) =>
                                g.id === group.id ? { ...g, title: val } : g
                              ),
                            },
                          });
                        }}
                        placeholder="Nama Grup (e.g. SHOPEE MT 12/10)"
                        className="font-bold text-indigo-950 text-sm bg-white border border-slate-300 rounded-lg px-2.5 py-1 w-full sm:w-64 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                        {group.items.length} Item
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleAddItemToGroup(group.id)}
                        className="bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Item</span>
                      </button>
                      <button
                        onClick={() => handleRemoveGroup(group.id)}
                        className="text-red-600 hover:text-red-700 text-xs font-bold p-1 rounded hover:bg-red-50 cursor-pointer"
                        title="Hapus Grup"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Group Items Table/Inputs */}
                  <div className="space-y-2">
                    {group.items.map((item, itemIdx) => (
                      <div
                        key={item.id}
                        className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-slate-400 block font-semibold uppercase sm:hidden">
                            Nama Barang
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftData({
                                ...draftData,
                                belumKirim: {
                                  ...draftData.belumKirim,
                                  groups: draftData.belumKirim.groups.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          items: g.items.map((it) =>
                                            it.id === item.id ? { ...it, name: val } : it
                                          ),
                                        }
                                      : g
                                  ),
                                },
                              });
                            }}
                            placeholder="Nama barang..."
                            className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:bg-white"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 block font-semibold uppercase sm:hidden">
                            No. Pesanan
                          </label>
                          <input
                            type="text"
                            value={item.orderNumber}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftData({
                                ...draftData,
                                belumKirim: {
                                  ...draftData.belumKirim,
                                  groups: draftData.belumKirim.groups.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          items: g.items.map((it) =>
                                            it.id === item.id ? { ...it, orderNumber: val } : it
                                          ),
                                        }
                                      : g
                                  ),
                                },
                              });
                            }}
                            placeholder="Nomor resi/pesanan..."
                            className="w-full text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block font-semibold uppercase sm:hidden">
                            Ekspedisi
                          </label>
                          <input
                            type="text"
                            value={item.courier}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setDraftData({
                                ...draftData,
                                belumKirim: {
                                  ...draftData.belumKirim,
                                  groups: draftData.belumKirim.groups.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          items: g.items.map((it) =>
                                            it.id === item.id ? { ...it, courier: val } : it
                                          ),
                                        }
                                      : g
                                  ),
                                },
                              });
                            }}
                            placeholder="J&T / JNE"
                            className="w-full text-xs font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 uppercase outline-none focus:bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isWoodPacking}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setDraftData({
                                  ...draftData,
                                  belumKirim: {
                                    ...draftData.belumKirim,
                                    groups: draftData.belumKirim.groups.map((g) =>
                                      g.id === group.id
                                        ? {
                                            ...g,
                                            items: g.items.map((it) =>
                                              it.id === item.id ? { ...it, isWoodPacking: checked } : it
                                            ),
                                          }
                                        : g
                                    ),
                                  },
                                });
                              }}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span>🪵 Kayu</span>
                          </label>

                          <label className="flex items-center gap-1 text-[11px] font-bold text-red-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isDelayed}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setDraftData({
                                  ...draftData,
                                  belumKirim: {
                                    ...draftData.belumKirim,
                                    groups: draftData.belumKirim.groups.map((g) =>
                                      g.id === group.id
                                        ? {
                                            ...g,
                                            items: g.items.map((it) =>
                                              it.id === item.id ? { ...it, isDelayed: checked } : it
                                            ),
                                          }
                                        : g
                                    ),
                                  },
                                });
                              }}
                              className="rounded text-red-600 focus:ring-red-500"
                            />
                            <span>⚠️ Telat</span>
                          </label>
                        </div>

                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(group.id, item.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* STOK TITIPAN Editor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>🏢</span> Bagian: {draftData.stokTitipan.sectionTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inventaris stok titipan di gudang
                  </p>
                </div>
                <button
                  onClick={handleAddStockItem}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Barang Stok</span>
                </button>
              </div>

              <div className="space-y-2">
                {draftData.stokTitipan.items.map((stock) => (
                  <div
                    key={stock.id}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-5">
                      <label className="text-[10px] text-slate-400 block font-semibold uppercase sm:hidden">
                        Nama Barang
                      </label>
                      <input
                        type="text"
                        value={stock.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftData({
                            ...draftData,
                            stokTitipan: {
                              ...draftData.stokTitipan,
                              items: draftData.stokTitipan.items.map((s) =>
                                s.id === stock.id ? { ...s, name: val } : s
                              ),
                            },
                          });
                        }}
                        placeholder="Nama barang..."
                        className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block font-semibold uppercase sm:hidden">
                        Jumlah (Unit)
                      </label>
                      <input
                        type="number"
                        value={stock.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setDraftData({
                            ...draftData,
                            stokTitipan: {
                              ...draftData.stokTitipan,
                              items: draftData.stokTitipan.items.map((s) =>
                                s.id === stock.id ? { ...s, quantity: val } : s
                              ),
                            },
                          });
                        }}
                        className="w-full text-xs font-bold text-center text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-slate-400 block font-semibold uppercase sm:hidden">
                        Catatan Khusus
                      </label>
                      <input
                        type="text"
                        value={stock.notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftData({
                            ...draftData,
                            stokTitipan: {
                              ...draftData.stokTitipan,
                              items: draftData.stokTitipan.items.map((s) =>
                                s.id === stock.id ? { ...s, notes: val } : s
                              ),
                            },
                          });
                        }}
                        placeholder="Catatan (e.g. Utamakan habiskan ini / -)"
                        className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveStockItem(stock.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan & Publikasikan ke Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: RIWAYAT PERUBAHAN ================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Riwayat Pembaruan Dashboard
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Setiap upload foto atau edit tersimpan otomatis. Anda bisa memulihkan (restore) versi lampau kapan saja atau menghapus riwayat yang tidak dibutuhkan.
                  </p>
                </div>
                <button
                  onClick={loadHistory}
                  disabled={isLoadingHistory}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {historyActionMsg && (
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2.5 rounded-xl text-xs font-bold">
                  {historyActionMsg}
                </div>
              )}

              {historyList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-slate-600">Belum ada riwayat tercatat</p>
                  <p className="text-xs mt-1">Lakukan upload foto atau simpan perubahan data untuk membuat riwayat.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historyList.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {entry.formattedTime}
                          </span>
                          {idx === 0 && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Versi Aktif
                            </span>
                          )}
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                            {entry.note}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span>📦 {entry.totalOrders} Pesanan</span>
                          <span>⚠️ {entry.totalDelayed} Terlambat</span>
                          <span>🪵 {entry.totalWood} Kayu</span>
                          <span>🏢 {entry.totalStockUnits} Unit Stok</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => handleRestoreHistory(entry.id, entry.formattedTime)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan ke Live</span>
                        </button>

                        <button
                          onClick={() => handleDeleteHistory(entry.id)}
                          className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus dari riwayat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: KELOLA LINK & BAGIKAN ================= */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-indigo-600" />
                  Kelola Link Akses & Berbagi
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Sesuai permintaan Anda: link untuk publik bersifat tetap, tidak perlu wakeup server, dan hanya menampilkan data (read-only) tanpa bisa diedit orang lain.
                </p>
              </div>

              {/* Box 1: Public Read-Only Link */}
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-sm text-indigo-900">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    🌐 Link Publik untuk Dibagikan ke Orang Lain (Hanya Lihat)
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded uppercase">
                    Aman Dibagikan
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Siapa pun yang membuka tautan ini <b>TIDAK BISA MENGUBAH DATA</b>. Fitur interaktif seperti pencarian, filter status terlambat/kayu, dan simpan PDF tetap dapat mereka gunakan secara lancar. Link ini tidak akan berubah!
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      setCopiedPublic(true);
                      setTimeout(() => setCopiedPublic(false), 3000);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer shadow-sm"
                  >
                    {copiedPublic ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPublic ? 'Tersalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>

              {/* Box 2: Secret Admin Link */}
              <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-sm text-amber-900">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    🔑 Link Rahasia Akses Edit Anda (Simpan / Bookmark)
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded uppercase">
                    Khusus Anda
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Simpan tautan ini di bookmark browser atau chat pribadi WhatsApp Anda. Membuka link ini akan otomatis login ke portal admin tanpa harus memasukkan PIN lagi.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={adminSecretUrl}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(adminSecretUrl);
                      setCopiedAdmin(true);
                      setTimeout(() => setCopiedAdmin(false), 3000);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer shadow-sm"
                  >
                    {copiedAdmin ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedAdmin ? 'Tersalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
