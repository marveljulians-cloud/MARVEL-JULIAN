/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DashboardData } from './types';
import { initialDashboardData } from './initialData';
import { PublicDashboard } from './components/PublicDashboard';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  const [data, setData] = useState<DashboardData>(() => {
    // Immediate fallback from localStorage cache for zero-latency initial paint
    try {
      const cached = localStorage.getItem('pt_mbp_dashboard_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Could not read cached data:', e);
    }
    return initialDashboardData;
  });

  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('admin') === 'true' || urlParams.has('key') || window.location.pathname === '/admin';
  });

  const [adminKey, setAdminKey] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('key') || localStorage.getItem('pt_mbp_admin_key') || 'admin123';
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch live dashboard data from server
  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const liveData: DashboardData = await res.json();
        setData(liveData);
        try {
          localStorage.setItem('pt_mbp_dashboard_cache', JSON.stringify(liveData));
        } catch (e) {
          // ignore localStorage quota errors
        }
      }
    } catch (err) {
      console.error('Failed to fetch /api/data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Save new dashboard data to server
  const handleSaveData = async (
    newData: DashboardData,
    note?: string,
    sourceType = 'manual_edit'
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: newData,
          note,
          sourceType,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson.error || 'Gagal menyimpan data ke server');
      }

      const resJson = await res.json();
      if (resJson.data) {
        setData(resJson.data);
        localStorage.setItem('pt_mbp_dashboard_cache', JSON.stringify(resJson.data));
      }
      return true;
    } catch (err: any) {
      console.error('Error saving data:', err);
      alert('Gagal menyimpan data: ' + err.message);
      return false;
    }
  };

  // Derive canonical Public URL (without admin query params)
  const publicUrl = `${window.location.origin}${window.location.pathname}`;

  return (
    <div className="min-h-screen">
      {isAdminMode ? (
        <AdminPortal
          currentData={data}
          onSaveData={handleSaveData}
          onBackToDashboard={() => {
            setIsAdminMode(false);
            // Clean URL query without page reload
            window.history.pushState({}, '', window.location.pathname);
          }}
          publicUrl={publicUrl}
          adminKey={adminKey}
          setAdminKey={setAdminKey}
        />
      ) : (
        <PublicDashboard
          data={data}
          onOpenAdmin={() => {
            setIsAdminMode(true);
            window.history.pushState({}, '', '?admin=true');
          }}
          publicUrl={publicUrl}
        />
      )}
    </div>
  );
}
