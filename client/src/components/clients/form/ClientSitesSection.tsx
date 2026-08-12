// Section 2: Site Details — address, location lookups, access/keys, transmitters, CCTV

import type { LookupItem } from './types';

interface ClientSitesSectionProps {
  // Location lookups
  towns: LookupItem[];
  suburbs: LookupItem[];
  sectors: LookupItem[];
  estates: LookupItem[];
  streets: LookupItem[];
  // Site fields
  siteName: string;
  setSiteName: (v: string) => void;
  streetNumber: string;
  setStreetNumber: (v: string) => void;
  unitNumber: string;
  setUnitNumber: (v: string) => void;
  streetName: string;
  setStreetName: (v: string) => void;
  streetId: string | number;
  setStreetId: (v: string | number) => void;
  townId: string | number;
  setTownId: (v: string | number) => void;
  townName: string;
  setTownName: (v: string) => void;
  suburbId: string | number;
  setSuburbId: (v: string | number) => void;
  suburbName: string;
  setSuburbName: (v: string) => void;
  sectorId: string | number;
  setSectorId: (v: string) => void;
  estateId: string | number;
  setEstateId: (v: string) => void;
  sitePhone: string;
  setSitePhone: (v: string) => void;
  // Removed transmitters section
  // CCTV & access
  cctvCameraCount: number;
  setCctvCameraCount: (v: number) => void;
  annualMaintenanceFee: number;
  setAnnualMaintenanceFee: (v: number) => void;
  accessType: string;
  setAccessType: (v: string) => void;
  keyNumberRef: string;
  setKeyNumberRef: (v: string) => void;
  keyVaultLocation: string;
  setKeyVaultLocation: (v: string) => void;
  accessCodeNotes: string;
  setAccessCodeNotes: (v: string) => void;
  siteOperationsNotes: string;
  setSiteOperationsNotes: (v: string) => void;
}

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2';

