

export interface TransmitterHistory {
  id: number;
  role: string;
  transmitter_no: string;
  port_id?: string | null;
  status: string;
  assigned_at: string;
  retired_at?: string | null;
  replacement_note?: string | null;
}

interface ClientHardwareSectionProps {
  primaryTransmitterNo: string;
  setPrimaryTransmitterNo: (v: string) => void;
  primaryPortId: string;
  setPrimaryPortId: (v: string) => void;
  primaryIsBillableMonthly: boolean;
  setPrimaryIsBillableMonthly: (v: boolean) => void;
  primaryMonthlyFee: string;
  setPrimaryMonthlyFee: (v: string) => void;
  primaryHasAnnualLicenseFee: boolean;
  setPrimaryHasAnnualLicenseFee: (v: boolean) => void;
  primaryHasAnnualGsmFee: boolean;
  setPrimaryHasAnnualGsmFee: (v: boolean) => void;
  
  secondaryTransmitterNo: string;
  setSecondaryTransmitterNo: (v: string) => void;
  secondaryPortId: string;
  setSecondaryPortId: (v: string) => void;
  secondaryIsBillableMonthly: boolean;
  setSecondaryIsBillableMonthly: (v: boolean) => void;
  secondaryMonthlyFee: string;
  setSecondaryMonthlyFee: (v: string) => void;
  secondaryHasAnnualLicenseFee: boolean;
  setSecondaryHasAnnualLicenseFee: (v: boolean) => void;
  secondaryHasAnnualGsmFee: boolean;
  setSecondaryHasAnnualGsmFee: (v: boolean) => void;
  
  transmitterHistory: TransmitterHistory[];
}

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2';
const inputCls = 'w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none';

export default function ClientHardwareSection({
  primaryTransmitterNo, setPrimaryTransmitterNo,
  primaryPortId, setPrimaryPortId,
  primaryIsBillableMonthly, setPrimaryIsBillableMonthly,
  primaryMonthlyFee, setPrimaryMonthlyFee,
  primaryHasAnnualLicenseFee, setPrimaryHasAnnualLicenseFee,
  primaryHasAnnualGsmFee, setPrimaryHasAnnualGsmFee,
  
  secondaryTransmitterNo, setSecondaryTransmitterNo,
  secondaryPortId, setSecondaryPortId,
  secondaryIsBillableMonthly, setSecondaryIsBillableMonthly,
  secondaryMonthlyFee, setSecondaryMonthlyFee,
  secondaryHasAnnualLicenseFee, setSecondaryHasAnnualLicenseFee,
  secondaryHasAnnualGsmFee, setSecondaryHasAnnualGsmFee,
  
  transmitterHistory
}: ClientHardwareSectionProps) {
  return (
    <section className="space-y-6">
      <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">4. Hardware & Transmitters</h3>

      <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 space-y-6">
        <h4 className="text-sm font-bold text-indigo-400">Current Assignments</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Primary Transmitter Block */}
          <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
            <h5 className="font-bold text-slate-300 text-sm">Primary Hardware</h5>
            <div>
              <label className={labelCls}>Transmitter No.</label>
              <input type="text" value={primaryTransmitterNo} onChange={e => setPrimaryTransmitterNo(e.target.value)} className={inputCls} placeholder="e.g. TX-100293" />
            </div>
            <div>
              <label className={labelCls}>Port ID (Patriot)</label>
              <input type="text" value={primaryPortId} onChange={e => setPrimaryPortId(e.target.value)} className={inputCls} placeholder="e.g. PORT-A1" />
            </div>
            
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={primaryIsBillableMonthly} onChange={e => setPrimaryIsBillableMonthly(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm font-semibold text-slate-300">Billable Monthly Hardware Fee</span>
              </label>
              {primaryIsBillableMonthly && (
                <div className="pl-7">
                  <input type="number" step="0.01" value={primaryMonthlyFee} onChange={e => setPrimaryMonthlyFee(e.target.value)} className={`${inputCls} py-1.5`} placeholder="0.00" />
                </div>
              )}
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={primaryHasAnnualLicenseFee} onChange={e => setPrimaryHasAnnualLicenseFee(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm font-semibold text-slate-300">Annual License Fee Applies</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={primaryHasAnnualGsmFee} onChange={e => setPrimaryHasAnnualGsmFee(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm font-semibold text-slate-300">Annual GSM Fee Applies</span>
              </label>
            </div>
          </div>

          {/* Secondary Transmitter Block */}
          <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
            <h5 className="font-bold text-slate-300 text-sm">Secondary Hardware</h5>
            <div>
              <label className={labelCls}>Transmitter No.</label>
              <input type="text" value={secondaryTransmitterNo} onChange={e => setSecondaryTransmitterNo(e.target.value)} className={inputCls} placeholder="e.g. TX-99382" />
            </div>
            <div>
              <label className={labelCls}>Port ID (Patriot)</label>
              <input type="text" value={secondaryPortId} onChange={e => setSecondaryPortId(e.target.value)} className={inputCls} placeholder="e.g. PORT-B2" />
            </div>
            
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={secondaryIsBillableMonthly} onChange={e => setSecondaryIsBillableMonthly(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm font-semibold text-slate-300">Billable Monthly Hardware Fee</span>
              </label>
              {secondaryIsBillableMonthly && (
                <div className="pl-7">
                  <input type="number" step="0.01" value={secondaryMonthlyFee} onChange={e => setSecondaryMonthlyFee(e.target.value)} className={`${inputCls} py-1.5`} placeholder="0.00" />
                </div>
              )}
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={secondaryHasAnnualLicenseFee} onChange={e => setSecondaryHasAnnualLicenseFee(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm font-semibold text-slate-300">Annual License Fee Applies</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={secondaryHasAnnualGsmFee} onChange={e => setSecondaryHasAnnualGsmFee(e.target.checked)} className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-sm font-semibold text-slate-300">Annual GSM Fee Applies</span>
              </label>
            </div>
          </div>

        </div>
      </div>

      {transmitterHistory && transmitterHistory.length > 0 && (
        <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-indigo-400">Assignment History & Pass-Over Dates</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="px-4 py-2 rounded-tl-lg">Role</th>
                  <th className="px-4 py-2">Transmitter No</th>
                  <th className="px-4 py-2">Port ID</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Assigned At</th>
                  <th className="px-4 py-2 rounded-tr-lg">Retired At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transmitterHistory.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3">{tx.role}</td>
                    <td className="px-4 py-3 font-mono">{tx.transmitter_no}</td>
                    <td className="px-4 py-3 font-mono">{tx.port_id || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tx.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                        tx.status === 'RETIRED' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{new Date(tx.assigned_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{tx.retired_at ? new Date(tx.retired_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
