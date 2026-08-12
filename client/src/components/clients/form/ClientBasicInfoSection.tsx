// Section 1: Client Particulars — name/type, billing cycle, anniversary month, payment

interface ClientBasicInfoSectionProps {
  clientType: string;
  setClientType: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  surname: string;
  setSurname: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  vatNo: string;
  setVatNo: (v: string) => void;
  companyRegNo: string;
  setCompanyRegNo: (v: string) => void;
  idPassportNo: string;
  setIdPassportNo: (v: string) => void;
  clientSince: string;
  setClientSince: (v: string) => void;
  anniversaryMonth: number;
  setAnniversaryMonth: (v: number) => void;
}

const MONTHS = [
  { label: 'January', val: 1 }, { label: 'February', val: 2 }, { label: 'March', val: 3 },
  { label: 'April', val: 4 }, { label: 'May', val: 5 }, { label: 'June', val: 6 },
  { label: 'July', val: 7 }, { label: 'August', val: 8 }, { label: 'September', val: 9 },
  { label: 'October', val: 10 }, { label: 'November', val: 11 }, { label: 'December', val: 12 },
];

const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2';

export default function ClientBasicInfoSection({
  clientType, setClientType,
  title, setTitle,
  firstName, setFirstName,
  surname, setSurname,
  companyName, setCompanyName,
  vatNo, setVatNo,
  companyRegNo, setCompanyRegNo,
  idPassportNo, setIdPassportNo,
  clientSince, setClientSince,
  anniversaryMonth, setAnniversaryMonth,
}: ClientBasicInfoSectionProps) {
  return (
    <>
      {/* ── Section 1: Client Particulars ── */}
      <section className="space-y-6">
        <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">1. Client Particulars</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={labelCls}>Client Type</label>
            <select value={clientType} onChange={e => setClientType(e.target.value)} className={inputCls}>
              <option value="BUSINESS">Business</option>
              <option value="HOLIDAY_HOME">Holiday Home</option>
              <option value="PERMANENT_RESIDENCE">Permanent Residence</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Client Since</label>
            <input type="date" value={clientSince} onChange={e => setClientSince(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Anniversary Month</label>
            <select value={anniversaryMonth} onChange={e => setAnniversaryMonth(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none">
              {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {clientType === 'BUSINESS' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            <div>
              <label className={labelCls}>Company Name</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>VAT Number</label>
              <input type="text" value={vatNo} onChange={e => setVatNo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Company Registration No</label>
              <input type="text" value={companyRegNo} onChange={e => setCompanyRegNo(e.target.value)} className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
            <div>
              <label className={labelCls}>Title</label>
              <select value={title} onChange={e => setTitle(e.target.value)} className={inputCls}>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Miss">Miss</option>
                <option value="Dr">Dr</option>
                <option value="Prof">Prof</option>
                <option value="Rev">Rev</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>First Name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Surname <span className="text-rose-400">*</span></label>
              <input type="text" value={surname} onChange={e => setSurname(e.target.value)} className={inputCls} required />
            </div>
            <div className="md:col-span-4">
              <label className={labelCls}>SA ID / Passport Number</label>
              <input type="text" value={idPassportNo} onChange={e => setIdPassportNo(e.target.value)} className={inputCls} required />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
