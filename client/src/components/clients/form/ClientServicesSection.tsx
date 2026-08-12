// Section 3: Services & Custom Pricing — email/SMS options, general service checkboxes,
// negotiated-rate adjustment rows with proration display

import type { ServiceItem, SelectedService } from './types';

interface ClientServicesSectionProps {
  billingCycles: any[];
  paymentMethodsList: any[];
  billingCycle: string;
  setBillingCycle: (v: string) => void;
  monthlyTariff: string;
  setMonthlyTariff: (v: string) => void;
  itemizedTotal: number;
  handleSyncTariff: () => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  bankName: string;
  setBankName: (v: string) => void;
  accountType: string;
  setAccountType: (v: string) => void;
  branchCode: string;
  setBranchCode: (v: string) => void;
  accountNo: string;
  setAccountNo: (v: string) => void;
  accountHolderName: string;
  setAccountHolderName: (v: string) => void;

  servicesList: ServiceItem[];
  generalServices: ServiceItem[];
  selectedServices: SelectedService[];
  emailReportOption: string;
  setEmailReportOption: (v: string) => void;
  smsOption: string;
  setSmsOption: (v: string) => void;
  clientSince: string;
  handleServiceCheckboxToggle: (id: number, baseFee: number) => void;
  handleNegotiatedFeeChange: (id: number, value: string) => void;
  handleDiscountReasonChange: (id: number, value: string) => void;
  getDaysRemainingUntilDec1: (sinceDateStr: string) => number;
}

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2';

