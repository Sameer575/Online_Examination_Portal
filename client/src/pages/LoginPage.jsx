import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Smartphone, UserRound, Lock, UserPlus } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [isSignup, setIsSignup] = useState(true); // Start with signup for students
  const [customFields, setCustomFields] = useState([]);
  const [customFieldsData, setCustomFieldsData] = useState({});
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        const { data } = await api.get('/api/auth/custom-fields');
        setCustomFields(data);
      } catch (error) {
        console.error('Failed to load custom fields');
      }
    };
    loadCustomFields();
  }, []);

  if (user) {
    navigate(user.role === 'admin' ? '/admin' : '/student');
  }

  const handleInput = (e) => {
    const { name, value } = e.target;
    
    // For phone number, only allow digits and limit to 10 digits
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, ''); // Remove non-digits
      if (digitsOnly.length <= 10) {
        setForm((prev) => ({ ...prev, [name]: digitsOnly }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validate phone number on frontend
    if (form.phone.length !== 10) {
      setMessage('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }
    
    try {
      const { data } = await api.post('/api/auth/signup', {
        name: form.name,
        phone: form.phone,
        password: form.password,
        customFields: customFieldsData,
      });
      login(data);
      navigate('/student', { replace: true });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create account';
      setMessage(errorMessage);
      
      // If phone already exists, switch to login mode
      if (error.response?.data?.code === 'PHONE_ALREADY_EXISTS' || 
          errorMessage.includes('already registered')) {
        setTimeout(() => {
          setIsSignup(false);
          setForm((prev) => ({ name: '', phone: prev.phone, password: '' }));
          setMessage('Account exists for this number. Please login.');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Validate phone number on frontend
    if (form.phone.length !== 10) {
      setMessage('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }
    
    try {
      const { data } = await api.post('/api/auth/login', {
        phone: form.phone,
        password: form.password,
      });
      login(data);
      navigate(data.user.role === 'admin' ? '/admin' : '/student', { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl grid gap-10 md:grid-cols-2">
        <div className="flex flex-col justify-center gap-6">
          <span className="text-sm uppercase tracking-[0.5em] text-brand-200">
            Modern Exam Suite
          </span>
          <h1 className="text-4xl font-semibold leading-tight">
            {isSignup ? 'Student Signup' : 'Secure Login'}
          </h1>
          <p className="text-lg text-white/70">
            {isSignup
              ? 'Create your student account to access exams and track your progress.'
              : 'Login to access your dashboard. Admin access available with authorized credentials.'}
          </p>
          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-white/70">
              <ShieldCheck className="text-brand-400" />
              Secure password authentication
            </div>
            <div className="flex items-center gap-3 text-white/70">
              <Smartphone className="text-brand-400" />
              Phone number based access
            </div>
          </div>
        </div>

        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative space-y-6">
            <div className="flex flex-col gap-1">
              <p className="text-sm uppercase tracking-[0.5em] text-white/60">
                {isSignup ? 'Create Account' : 'Welcome Back'}
              </p>
              <h2 className="text-2xl font-semibold">
                {isSignup ? 'Sign Up as Student' : 'Login'}
              </h2>
            </div>

            {message && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
                {message}
              </div>
            )}

            <form className="space-y-5" onSubmit={isSignup ? handleSignup : handleLogin}>
              {isSignup && (
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Full Name
                  <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-2">
                    <UserRound size={18} className="text-white/50" />
                    <input
                      required
                      type="text"
                      className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
                      name="name"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={handleInput}
                    />
                  </div>
                </label>
              )}

              <label className="flex flex-col gap-2 text-sm text-white/70">
                Phone Number
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-2">
                  <Smartphone size={18} className="text-white/50" />
                  <input
                    required
                    type="tel"
                    className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
                    name="phone"
                    placeholder="10 digits (e.g. 9876543210)"
                    value={form.phone}
                    onChange={handleInput}
                    maxLength={10}
                    pattern="[0-9]{10}"
                  />
                </div>
                {form.phone && form.phone.length !== 10 && (
                  <p className="text-xs text-rose-400">Phone number must be exactly 10 digits</p>
                )}
              </label>

              <label className="flex flex-col gap-2 text-sm text-white/70">
                Password
                <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-2">
                  <Lock size={18} className="text-white/50" />
                  <input
                    required
                    type="password"
                    className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30"
                    name="password"
                    placeholder={isSignup ? 'Min 8 chars: Aa1@' : 'Enter your password'}
                    value={form.password}
                    onChange={handleInput}
                    minLength={8}
                  />
                </div>
                {isSignup && (
                  <div className="text-xs text-white/50 space-y-1 mt-1">
                    <p>Password must contain:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter (A-Z)</li>
                      <li>One lowercase letter (a-z)</li>
                      <li>One number (0-9)</li>
                      <li>One special character (@$!%*?&)</li>
                    </ul>
                  </div>
                )}
              </label>

              {/* Custom Fields */}
              {isSignup &&
                customFields.map((field) => (
                  <label
                    key={field._id}
                    className="flex flex-col gap-2 text-sm text-white/70"
                  >
                    {field.fieldLabel}
                    {field.isRequired && <span className="text-rose-400">*</span>}
                    {field.fieldType === 'textarea' ? (
                      <textarea
                        required={field.isRequired}
                        rows={3}
                        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none placeholder:text-white/30 resize-none"
                        placeholder={field.placeholder || `Enter ${field.fieldLabel.toLowerCase()}`}
                        value={customFieldsData[field.fieldName] || ''}
                        onChange={(e) =>
                          setCustomFieldsData({
                            ...customFieldsData,
                            [field.fieldName]: e.target.value,
                          })
                        }
                      />
                    ) : field.fieldType === 'select' ? (
                      <select
                        required={field.isRequired}
                        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
                        value={customFieldsData[field.fieldName] || ''}
                        onChange={(e) =>
                          setCustomFieldsData({
                            ...customFieldsData,
                            [field.fieldName]: e.target.value,
                          })
                        }
                      >
                        <option value="" className="bg-slate-900">
                          Select {field.fieldLabel}
                        </option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-slate-900">
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required={field.isRequired}
                        type={field.fieldType}
                        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-white outline-none placeholder:text-white/30"
                        placeholder={field.placeholder || `Enter ${field.fieldLabel.toLowerCase()}`}
                        value={customFieldsData[field.fieldName] || ''}
                        onChange={(e) =>
                          setCustomFieldsData({
                            ...customFieldsData,
                            [field.fieldName]: e.target.value,
                          })
                        }
                      />
                    )}
                  </label>
                ))}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? (
                  'Please wait...'
                ) : isSignup ? (
                  <>
                    <UserPlus size={18} className="mr-2 inline" />
                    Create Account
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} className="mr-2 inline" />
                    Login
                  </>
                )}
              </button>

              <div className="text-center text-sm text-white/60">
                {isSignup ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="text-brand-300 hover:text-brand-200 underline"
                      onClick={() => {
                        setIsSignup(false);
                        setMessage('');
                        setForm({ name: '', phone: '', password: '' });
                        setCustomFieldsData({});
                      }}
                    >
                      Login
                    </button>
                  </>
                ) : (
                  <>
                    New student?{' '}
                    <button
                      type="button"
                      className="text-brand-300 hover:text-brand-200 underline"
                      onClick={() => {
                        setIsSignup(true);
                        setMessage('');
                        setForm({ name: '', phone: '', password: '' });
                        setCustomFieldsData({});
                      }}
                    >
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default LoginPage;

