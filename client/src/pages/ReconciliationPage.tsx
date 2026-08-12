import { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';

export default function ReconciliationPage() {
  const [xeroFile, setXeroFile] = useState<File | null>(null);
  const [netcashFile, setNetcashFile] = useState<File | null>(null);
  const [patriotFile, setPatriotFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);
  const [expandedClientIds, setExpandedClientIds] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedClientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSplitTenant = async (partitionId: number) => {
    if (!window.confirm('Are you sure you want to promote this partition to an independent client?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/clients/split-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partition_id: partitionId })
      });
      if (res.ok) {
        fetchClients();
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error splitting tenant');
    }
  };

  // Internal Equipment State
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [internalEquipment, setInternalEquipment] = useState<any[]>([]);
  const [newInternal, setNewInternal] = useState({ transmitter_no: '', port_id: '', description: '', location: '', category: 'OFFICE_ALARM' });

  // Unallocated Hardware & Split Billing
  const [unallocatedHw, setUnallocatedHw] = useState<any[]>([]);
  const [unallocatedDrawerOpen, setUnallocatedDrawerOpen] = useState(false);

  const [splitBillModalOpen, setSplitBillModalOpen] = useState(false);
  const [splitBillRow, setSplitBillRow] = useState<any>(null);
  const [partitionNo, setPartitionNo] = useState('');
  const [partitionLabel, setPartitionLabel] = useState('');
  const [partitionFee, setPartitionFee] = useState('');

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clients`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBatchLock = async () => {
    if (!results?.xero_matches) return;
    const matchesToLock = results.xero_matches.filter((m: any) => m.client_id && m.xero_contact_id);
    if (!matchesToLock.length) return alert('No matches to lock');
    
    if (!window.confirm(`Lock ${matchesToLock.length} matches?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/lock-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: matchesToLock })
      });
      if (res.ok) {
        handleUpload();
      } else {
        alert('Error locking matches');
      }
    } catch (err) {
      console.error(err);
      alert('Error batch locking');
    }
  };

  const handleIndividualLock = async (match: any) => {
    if (!window.confirm(`Lock match for ${match.xero_name}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/lock-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: [match] })
      });
      if (res.ok) {
        handleUpload();
      } else {
        alert('Error locking match');
      }
    } catch (err) {
      console.error(err);
      alert('Error locking match');
    }
  };

  useEffect(() => {
    fetchClients();
    fetchInternalEquipment();
    fetchUnallocatedHardware();
  }, []);

  const fetchInternalEquipment = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/internal-equipment`);
      const data = await res.json();
      setInternalEquipment(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUnallocatedHardware = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/unallocated-hardware`);
      const data = await res.json();
      setUnallocatedHw(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddInternal = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/internal-equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInternal)
      });
      if (res.ok) {
        fetchInternalEquipment();
        setNewInternal({ transmitter_no: '', port_id: '', description: '', location: '', category: 'OFFICE_ALARM' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInternal = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/reconciliation/internal-equipment/${id}`, { method: 'DELETE' });
      fetchInternalEquipment();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsInternal = async (row: any) => {
    const defaultDesc = `Auto-registered from patriot row: ${row.rawRef}`;
    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/internal-equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transmitter_no: row.rawRef,
          port_id: row.detectedPort,
          description: defaultDesc,
          location: 'Unknown',
          category: 'TEST_BENCH'
        })
      });
      if (res.ok) {
        setResults((prev: any) => ({
          ...prev,
          staging_rows: prev.staging_rows.map((r: any) => 
            r.rawRef === row.rawRef 
              ? { ...r, status: 'INTERNAL_NON_BILLABLE', action: `Auto-cleared: ${defaultDesc}` }
              : r
          )
        }));
        fetchInternalEquipment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetInternal = async () => {
    if (!confirm('Are you sure you want to delete all internal equipment overrides?')) return;
    try {
      await fetch(`${API_BASE}/api/reconciliation/reset-internal`, { method: 'POST' });
      fetchInternalEquipment();
      if (patriotFile) handleUpload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnmarkInternal = async (row: any) => {
    try {
      await fetch(`${API_BASE}/api/reconciliation/unmark-internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transmitter_no: row.rawRef })
      });
      fetchInternalEquipment();
      if (patriotFile) handleUpload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (xeroFile) formData.append('xero', xeroFile);
      if (netcashFile) formData.append('netcash', netcashFile);
      if (patriotFile) formData.append('patriot', patriotFile);

      const res = await fetch(`${API_BASE}/api/reconciliation/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to process files');
      }
      const data = await res.json();
      setResults(data);
      fetchUnallocatedHardware(); // refresh unallocated list
      fetchClients(); // refresh seeded client list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openLinkModal = (row: any) => {
    setSelectedRow(row);
    setSearchQuery('');
    setModalOpen(true);
  };

  const handleLinkSecondary = async (clientId: number) => {
    if (!selectedRow) return;
    setLinking(true);
    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/link-secondary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patriot_transmitter_no: selectedRow.rawRef,
          patriot_port: selectedRow.detectedPort,
          target_client_id: clientId
        })
      });
      if (!res.ok) throw new Error('Failed to link transmitter');
      
      setResults((prev: any) => ({
        ...prev,
        staging_rows: prev.staging_rows.map((r: any) => 
          r.rawRef === selectedRow.rawRef 
            ? { ...r, status: 'COVERED_BY_PRIMARY', action: 'Linked as secondary/auxiliary' }
            : r
        )
      }));
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error linking transmitter');
    } finally {
      setLinking(false);
    }
  };

  const openSplitBillModal = (row: any) => {
    setSplitBillRow(row);
    setPartitionNo('');
    setPartitionLabel('');
    setPartitionFee('');
    setSearchQuery('');
    setSplitBillModalOpen(true);
  };

  const handleSplitBill = async (clientId: number) => {
    if (!splitBillRow) return;
    
    // We need the transmitter_id. For now, since we only have the staging row info,
    // we would ideally look it up or the backend handles it via port_id. 
    // For demonstration, let's assume we pass portId and target subclient.
    // In a full implementation, we'd fetch the exact transmitter ID.
    // Let's pass the client ID of the parent to find the transmitter, or assume 1 for mock purposes.
    const mockTransmitterId = 1; // Replace with actual lookup

    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/partition-split-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transmitter_id: mockTransmitterId,
          partition_no: partitionNo || 'P1',
          label: partitionLabel || 'Split Partition',
          billed_client_id: clientId,
          monthly_fee: parseFloat(partitionFee || '0')
        })
      });
      if (res.ok) {
        alert('Split bill partition created successfully');
        setSplitBillModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving partition split-bill');
    }
  };

  const filteredRows = results?.staging_rows?.filter((r: any) => activeTab === 'All' || r.status === activeTab) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED_BILLED': return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-bold">🟢 Matched & Billed</span>;
      case 'UNBILLED_PATRIOT': return <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-full font-bold">🔴 Unbilled Patriot</span>;
      case 'COVERED_BY_PRIMARY': return <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full font-bold">🔵 Covered by Primary</span>;
      case 'MATCHED_VIA_BODY_CORPORATE': return <span className="px-2 py-1 bg-fuchsia-500/20 text-fuchsia-400 text-xs rounded-full font-bold">🏢 Body Corporate Billed</span>;
      case 'UNLINKED_COMMERCIAL_TENANT': return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-bold">🟡 Unlinked Commercial Tenant</span>;
      case 'RADIO_SWAP': return <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full font-bold">🟡 Radio Swap</span>;
      case 'INTERNAL_NON_BILLABLE': return <span className="px-2 py-1 bg-slate-500/30 text-purple-400 text-xs rounded-full font-bold">🏢 INTERNAL</span>;
      case 'UNALLOCATED_HARDWARE': return <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full font-bold">⚠️ UNALLOCATED</span>;
      default: return <span className="px-2 py-1 bg-slate-500/10 text-slate-400 text-xs rounded-full font-bold">{status}</span>;
    }
  };

  const tabs = ['All', 'MATCHED_BILLED', 'UNBILLED_PATRIOT', 'COVERED_BY_PRIMARY', 'MATCHED_VIA_BODY_CORPORATE', 'UNLINKED_COMMERCIAL_TENANT', 'RADIO_SWAP', 'UNALLOCATED_HARDWARE', 'INTERNAL_NON_BILLABLE'];

  const formatTab = (t: string) => {
    switch(t) {
      case 'MATCHED_BILLED': return 'Matched & Billed 🟢';
      case 'UNBILLED_PATRIOT': return 'Unbilled Patriot 🔴';
      case 'COVERED_BY_PRIMARY': return 'Covered by Primary 🔵';
      case 'MATCHED_VIA_BODY_CORPORATE': return 'Body Corporate Billed 🏢';
      case 'UNLINKED_COMMERCIAL_TENANT': return 'Unlinked Commercial Tenant 🟡';
      case 'RADIO_SWAP': return 'Radio Swaps 🟡';
      case 'UNALLOCATED_HARDWARE': return 'Unallocated ⚠️';
      case 'INTERNAL_NON_BILLABLE': return 'Internal 🏢';
      default: return t;
    }
  };

  const searchFilteredClients = clients.filter(c => {
    const term = searchQuery.toLowerCase();
    return (
      (c.company_name?.toLowerCase().includes(term)) ||
      (c.surname?.toLowerCase().includes(term)) ||
      (c.first_name?.toLowerCase().includes(term)) ||
      (c.customer_no?.toLowerCase().includes(term))
    );
  }).slice(0, 15);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white m-0">Master Reconciliation Engine</h2>
          <p className="text-slate-400 text-sm m-0">Human-in-the-loop staging for discrepancy audits.</p>
        </div>
        <div className="flex gap-4">
          {unallocatedHw.length > 0 && (
            <button
              onClick={() => setUnallocatedDrawerOpen(true)}
              className="px-6 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-bold rounded-xl shadow-lg border border-orange-500/30 transition-colors"
            >
              ⚠️ Unallocated H/W ({unallocatedHw.length})
            </button>
          )}
          <button
            onClick={handleResetInternal}
            className="px-6 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold rounded-xl shadow-lg border border-rose-500/30 transition-colors"
          >
            Reset Internal Overrides
          </button>
          <button
            onClick={() => setInternalModalOpen(true)}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-lg border border-slate-700 transition-colors"
          >
            🏢 Internal Equipment
          </button>
          <button
            onClick={handleUpload}
            disabled={loading || (!xeroFile && !netcashFile && !patriotFile)}
            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Run Audit Engine'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
          <h3 className="text-white font-bold">1. Xero Export (CSV)</h3>
          <input type="file" accept=".csv" onChange={e => setXeroFile(e.target.files?.[0] || null)} className="text-sm text-slate-400 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700" />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
          <h3 className="text-white font-bold">2. Netcash Export (Excel)</h3>
          <input type="file" accept=".xlsx,.xls" onChange={e => setNetcashFile(e.target.files?.[0] || null)} className="text-sm text-slate-400 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700" />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
          <h3 className="text-white font-bold">3. Patriot Port Export (CSV)</h3>
          <input type="file" accept=".csv" onChange={e => setPatriotFile(e.target.files?.[0] || null)} className="text-sm text-slate-400 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700" />
        </div>
      </div>

      {results && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Matched & Billed</p>
              <p className="text-3xl text-emerald-400 font-bold">{results.matched_and_billed}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Unbilled Patriot</p>
              <p className="text-3xl text-rose-400 font-bold">{results.unbilled_patriot}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Missing Netcash</p>
              <p className="text-3xl text-amber-400 font-bold">{results.missing_netcash_mandates}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Radio Swaps</p>
              <p className="text-3xl text-amber-400 font-bold">{results.radio_swaps_detected}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Covered By Primary</p>
              <p className="text-3xl text-blue-400 font-bold">{results.covered_under_primary}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Internal/Auto</p>
              <p className="text-3xl text-purple-400 font-bold">{results.internal_non_billable}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Body Corporate</p>
              <p className="text-3xl text-fuchsia-400 font-bold">{results.matched_via_body_corporate}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl">
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Commercial Ten.</p>
              <p className="text-3xl text-yellow-400 font-bold">{results.unlinked_commercial_tenant}</p>
            </div>
          </div>
          {(results.seededClientCount ?? 0) > 0 && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-sm font-semibold">
              ✅ Auto-seeded <span className="text-indigo-400 font-bold">{results.seededClientCount}</span> clients from Xero/Netcash exports into the client directory.
            </div>
          )}

          {/* Xero Auto-Matching Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Xero Auto-Matching & Lock Pass</h3>
                <p className="text-sm text-slate-400">Port 11 vs Xero cross-reference</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-300 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 font-bold">
                  Accounts Locked: <span className="text-indigo-400">{results.xero_locked || 0}</span> / {results.xero_total || 0}
                </div>
                <button
                  onClick={handleBatchLock}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg text-sm transition-colors"
                >
                  Confirm & Lock Selected
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Xero Contact</th>
                    <th className="px-4 py-3">Suggested Client</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3 rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {results.xero_matches?.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-white">
                        {m.xero_name} <br/> <span className="text-xs text-slate-400 font-mono">{m.xero_reference}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {m.client_id ? (
                          <span className="text-indigo-300">{m.client_name} ({m.client_no})</span>
                        ) : (
                          <span className="text-slate-500 italic">No Port 11 match</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.match_confidence === 'MATCHED_BILLED' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-bold">🟢 {m.badge_label || 'EXACT'}</span>}
                        {m.match_confidence === 'SUGGESTED_MATCH' && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full font-bold">🟡 {m.badge_label || 'SUGGESTED'}</span>}
                        {m.match_confidence === 'UNBILLED_PATRIOT' && <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-full font-bold">🔴 NO MATCH</span>}
                      </td>
                      <td className="px-4 py-3">
                        {m.client_id && (
                          <button
                            onClick={() => handleIndividualLock(m)}
                            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/30 transition-colors"
                          >
                            Lock Match
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!results.xero_matches?.length && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500">No Xero matching data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
            <div className="flex border-b border-slate-800 bg-slate-950 flex-wrap">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === t 
                      ? 'border-indigo-500 text-indigo-400' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {formatTab(t)}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto p-4">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Client / Patriot Ref</th>
                    <th className="px-4 py-3">Matched Cust No</th>
                    <th className="px-4 py-3">Detected Port</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRows.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{r.clientName}</td>
                      <td className="px-4 py-3 font-mono">{r.customerNo || '-'}</td>
                      <td className="px-4 py-3 font-mono">{r.detectedPort}</td>
                      <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 items-start">
                          {(r.status === 'UNBILLED_PATRIOT' || r.status === 'RADIO_SWAP' || r.status === 'UNALLOCATED_HARDWARE') && (
                            <button
                              onClick={() => openLinkModal(r)}
                              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-indigo-500/30"
                            >
                              Link to Account
                            </button>
                          )}
                          {(r.status === 'UNBILLED_PATRIOT' || r.status === 'RADIO_SWAP') && (
                            <button
                              onClick={() => handleMarkAsInternal(r)}
                              className="px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/30 text-slate-400 text-xs font-bold rounded-lg transition-colors border border-slate-500/30"
                            >
                              Mark as Internal
                            </button>
                          )}
                          {(r.status === 'INTERNAL_NON_BILLABLE') && (
                            <button
                              onClick={() => handleUnmarkInternal(r)}
                              className="px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/30 text-slate-400 text-xs font-bold rounded-lg transition-colors border border-slate-500/30"
                            >
                              Unmark / Revert
                            </button>
                          )}
                          {(r.status === 'MATCHED_BILLED' || r.status === 'COVERED_BY_PRIMARY') && (
                            <button
                              onClick={() => openSplitBillModal(r)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-colors border border-emerald-500/30"
                            >
                              Partition Split-Bill
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500">No records found for this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Internal Equipment Modal Drawer */}
      {internalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setInternalModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">🏢 Internal Equipment Register</h3>
                <p className="text-sm text-slate-400">Manage internal transmitters to prevent false billing alerts.</p>
              </div>
              <button onClick={() => setInternalModalOpen(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800 h-fit">
                <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">Add New Equipment</h4>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Transmitter No.</label>
                  <input type="text" value={newInternal.transmitter_no} onChange={e => setNewInternal({...newInternal, transmitter_no: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 33000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Port ID (Optional)</label>
                  <input type="text" value={newInternal.port_id} onChange={e => setNewInternal({...newInternal, port_id: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. 11" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Description</label>
                  <input type="text" value={newInternal.description} onChange={e => setNewInternal({...newInternal, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. Dispatch Panic" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Location</label>
                  <input type="text" value={newInternal.location} onChange={e => setNewInternal({...newInternal, location: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. HQ" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Category</label>
                  <select value={newInternal.category} onChange={e => setNewInternal({...newInternal, category: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="OFFICE_ALARM">Office Alarm</option>
                    <option value="DISPATCH_PANIC">Dispatch Panic</option>
                    <option value="REPEATER_TELEMETRY">Repeater Telemetry</option>
                    <option value="TEST_BENCH">Test Bench</option>
                  </select>
                </div>
                <button
                  onClick={handleAddInternal}
                  disabled={!newInternal.transmitter_no || !newInternal.description}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                >
                  Register Equipment
                </button>
              </div>

              <div className="lg:col-span-2 border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Tx / Port</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {internalEquipment.map(eq => (
                      <tr key={eq.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono text-indigo-400">{eq.transmitter_no} {eq.port_id ? `/ ${eq.port_id}` : ''}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{eq.description}</p>
                          <p className="text-xs text-slate-500">{eq.location}</p>
                        </td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">{eq.category}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDeleteInternal(eq.id)} className="text-rose-400 hover:text-rose-300 text-xs font-bold">Remove</button>
                        </td>
                      </tr>
                    ))}
                    {internalEquipment.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-500">No internal equipment registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unallocated Hardware Drawer */}
      {unallocatedDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-0">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setUnallocatedDrawerOpen(false)}></div>
          <div className="relative bg-slate-900 border-l border-slate-700 w-full max-w-md h-full shadow-2xl overflow-y-auto animate-slideInRight">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">⚠️ Unallocated H/W</h3>
                <p className="text-sm text-slate-400">Physical transmitters without clients.</p>
              </div>
              <button onClick={() => setUnallocatedDrawerOpen(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="p-4 space-y-4">
              {unallocatedHw.map(hw => (
                <div key={hw.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-mono text-orange-400 font-bold">{hw.client_no}</p>
                      <p className="text-xs text-slate-400">Port: {hw.port_id} | Base Tx: {hw.base_tx}</p>
                    </div>
                    <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-[10px] rounded uppercase font-bold">{hw.status}</span>
                  </div>
                  <p className="text-sm text-white mb-4">Detected as: {hw.ext_ref}</p>
                  <button
                    onClick={() => {
                      setUnallocatedDrawerOpen(false);
                      openLinkModal({ detectedPort: hw.port_id, customerNo: hw.client_no });
                    }}
                    className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-bold rounded-lg border border-indigo-500/30 transition-colors"
                  >
                    Assign Client to Hardware
                  </button>
                </div>
              ))}
              {unallocatedHw.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-8">No unallocated hardware detected.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick-Link Modal Drawer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Assign Target Client</h3>
                <p className="text-sm text-slate-400">Hardware Port: <span className="font-mono text-indigo-400">{selectedRow?.detectedPort}</span></p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Search clients by name or SAFE num..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchFilteredClients.map(c => {
                  const partitions = c.sites?.[0]?.transmitters?.flatMap((t: any) => t.partitions || []) || [];
                  return (
                    <div key={c.id} className="flex flex-col bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors overflow-hidden mb-2">
                      <div className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-bold text-white text-sm">{c.company_name || `${c.first_name} ${c.surname}`}</p>
                          <p className="font-mono text-xs text-indigo-400">{c.customer_no}</p>
                          {partitions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {partitions.map((p: any) => (
                                <span key={p.id} className="text-[9px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                  [P{p.partition_no}]
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {partitions.length >= 2 && (
                            <button
                              onClick={() => toggleExpand(c.id)}
                              className="px-2 py-1 text-[10px] bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded font-bold transition-all"
                            >
                              {expandedClientIds.includes(c.id) ? 'Hide' : `Review Partitions (${partitions.length})`}
                            </button>
                          )}
                          <button
                            onClick={() => handleLinkSecondary(c.id)}
                            disabled={linking}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg"
                          >
                            {linking ? '...' : 'Assign'}
                          </button>
                        </div>
                      </div>
                      {expandedClientIds.includes(c.id) && partitions.length > 0 && (
                        <div className="bg-slate-900/50 p-2 border-t border-slate-700/50 flex flex-col gap-1">
                          {partitions.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between bg-slate-800 px-2 py-1.5 rounded">
                              <span className="text-xs text-slate-300">P{p.partition_no} - {p.label || 'No label'}</span>
                              {!p.billed_client_id && (
                                <button
                                  onClick={() => handleSplitTenant(p.id)}
                                  className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-2 py-1 rounded font-bold transition-all"
                                >
                                  Split Tenant
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {searchFilteredClients.length === 0 && searchQuery && (
                  <p className="text-center text-sm text-slate-500 py-4">No clients found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Bill Modal Drawer */}
      {splitBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSplitBillModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Partition Split-Billing</h3>
                <p className="text-sm text-slate-400">Tx: <span className="font-mono text-indigo-400">{splitBillRow?.detectedPort}</span></p>
              </div>
              <button onClick={() => setSplitBillModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Partition No</label>
                  <input type="text" value={partitionNo} onChange={e => setPartitionNo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. P1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Monthly Fee</label>
                  <input type="number" step="0.01" value={partitionFee} onChange={e => setPartitionFee(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Partition Label / Area</label>
                <input type="text" value={partitionLabel} onChange={e => setPartitionLabel(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="e.g. Unit 3 - Salon" />
              </div>

              <div className="border-t border-slate-800 pt-4 mt-2">
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Select Target Sub-Client to Bill</label>
                <input
                  type="text"
                  placeholder="Search sub-clients..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 mb-2 text-sm"
                />
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {searchFilteredClients.map(c => {
                    const partitions = c.sites?.[0]?.transmitters?.flatMap((t: any) => t.partitions || []) || [];
                    return (
                      <div key={c.id} className="flex flex-col bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors overflow-hidden mb-2">
                        <div className="flex items-center justify-between p-2">
                          <div>
                            <p className="font-bold text-white text-sm">{c.company_name || `${c.first_name} ${c.surname}`}</p>
                            <p className="font-mono text-xs text-emerald-400">{c.customer_no}</p>
                            {partitions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {partitions.map((p: any) => (
                                  <span key={p.id} className="text-[9px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                    [P{p.partition_no}]
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {partitions.length >= 2 && (
                              <button
                                onClick={() => toggleExpand(c.id)}
                                className="px-2 py-1 text-[10px] bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded font-bold transition-all"
                              >
                                {expandedClientIds.includes(c.id) ? 'Hide' : `Review Partitions (${partitions.length})`}
                              </button>
                            )}
                            <button
                              onClick={() => handleSplitBill(c.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg"
                            >
                              Bill to Account
                            </button>
                          </div>
                        </div>
                        {expandedClientIds.includes(c.id) && partitions.length > 0 && (
                          <div className="bg-slate-900/50 p-2 border-t border-slate-700/50 flex flex-col gap-1">
                            {partitions.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between bg-slate-800 px-2 py-1.5 rounded">
                                <span className="text-xs text-slate-300">P{p.partition_no} - {p.label || 'No label'}</span>
                                {!p.billed_client_id && (
                                  <button
                                    onClick={() => handleSplitTenant(p.id)}
                                    className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-2 py-1 rounded font-bold transition-all"
                                  >
                                    Split Tenant
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