export default function ClientServicesSection({
  billingCycles, paymentMethodsList,
  billingCycle, setBillingCycle,
  monthlyTariff, setMonthlyTariff,
  itemizedTotal, handleSyncTariff,
  paymentMethod, setPaymentMethod,
  bankName, setBankName,
  accountType, setAccountType,
  branchCode, setBranchCode,
  accountNo, setAccountNo,
  accountHolderName, setAccountHolderName,
  generalServices,
  servicesList,
  selectedServices,
  emailReportOption, setEmailReportOption,
  smsOption, setSmsOption,
  clientSince,
  handleServiceCheckboxToggle,
  handleNegotiatedFeeChange,
  handleDiscountReasonChange,
  getDaysRemainingUntilDec1,
}: ClientServicesSectionProps) {
  return (
    <section className="space-y-6">
      <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">3. Financial & Billing Setup</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-slate-950/60 border border-slate-800">
        <div>
          <label className={labelCls}>Billing Cycle</label>
          <select value={billingCycle} onChange={e => setBillingCycle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none">
            <option value="">Select Cycle</option>
            {billingCycles && billingCycles.map(cycle => (
              <option key={cycle.id} value={cycle.name}>{cycle.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Monthly Tariff (R)</label>
          <div className="flex items-center gap-3">
            <input type="number" step="0.01" value={monthlyTariff} onChange={e => setMonthlyTariff(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none" placeholder="0.00" />
            {parseFloat(monthlyTariff || '0') > 0 && Math.abs(parseFloat(monthlyTariff || '0') - itemizedTotal) > 0.01 && (
              <button type="button" onClick={handleSyncTariff} className="whitespace-nowrap px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors border border-slate-700">
                Sync Total from Selected Services
              </button>
            )}
          </div>
          {parseFloat(monthlyTariff || '0') > 0 && Math.abs(parseFloat(monthlyTariff || '0') - itemizedTotal) > 0.01 && (
            <div className="mt-2 text-xs font-semibold">
              {parseFloat(monthlyTariff) > itemizedTotal ? (
                <span className="text-amber-400">R{(parseFloat(monthlyTariff) - itemizedTotal).toFixed(2)} Unallocated (Legacy Import)</span>
              ) : (
                <span className="text-rose-400">Itemized total mismatch (Itemized: R{itemizedTotal.toFixed(2)})</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Payment Method</label>
        <div className="flex gap-4 flex-wrap">
          {paymentMethodsList && paymentMethodsList.map(method => (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.name)}
              className={`flex-1 py-3 px-4 min-w-[150px] rounded-xl border text-sm font-bold transition-all ${
                paymentMethod === method.name
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {method.name}
            </button>
          ))}
          {(!paymentMethodsList || paymentMethodsList.length === 0) && (
            <span className="text-sm text-slate-500 italic py-2">No payment methods configured.</span>
          )}
        </div>
      </div>

      {paymentMethod?.toLowerCase().includes('debit order') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-slate-950/80 border border-slate-800 animate-fadeIn">
          <div className="md:col-span-2">
            <label className={labelCls}>Account Holder Name</label>
            <input type="text" value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none" />
          </div>
          <div>
            <label className={labelCls}>Bank Name</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none" />
          </div>
          <div>
            <label className={labelCls}>Account Type</label>
            <select value={accountType} onChange={e => setAccountType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none">
              <option value="Savings">Savings</option>
              <option value="Current">Current / Cheque</option>
              <option value="Transmission">Transmission</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Branch Code</label>
            <input type="text" value={branchCode} onChange={e => setBranchCode(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none" />
          </div>
          <div>
            <label className={labelCls}>Account Number</label>
            <input type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none" />
          </div>
        </div>
      )}

      {/* Email & SMS report selections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl bg-slate-950/60 border border-slate-800">
        <div>
          <label className={labelCls}>Email Reports Services</label>
          <select value={emailReportOption} onChange={e => setEmailReportOption(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none">
            <option value="NONE">None</option>
            <option value="DAILY">Daily (R 50.00/mo)</option>
            <option value="WEEKLY">Weekly (R 30.00/mo)</option>
            <option value="MONTHLY">Monthly (R 20.00/mo)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>SMS Notifications Services</label>
          <select value={smsOption} onChange={e => setSmsOption(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none">
            <option value="NONE">None</option>
            <option value="DAILY">Daily (R 50.00/mo)</option>
            <option value="WEEKLY">Weekly (R 30.00/mo)</option>
            <option value="MONTHLY">Monthly (R 20.00/mo)</option>
          </select>
        </div>
      </div>

      {/* Checkbox selector for general services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {generalServices.map(s => {
          const isChecked = selectedServices.some(sel => sel.service_id === s.id);
          return (
            <label
              key={s.id}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                isChecked
                  ? 'bg-indigo-500/10 border-indigo-500 text-white'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleServiceCheckboxToggle(s.id, s.base_fee)}
                  className="accent-indigo-500 h-4.5 w-4.5 rounded"
                />
                <span className="text-sm font-semibold">{s.name}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">Base: R {s.base_fee}</span>
            </label>
          );
        })}
      </div>

      {/* Negotiated fee rows for all selected services */}
      {selectedServices.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-850">
          <h4 className="text-sm font-bold text-slate-300">Negotiate Service Rates</h4>
          {selectedServices.map(sel => {
            const matchedService = servicesList.find(s => s.id === sel.service_id);
            if (!matchedService) return null;
            const isDiscounted = sel.negotiated_fee < sel.base_fee_at_booking;
            return (
              <div key={sel.service_id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-950/40 p-4 rounded-xl border border-slate-800 animate-fadeIn">
                <div className="text-sm">
                  <p className="font-semibold text-white">{matchedService.name}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    Admin Base: R {sel.base_fee_at_booking.toFixed(2)}
                    {matchedService.is_annual && ` (Prorated for ${getDaysRemainingUntilDec1(clientSince)} days)`}
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Negotiated Fee (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sel.negotiated_fee}
                    onChange={e => handleNegotiatedFeeChange(sel.service_id, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 text-sm font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Reason for Discount {isDiscounted && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Required if fee is lower"
                    value={sel.discount_reason}
                    onChange={e => handleDiscountReasonChange(sel.service_id, e.target.value)}
                    required={isDiscounted}
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none ${
                      isDiscounted && !sel.discount_reason.trim()
                        ? 'border-rose-500/80 focus:border-rose-500'
                        : 'border-slate-800'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
