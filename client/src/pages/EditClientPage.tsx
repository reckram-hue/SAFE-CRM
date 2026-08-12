import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientForm from '../components/clients/ClientForm';
import { API_BASE } from '../config/api';

export default function EditClientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientId = parseInt(id || '0', 10);

  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const fetchClient = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients/${clientId}`);
        if (!res.ok) throw new Error('Client record not found');
        const data = await res.json();
        setClientData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white m-0">Edit Client Particulars</h2>
          <p className="text-slate-400 text-sm m-0">Modify details, check OCC locking constraints, and update client profile.</p>
        </div>
        <button
          onClick={() => navigate('/clients')}
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 text-slate-300 text-sm font-semibold transition-colors"
        >
          ← Back to List
        </button>
      </div>

      {loading && (
        <div className="py-12 text-center text-slate-400">Loading client record...</div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
          Error loading client: {error}
        </div>
      )}

      {!loading && !error && clientData && (
        <ClientForm 
          mode="edit" 
          initialData={clientData} 
          onSubmitSuccess={() => navigate('/clients')} 
          onCancel={() => navigate('/clients')} 
        />
      )}
    </div>
  );
}
