import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

const LoginForm = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(password);
    
    if (!success) {
      setError('Invalid password');
      setPassword('');
    }
    
    setLoading(false);
  };

  return (
    <article className="bg-nier-100 mt-5 relative max-w-md mx-auto">
      <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
        <h3 className="text-nier-text-dark text-xl">Admin Login</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        <div>
          <label className="block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-nier-150 focus:outline-none focus:border-nier-dark"
            placeholder="Enter admin password"
            disabled={loading}
          />
        </div>
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        <Button
          handleClick={handleSubmit}
          label={loading ? "Logging in..." : "Login"}
        />
      </form>
      <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1"></aside>
    </article>
  );
};

export default LoginForm;