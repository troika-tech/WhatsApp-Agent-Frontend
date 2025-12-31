import { FaCreditCard, FaCheckCircle } from 'react-icons/fa';

const Settings = () => {

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass-card p-12 max-w-md w-full text-center bg-gradient-to-br from-white to-emerald-50/60 border border-emerald-100/70 shadow-[0_20px_40px_rgba(16,185,129,0.12)]">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg mb-4">
            <FaCreditCard className="text-white" size={36} />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 mb-3">
          Coming Soon
        </h2>
        <p className="text-zinc-600 text-base mb-6">
          We're working on something amazing! Settings page will be available soon.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          <FaCheckCircle className="h-4 w-4" />
          <span>Stay tuned for updates</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
