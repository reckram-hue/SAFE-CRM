import type { AlarmMake, ZoneType, ClientZone } from './types';

interface ClientAlarmSectionProps {
  alarmMakes: AlarmMake[];
  zoneTypes: ZoneType[];
  zoneDescriptors?: { id: number; label: string }[];
  alarmMakeId: string;
  setAlarmMakeId: (v: string) => void;
  alarmModelId: string;
  setAlarmModelId: (v: string) => void;
  zones: ClientZone[];
  handleZoneChange: (index: number, field: keyof ClientZone, value: any) => void;
  handleRemoveZone: (index: number) => void;
  handleAddZone: () => void;
}

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2';
const inputCls = 'w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 text-slate-200 shadow-inner';

export default function ClientAlarmSection({
  alarmMakes,
  zoneTypes,
  zoneDescriptors = [],
  alarmMakeId,
  setAlarmMakeId,
  alarmModelId,
  setAlarmModelId,
  zones,
  handleZoneChange,
  handleRemoveZone,
  handleAddZone,
}: ClientAlarmSectionProps) {
  
  const selectedMake = alarmMakes.find((m) => m.id.toString() === alarmMakeId);
  const models = selectedMake ? selectedMake.models : [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-lg font-bold text-white">Alarm System & Zones</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40 p-6 rounded-xl border border-slate-800">
        <div>
          <label className={labelCls}>Alarm Make</label>
          <select
            value={alarmMakeId}
            onChange={(e) => {
              setAlarmMakeId(e.target.value);
              setAlarmModelId(''); // Reset model when make changes
            }}
            className={inputCls}
          >
            <option value="">Select Make</option>
            {alarmMakes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Alarm Model</label>
          <select
            value={alarmModelId}
            onChange={(e) => setAlarmModelId(e.target.value)}
            className={inputCls}
            disabled={!alarmMakeId}
          >
            <option value="">Select Model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Alarm Zones</h4>
          <button
            type="button"
            onClick={handleAddZone}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-bold transition-all text-white"
          >
            + Add Zone Row
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="text-sm text-slate-500 italic p-4 text-center border border-dashed border-slate-700 rounded-xl">
            No zones configured. Click "Add Zone Row" to define a zone layout.
          </div>
        ) : (
          <div className="space-y-4">
            {zones.map((zone, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-end bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <div className="w-full md:w-24">
                  <label className={labelCls}>Zone #</label>
                  <input
                    type="number"
                    min="1"
                    value={zone.zoneNumber || ''}
                    onChange={(e) => handleZoneChange(index, 'zoneNumber', e.target.value ? parseInt(e.target.value) : '')}
                    className={inputCls}
                    placeholder="e.g. 1"
                  />
                </div>
                
                <div className="w-full md:w-1/3">
                  <label className={labelCls}>Zone Type</label>
                  <select
                    value={zone.zoneTypeId || ''}
                    onChange={(e) => handleZoneChange(index, 'zoneTypeId', e.target.value ? parseInt(e.target.value) : '')}
                    className={inputCls}
                  >
                    <option value="">Select Type</option>
                    {zoneTypes.map((zt) => (
                      <option key={zt.id} value={zt.id}>
                        {zt.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full md:flex-1">
                  <label className={labelCls}>Description / Location</label>
                  <input
                    type="text"
                    list={`zone-descriptors-${index}`}
                    value={zone.description || ''}
                    onChange={(e) => handleZoneChange(index, 'description', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Front Door"
                  />
                  <datalist id={`zone-descriptors-${index}`}>
                    {zoneDescriptors.map(zd => (
                      <option key={zd.id} value={zd.label} />
                    ))}
                  </datalist>
                </div>

                <div className="mt-2 md:mt-0">
                  <button
                    type="button"
                    onClick={() => handleRemoveZone(index)}
                    className="h-[46px] px-4 rounded-xl bg-red-950/50 text-red-400 hover:bg-red-900/50 transition-colors border border-red-900/50 flex items-center justify-center font-bold text-sm whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
