import { useLocation } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="w-full max-w-md">
        <p className="eyebrow">// dead end</p>
        <h1 className="mt-2 font-display text-7xl font-black uppercase leading-[0.85] tracking-tight">
          <span className="mark">404.</span>
        </h1>
        <p className="mt-4 font-mono text-sm text-ink/70">
          The page {pageName ? <span className="font-bold text-ink">"{pageName}"</span> : "you're after"} doesn't exist.
        </p>
        <button onClick={() => (window.location.href = "/")} className="btn btn-ink mt-8">
          Go home
        </button>
      </div>
    </div>
  );
}
