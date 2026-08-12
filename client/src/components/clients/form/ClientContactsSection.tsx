// Section 5: Emergency Contacts — search/picker, add/remove rows, contact fields

import type { Contact } from './types';

interface ClientContactsSectionProps {
  contacts: Contact[];

  setContactSearchQuery: (v: string) => void;
  contactSearchResults: any[];
  activeContactIndex: number | null;
  setActiveContactIndex: (v: number | null) => void;
  handleSelectExistingContact: (index: number, contact: any) => void;
  handleContactChange: (index: number, field: keyof Contact, value: any) => void;
  handleRemoveContact: (index: number) => void;
  handleAddContact: () => void;
  moveContactUp: (index: number) => void;
  moveContactDown: (index: number) => void;
}

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2';

export default function ClientContactsSection({
  contacts,
  setContactSearchQuery,
  contactSearchResults,
  activeContactIndex,
  setActiveContactIndex,
  handleSelectExistingContact,
  handleContactChange,
  handleRemoveContact,
  handleAddContact,
  moveContactUp,
  moveContactDown,
}: ClientContactsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-lg font-bold text-white">5. Emergency Contacts & Keyholders</h3>
        <button
          type="button"
          onClick={handleAddContact}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold transition-all text-white"
        >
          + Add Contact Row
        </button>
      </div>

      {!contacts.some(c => c.is_keyholder) && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center gap-3 animate-fadeIn">
          <span className="text-amber-400 font-bold">⚠️ Warning: No keyholder assigned!</span>
          <span className="text-amber-200 text-sm">Please designate at least one contact as a physical keyholder for emergency response access.</span>
        </div>
      )}

      <div className="space-y-6">
        {contacts.map((contact, index) => (
          <div key={index} className="bg-slate-950/40 p-6 rounded-xl border border-slate-800 space-y-4 relative">
            {/* Header: Priority Badge & Actions */}
            <div className="flex justify-between items-center bg-slate-900/50 -mx-6 -mt-6 px-6 py-3 rounded-t-xl border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                  contact.priority_order === 1 
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  Priority {contact.priority_order} {contact.priority_order === 1 ? '- Primary' : ''}
                </span>
                {contact.is_keyholder && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    🗝️ Keyholder
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button type="button" onClick={() => moveContactUp(index)} disabled={index === 0} className="h-7 w-7 rounded bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-all">▲</button>
                <button type="button" onClick={() => moveContactDown(index)} disabled={index === contacts.length - 1} className="h-7 w-7 rounded bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-all">▼</button>
                {contacts.length > 1 && (
                  <button type="button" onClick={() => handleRemoveContact(index)} className="h-7 w-7 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all ml-2">✕</button>
                )}
              </div>
            </div>

            {/* Search existing contact */}
            <div className="grid grid-cols-1 gap-4">
              <div className="relative">
                <label className={labelCls}>Search Existing Contact</label>
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  onChange={e => {
                    setActiveContactIndex(index);
                    setContactSearchQuery(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none"
                />
                {activeContactIndex === index && contactSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto divide-y divide-slate-900">
                    {contactSearchResults.map(res => (
                      <div
                        key={res.id}
                        onClick={() => handleSelectExistingContact(index, res)}
                        className="px-4 py-2 hover:bg-slate-900 cursor-pointer text-xs flex justify-between"
                      >
                        <span className="font-bold text-white">{res.full_name}</span>
                        <span className="text-slate-400">{res.primary_phone}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Core contact fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={contact.full_name} onChange={e => handleContactChange(index, 'full_name', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" required />
              </div>
              <div>
                <label className={labelCls}>Primary Phone</label>
                <input type="text" value={contact.primary_phone} onChange={e => handleContactChange(index, 'primary_phone', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" required />
              </div>
              <div>
                <label className={labelCls}>Relationship / Role</label>
                <select
                  value={contact.relationship_type}
                  onChange={e => handleContactChange(index, 'relationship_type', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none"
                  required
                >
                  <option value="Owner">Owner</option>
                  <option value="Tenant">Tenant</option>
                  <option value="Property Manager">Property Manager</option>
                  <option value="Domestic Staff">Domestic Staff</option>
                  <option value="Security Guard">Security Guard</option>
                  <option value="Family Member">Family Member</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Optional contact fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Secondary Phone</label>
                <input type="text" value={contact.secondary_phone || ''} onChange={e => handleContactChange(index, 'secondary_phone', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" value={contact.email || ''} onChange={e => handleContactChange(index, 'email', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
              </div>
            </div>
            
            {/* Notes & Keyholder Checkbox */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelCls}>Access / Special Notes</label>
                <input type="text" value={contact.notes || ''} onChange={e => handleContactChange(index, 'notes', e.target.value)} placeholder="e.g. Has remote to main gate, works night shift..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                <input
                  type="checkbox"
                  checked={!!contact.is_keyholder}
                  onChange={e => handleContactChange(index, 'is_keyholder', e.target.checked)}
                  className="accent-indigo-500 h-5 w-5 rounded"
                />
                <span className="text-sm font-semibold text-slate-200">Physical Keyholder (Holds keys/remotes)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
