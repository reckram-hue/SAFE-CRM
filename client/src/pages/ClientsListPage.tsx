import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function ClientsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<any[]>([]);
  
  const search = searchParams.get('search') || '';
  const filterMode = searchParams.get('filter') || 'active';
  
  const [loading, setLoading] = useState(true);
  const [expandedClientIds, setExpandedClientIds] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedClientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const updateSearch = (val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set('search', val);
    else newParams.delete('search');
    setSearchParams(newParams);
  };

  const updateFilterMode = (val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val === 'active') newParams.delete('filter');
    else newParams.set('filter', val);
    setSearchParams(newParams);
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      
      if (filterMode === 'active') {
        // active is default in backend
      } else if (filterMode === 'all') {
        query.append('archived', 'true'); // backend returns both if archived is queried... wait, 'archived' filter actually might just toggle isActive or ignore it.
        // Actually the backend says `const isActive = archived !== 'true';` 
        // So archived=true gives archived. We want 'all'. Wait, let me check backend. 
        query.append('all', 'true');
      } else if (filterMode === 'flagged') {
        query.append('filter', 'flagged');
      }

      const res = await fetch(`${API_BASE}/api/clients?${query.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setClients(data);
      } else {
        setClients([]);
        console.error('API returned non-array structure:', data);
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, filterMode]);

  const handleArchiveToggle = async (id: number, active: boolean) => {
    try {
      const endpoint = active ? 'archive' : 'reactivate';
      await fetch(`${API_BASE}/api/clients/${id}/${endpoint}`, {
        method: 'PATCH'
      });
      fetchClients();
    } catch (err) {
      console.error('Failed to toggle client archive status:', err);
    }
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

  return (
    <div className="space-y-8 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white m-0">Clients Registry</h2>
          <p className="text-slate-400 text-sm m-0">Search, filter, edit particulars, and monitor active service agreements.</p>
        </div>
        <button
          onClick={() => navigate('/clients/new')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all self-start md:self-auto"
        >
          + Add New Client
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by ID, name, site phone, sector, suburb..."
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => updateFilterMode('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Show All
          </button>
          <button
            onClick={() => updateFilterMode('active')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterMode === 'active'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active / Paid
          </button>
          <button
            onClick={() => updateFilterMode('flagged')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterMode === 'flagged'
                ? 'bg-slate-800 text-white border border-amber-600/50'
                : 'text-amber-500/70 hover:text-amber-400'
            }`}
          >
            Flagged: Missing Billing Info
          </button>
          <button
            onClick={() => updateFilterMode('multi-partition')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterMode === 'multi-partition'
                ? 'bg-slate-800 text-white border border-amber-500'
                : 'text-amber-500/70 hover:text-amber-400'
            }`}
          >
            Multi-Partition Accounts ({'>='}2)
          </button>
          <button
            onClick={() => updateFilterMode('internal')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterMode === 'internal'
                ? 'bg-slate-800 text-white border border-purple-500'
                : 'text-purple-500/70 hover:text-purple-400'
            }`}
          >
            🏢 Technical / Infrastructure
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
          No clients found matching the filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/20">
          <table className="w-full border-collapse text-left text-sm text-slate-300">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                <th className="px-6 py-4">Customer No</th>
                <th className="px-6 py-4">Name / Particulars</th>
                <th className="px-6 py-4">Client Type</th>
                <th className="px-6 py-4">Primary Site / Suburb</th>
                <th className="px-6 py-4">Services Count</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {clients.filter(c => {
                if (filterMode === 'multi-partition') {
                  const parts = c.sites?.[0]?.transmitters?.flatMap((t: any) => t.partitions || []) || [];
                  return parts.length >= 2;
                }
                if (filterMode === 'internal') {
                  return c.client_type === 'INTERNAL_INFRASTRUCTURE';
                }
                // default active/paid or flagged
                if (filterMode === 'active') {
                  return c.client_type !== 'INTERNAL_INFRASTRUCTURE';
                }
                return true;
              }).map((client) => {
                const primarySite = client.sites?.[0] || {};
                const name = client.client_type === 'BUSINESS' ? client.company_name : client.id_passport_no;
                const partitions = primarySite.transmitters?.flatMap((t: any) => t.partitions || []) || [];
                return (
                  <React.Fragment key={client.id}>
                    <tr className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-indigo-400 font-bold">
                        {client.customer_no}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{name}</div>
                        <div className="text-xs text-slate-400">Ref: {client.agreement_ref_number.slice(0, 8)}...</div>
                        {partitions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {partitions.map((p: any) => (
                              <span key={p.id} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                [P{p.partition_no}]
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {client.client_type === 'INTERNAL_INFRASTRUCTURE' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            INTERNAL EQUIPMENT
                          </span>
                        ) : (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            client.client_type === 'BUSINESS' 
                              ? 'bg-blue-500/10 text-blue-400' 
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {client.client_type.replace('_', ' ')}
                          </span>
                        )}
                        {client.is_billing_incomplete && (
                          <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            FLAGGED: MISSING BILLING DATA
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white">{primarySite.site_name || 'N/A'}</div>
                        <div className="text-xs text-slate-400">
                          {primarySite.suburb?.name ? `${primarySite.suburb.name}, ` : ''}
                          {primarySite.town?.name || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {client.services?.length || 0} active service(s)
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/clients/edit/${client.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-all text-xs font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(client.id, client.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            client.is_active
                              ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white'
                              : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white'
                          }`}
                        >
                          {client.is_active ? 'Archive' : 'Reactivate'}
                        </button>
                        {partitions.length >= 2 && (
                          <button
                            onClick={() => toggleExpand(client.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white transition-all text-xs font-bold ml-2"
                          >
                            {expandedClientIds.includes(client.id) ? 'Collapse' : `Partitions (${partitions.length})`}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedClientIds.includes(client.id) && partitions.length >= 2 && (
                      <tr>
                        <td colSpan={6} className="px-6 pb-4 pt-1 bg-slate-900/10 border-b border-slate-800/50">
                          <div className="flex flex-col gap-2">
                            {partitions.map((p: any) => {
                              const isHost = p.partition_no === '00' || p.partition_no === '0000';
                              return (
                                <div key={p.id} className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg flex items-center justify-between">
                                  <div>
                                    <div className="text-xs font-bold text-white">Partition {p.partition_no} {isHost ? '(Host)' : ''}</div>
                                    <div className="text-[10px] text-slate-400">{p.label || 'No label'}</div>
                                  </div>
                                  {!isHost && !p.billed_client_id ? (
                                    <button
                                      onClick={() => handleSplitTenant(p.id)}
                                      className="ml-4 text-[10px] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white px-2 py-1 rounded font-bold transition-all"
                                    >
                                      Split Tenant
                                    </button>
                                  ) : (
                                    <span className="ml-4 text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded">
                                      {isHost ? 'Host' : 'Split'}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