export default function ClientSitesSection({
  towns, suburbs, sectors, estates, streets,
  siteName, setSiteName,
  streetNumber, setStreetNumber,
  unitNumber, setUnitNumber,
  streetName, setStreetName,
  setStreetId,
  townId, setTownId,
  townName, setTownName,
  suburbId, setSuburbId,
  suburbName, setSuburbName,
  sectorId, setSectorId,
  estateId, setEstateId,
  sitePhone, setSitePhone,
  // Removed transmitters
  cctvCameraCount, setCctvCameraCount,
  annualMaintenanceFee, setAnnualMaintenanceFee,
  accessType, setAccessType,
  keyNumberRef, setKeyNumberRef,
  keyVaultLocation, setKeyVaultLocation,
  accessCodeNotes, setAccessCodeNotes,
  siteOperationsNotes, setSiteOperationsNotes,
}: ClientSitesSectionProps) {
  const selectCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none';
  const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none';

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">2. Site Details</h3>

      {/* Site name & phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelCls}>Site Name</label>
          <input type="text" value={siteName} onChange={e => setSiteName(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Active Site Telephone</label>
          <input type="text" value={sitePhone} onChange={e => setSitePhone(e.target.value)} className={inputCls} placeholder="e.g. +27 28 312 0000" />
        </div>
      </div>

      {/* Row 2: Location dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className={labelCls}>Town</label>
          <input 
            type="text"
            list="towns-list"
            value={townName} 
            onChange={e => {
              const val = e.target.value;
              setTownName(val);
              const matched = towns.find(t => t.name.toLowerCase() === val.toLowerCase());
              setTownId(matched ? matched.id : '');
              setSuburbId('');
              setSuburbName('');
              setEstateId('');
              setStreetName('');
              setStreetId('');
            }} 
            className={inputCls}
            placeholder="Type or select town..."
          />
          <datalist id="towns-list">
            {towns.map(t => <option key={t.id} value={t.name} />)}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Suburb</label>
          <input 
            type="text"
            list="suburbs-list"
            value={suburbName} 
            onChange={e => {
              const val = e.target.value;
              setSuburbName(val);
              const matched = suburbs.find(s => s.name.toLowerCase() === val.toLowerCase());
              if (matched) {
                setSuburbId(matched.id);
              } else {
                setSuburbId('');
              }
              setEstateId('');
              setStreetName('');
              setStreetId('');
            }} 
            className={inputCls}
            placeholder="Type or select suburb..."
            disabled={!townId}
          />
          <datalist id="suburbs-list">
            {suburbs.map(s => <option key={s.id} value={s.name} />)}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Sector</label>
          <select value={sectorId} onChange={e => setSectorId(e.target.value)} className={selectCls}>
            <option value="">Select Sector</option>
            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Estate (Optional)</label>
          <select 
            value={estateId} 
            onChange={e => setEstateId(e.target.value)} 
            className={selectCls}
            disabled={!suburbId}
          >
            <option value="">Select Estate</option>
            {estates.map(es => <option key={es.id} value={es.id}>{es.name}</option>)}
          </select>
        </div>
      </div>

      {/* Row 3: Dynamic Address Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {estateId ? (
          <>
            <div>
              <label className={labelCls}>Unit / Stand Number</label>
              <input
                type="text"
                value={unitNumber}
                onChange={e => setUnitNumber(e.target.value)}
                className={inputCls}
                placeholder="e.g. Unit 21, Villa 5"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Street Name (Inside Estate)</label>
              <input
                type="text"
                list="streets-list"
                value={streetName}
                onChange={e => {
                  const val = e.target.value;
                  setStreetName(val);
                  const matched = streets.find(s => s.name === val);
                  setStreetId(matched ? matched.id : '');
                }}
                className={inputCls}
                placeholder="e.g. Main Estate Ave"
              />
              <datalist id="streets-list">
                {streets.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={labelCls}>Street Number</label>
              <input
                type="text"
                value={streetNumber}
                onChange={e => setStreetNumber(e.target.value)}
                className={inputCls}
                placeholder="e.g. 21, 104B"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Street Name</label>
              <input
                type="text"
                list="streets-list"
                value={streetName}
                onChange={e => {
                  const val = e.target.value;
                  setStreetName(val);
                  const matched = streets.find(s => s.name === val);
                  setStreetId(matched ? matched.id : '');
                }}
                className={inputCls}
                placeholder="e.g. Main Road"
                required
              />
              <datalist id="streets-list">
                {streets.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
          </>
        )}
      </div>

      {/* Keys & Access Notes */}
      <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 space-y-6">
        <h4 className="text-sm font-bold text-indigo-400">Keys & Access Notes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Access Type</label>
            <select value={accessType} onChange={e => setAccessType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none">
              <option value="NONE">None</option>
              <option value="PHYSICAL_KEY">Physical Key Only</option>
              <option value="ACCESS_CODE">Access Code Only</option>
              <option value="KEYPAD_BIOMETRIC">Keypad / Biometric</option>
              <option value="BOTH_KEY_AND_CODE">Both Key and Code</option>
              <option value="RESPONSE_PROPERTY_ACCESS">Response Property Access</option>
            </select>
          </div>
          {['PHYSICAL_KEY', 'BOTH_KEY_AND_CODE'].includes(accessType) && (
            <div className="grid grid-cols-2 gap-4 animate-fadeIn">
              <div>
                <label className={labelCls}>Key Tag # / Ref <span className="text-rose-400">*</span></label>
                <input type="text" placeholder="e.g. K-402" value={keyNumberRef} onChange={e => setKeyNumberRef(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" required />
              </div>
              <div>
                <label className={labelCls}>Vault Location</label>
                <input type="text" value={keyVaultLocation} onChange={e => setKeyVaultLocation(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Access & Gate/Alarm Codes (Notes)</label>
            <input type="text" placeholder="Secure access protocols and codes" value={accessCodeNotes} onChange={e => setAccessCodeNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none" />
          </div>
          <div>
            <label className={labelCls}>Special Site Operations / Guard Notes</label>
            <textarea placeholder="Vicious dogs, gate codes, backup protocols..." value={siteOperationsNotes} onChange={e => setSiteOperationsNotes(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 text-sm focus:outline-none" />
          </div>
        </div>
      </div>

      {/* CCTV & Maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-slate-950/60 border border-slate-800">
        <div>
          <label className={labelCls}>CCTV Cameras Count</label>
          <input type="number" min="0" value={cctvCameraCount} onChange={e => setCctvCameraCount(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none" />
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Tiered: R250 base + R150/extra</p>
        </div>
        <div>
          <label className={labelCls}>Annual Maintenance Fee (R)</label>
          <input type="number" min="0" value={annualMaintenanceFee} onChange={e => setAnnualMaintenanceFee(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none" />
        </div>
      </div>
    </section>
  );
}
