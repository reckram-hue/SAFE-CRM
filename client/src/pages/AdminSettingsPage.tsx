import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE } from '../config/api';

const TABS = [
  { id: 'hardware', label: 'Hardware & Alarms' },
  { id: 'geo', label: 'Geographic & Address' },
  { id: 'billing', label: 'Billing & Services' }
];

interface SettingsItem {
  id: number;
  name?: string;
  label?: string;
  is_active: boolean;
  base_fee?: number;
  models?: any[];
}

export default function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'hardware';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const [loading, setLoading] = useState(false);
  const [activeAlarmMakeId, setActiveAlarmMakeId] = useState<number | null>(null);
  const [activeTownId, setActiveTownId] = useState<number | null>(null);
  const [activeSuburbId, setActiveSuburbId] = useState<number | null>(null);

  // States for each category
  const [alarmMakes, setAlarmMakes] = useState<SettingsItem[]>([]);
  const [zoneTypes, setZoneTypes] = useState<SettingsItem[]>([]);
  const [zoneDescriptors, setZoneDescriptors] = useState<SettingsItem[]>([]);
  const [towns, setTowns] = useState<SettingsItem[]>([]);
  const [suburbs, setSuburbs] = useState<SettingsItem[]>([]);
  const [estates, setEstates] = useState<SettingsItem[]>([]);
  const [streets, setStreets] = useState<SettingsItem[]>([]);
  const [billingCycles, setBillingCycles] = useState<SettingsItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SettingsItem[]>([]);
  const [services, setServices] = useState<SettingsItem[]>([]);
  
  // States for forms
  const [newItemName, setNewItemName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newSuburbName, setNewSuburbName] = useState('');
  const [newStreetName, setNewStreetName] = useState('');
  const [newEstateName, setNewEstateName] = useState('');
  const [newFee, setNewFee] = useState('');

  const fetchCategory = async (category: string, setter: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/${category}`, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) setter(data.filter((i: any) => i.is_active));
    } catch (err) {
      console.error(`Failed to fetch ${category}:`, err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCategory('alarm-models', setAlarmMakes),
      fetchCategory('zone-types', setZoneTypes),
      fetchCategory('zone-descriptors', setZoneDescriptors),
      fetchCategory('towns', setTowns),
      fetchCategory('suburbs', setSuburbs),
      fetchCategory('estates', setEstates),
      fetchCategory('streets', setStreets),
      fetchCategory('billing-cycles', setBillingCycles),
      fetchCategory('payment-methods', setPaymentMethods),
      fetchCategory('services', setServices),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = async (category: string, refetchSetter: any) => {
    if (!newItemName) return;
    try {
      const body: any = { name: newItemName, label: newItemName };
      if (category === 'services' && newFee) {
        body.base_fee = parseFloat(newFee);
      }
      const res = await fetch(`${API_BASE}/api/settings/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setNewItemName('');
        setNewFee('');
        await fetchCategory(category, refetchSetter);
      }
    } catch (err) {
      console.error(`Failed to add item to ${category}`, err);
    }
  };

  const handleDeleteItem = async (category: string, id: number, refetchSetter: any) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/settings/${category}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // fetchCategory requires the category name used in the endpoint
        const fetchCat = category === 'alarm-makes' ? 'alarm-models' : category;
        await fetchCategory(fetchCat, refetchSetter);
      }
    } catch (err) {
      console.error(`Failed to delete item from ${category}`, err);
    }
  };

  const handleAddModel = async (makeId: number) => {
    if (!newModelName) return;
    try {
      const body = { name: newModelName, makeId };
      const res = await fetch(`${API_BASE}/api/settings/alarm-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setNewModelName('');
        await fetchCategory('alarm-models', setAlarmMakes);
      }
    } catch (err) {
      console.error('Failed to add model:', err);
    }
  };

  const handleDeleteModel = async (modelId: number) => {
    if (!confirm('Are you sure you want to remove this model?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/settings/alarm-models/${modelId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchCategory('alarm-models', setAlarmMakes);
      }
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const handleAddSuburb = async () => {
    if (!newSuburbName || !activeTownId) return;
    try {
      const body = { name: newSuburbName, town_id: activeTownId };
      const res = await fetch(`${API_BASE}/api/settings/suburbs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setNewSuburbName('');
        await fetchCategory('suburbs', setSuburbs);
      }
    } catch (err) {
      console.error('Failed to add suburb:', err);
    }
  };

  const handleAddStreet = async () => {
    if (!newStreetName || !activeSuburbId) return;
    try {
      const body = { name: newStreetName, suburb_id: activeSuburbId };
      const res = await fetch(`${API_BASE}/api/settings/streets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setNewStreetName('');
        await fetchCategory('streets', setStreets);
      }
    } catch (err) {
      console.error('Failed to add street:', err);
    }
  };

  const handleAddEstate = async () => {
    if (!newEstateName || !activeSuburbId) return;
    try {
      const body = { name: newEstateName, suburb_id: activeSuburbId };
      const res = await fetch(`${API_BASE}/api/settings/estates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setNewEstateName('');
        await fetchCategory('estates', setEstates);
      }
    } catch (err) {
      console.error('Failed to add estate:', err);
    }
  };

  const renderAlarmMakesSection = () => (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Alarm Makes & Models</h3>
      <div className="space-y-4 mb-6">
        {alarmMakes.map(make => (
          <div key={make.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 transition-colors">
            <div 
              className="flex items-center justify-between cursor-pointer" 
              onClick={() => setActiveAlarmMakeId(activeAlarmMakeId === make.id ? null : make.id)}
            >
              <div className="flex items-center gap-3">
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${activeAlarmMakeId === make.id ? 'rotate-90' : ''}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-200 font-bold text-lg">{make.name || make.label}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteItem('alarm-makes', make.id, setAlarmMakes); }}
                className="text-xs text-rose-500 hover:text-rose-400 font-bold px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
              >
                Remove Make
              </button>
            </div>
            
            {activeAlarmMakeId === make.id && (
              <div className="mt-4 pl-8 pr-2 border-t border-slate-800/50 pt-4 space-y-3">
                {make.models?.filter((m: any) => m.is_active).map((model: any) => (
                  <div key={model.id} className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/50">
                    <span className="text-sm text-slate-300 font-medium">{model.name}</span>
                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      className="text-xs text-rose-500 hover:text-rose-400 font-semibold px-2 py-1 rounded bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(!make.models || make.models.filter((m: any) => m.is_active).length === 0) && (
                  <div className="text-xs text-slate-500 italic pb-2">No models mapped to this make.</div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="New Model Name (e.g. MG5050)"
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => handleAddModel(make.id)}
                    disabled={!newModelName}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    Add Model
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {alarmMakes.length === 0 && (
          <div className="text-slate-500 italic text-sm text-center p-4">No makes found.</div>
        )}
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="New Alarm Make"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => handleAddItem('alarm-makes', setAlarmMakes)}
          disabled={!newItemName}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          Add Make
        </button>
      </div>
    </div>
  );

  const renderSection = (title: string, category: string, items: SettingsItem[], setter: any, hasFee: boolean = false) => (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="space-y-3 mb-6">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-200 font-medium">{item.name || item.label}</span>
              {hasFee && item.base_fee !== undefined && (
                <span className="ml-2 text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-1 rounded-md">R {item.base_fee.toFixed(2)}</span>
              )}
            </div>
            <button
              onClick={() => handleDeleteItem(category, item.id, setter)}
              className="text-xs text-rose-500 hover:text-rose-400 font-bold px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-slate-500 italic text-sm text-center p-4">No items found.</div>
        )}
      </div>
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="New Item Name"
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        />
        {hasFee && (
          <input
            type="number"
            placeholder="Base Fee (R)"
            value={newFee}
            onChange={e => setNewFee(e.target.value)}
            className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        )}
        <button
          onClick={() => handleAddItem(category, setter)}
          disabled={!newItemName}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );

  const renderGeographicSection = () => {
    const activeSuburbs = suburbs.filter((s: any) => s.town_id === activeTownId);
    const activeStreets = streets.filter((s: any) => s.suburb_id === activeSuburbId);
    const activeEstates = estates.filter((e: any) => e.suburb_id === activeSuburbId);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in col-span-1 md:col-span-2">
        {/* Column 1: Towns */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-[600px]">
          <h3 className="text-xl font-bold text-white mb-4">1. Towns</h3>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
            {towns.map(town => (
              <div 
                key={town.id} 
                onClick={() => {
                  setActiveTownId(town.id);
                  setActiveSuburbId(null); // Reset child
                }}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  activeTownId === town.id 
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className={`font-bold ${activeTownId === town.id ? 'text-indigo-400' : 'text-slate-300'}`}>
                  {town.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteItem('towns', town.id, setTowns); }}
                  className="text-xs text-rose-500 hover:text-rose-400 font-bold px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t border-slate-800">
            <input
              type="text"
              placeholder="New Town Name"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => handleAddItem('towns', setTowns)}
              disabled={!newItemName}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Column 2: Suburbs */}
        <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-[600px] transition-opacity duration-300 ${!activeTownId ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="text-xl font-bold text-white mb-4">2. Suburbs</h3>
          {!activeTownId ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm">
              Select a town to view suburbs.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
                {activeSuburbs.map(suburb => (
                  <div 
                    key={suburb.id} 
                    onClick={() => setActiveSuburbId(suburb.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      activeSuburbId === suburb.id 
                        ? 'bg-violet-600/20 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className={`font-bold ${activeSuburbId === suburb.id ? 'text-violet-400' : 'text-slate-300'}`}>
                      {suburb.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem('suburbs', suburb.id, setSuburbs); }}
                      className="text-xs text-rose-500 hover:text-rose-400 font-bold px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {activeSuburbs.length === 0 && (
                  <div className="text-slate-500 italic text-sm text-center pt-4">No suburbs found for this town.</div>
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="New Suburb Name"
                  value={newSuburbName}
                  onChange={e => setNewSuburbName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleAddSuburb}
                  disabled={!newSuburbName}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        {/* Column 3: Streets & Estates */}
        <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col h-[600px] transition-opacity duration-300 ${!activeSuburbId ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="text-xl font-bold text-white mb-4">3. Streets & Estates</h3>
          {!activeSuburbId ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm">
              Select a suburb to view streets & estates.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-6 mb-4 pr-2 custom-scrollbar">
                
                {/* Streets Sub-section */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Streets</h4>
                  <div className="space-y-2">
                    {activeStreets.map(street => (
                      <div key={street.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-sm text-slate-300 font-medium">{street.name}</span>
                        <button
                          onClick={() => handleDeleteItem('streets', street.id, setStreets)}
                          className="text-xs text-rose-500 hover:text-rose-400 font-semibold px-2 py-1 rounded bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {activeStreets.length === 0 && <div className="text-slate-500 italic text-xs">No streets mapped.</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="New Street Name"
                      value={newStreetName}
                      onChange={e => setNewStreetName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500"
                    />
                    <button
                      onClick={handleAddStreet}
                      disabled={!newStreetName}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                    >
                      Add Street
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-800/50"></div>

                {/* Estates Sub-section */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Estates</h4>
                  <div className="space-y-2">
                    {activeEstates.map(estate => (
                      <div key={estate.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-sm text-slate-300 font-medium">{estate.name}</span>
                        <button
                          onClick={() => handleDeleteItem('estates', estate.id, setEstates)}
                          className="text-xs text-rose-500 hover:text-rose-400 font-semibold px-2 py-1 rounded bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {activeEstates.length === 0 && <div className="text-slate-500 italic text-xs">No estates mapped.</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="New Estate Name"
                      value={newEstateName}
                      onChange={e => setNewEstateName(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500"
                    />
                    <button
                      onClick={handleAddEstate}
                      disabled={!newEstateName}
                      className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                    >
                      Add Estate
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Centralized Settings</h1>
        <p className="text-slate-400 font-medium">Manage master lookup data and configurations across SafeCRM.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-900/40 p-2 rounded-2xl border border-slate-800 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {activeTab === 'hardware' && (
              <>
                {renderAlarmMakesSection()}
                {renderSection('Zone Types', 'zone-types', zoneTypes, setZoneTypes)}
                {renderSection('Zone Descriptors', 'zone-descriptors', zoneDescriptors, setZoneDescriptors)}
              </>
            )}
            
            {activeTab === 'geo' && (
              <>
                {renderGeographicSection()}
              </>
            )}

            {activeTab === 'billing' && (
              <>
                {renderSection('Payment Methods', 'payment-methods', paymentMethods, setPaymentMethods)}
                {renderSection('Billing Cycles', 'billing-cycles', billingCycles, setBillingCycles)}
                {renderSection('Service Tariffs', 'services', services, setServices, true)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
