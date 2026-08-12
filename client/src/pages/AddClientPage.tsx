import { useNavigate } from 'react-router-dom';
import ClientForm from '../components/clients/ClientForm';

export default function AddClientPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white m-0">Register New Client</h2>
          <p className="text-slate-400 text-sm m-0">Capture client particulars, site information, services, and billing preferences.</p>
        </div>
        <button
          onClick={() => navigate('/clients')}
          className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 text-slate-300 text-sm font-semibold transition-colors"
        >
          ← Back to List
        </button>
      </div>

      <ClientForm mode="add" onSubmitSuccess={() => navigate('/clients')} onCancel={() => navigate('/clients')} />
    </div>
  );
}
