import { useState, useEffect } from 'react';
import logo from '../assets/eatwisely.ico';

export function PageLoader({ message = 'Loading...' }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Preparing...');

  useEffect(() => {
    const stages = [
      { target: 30, text: 'Preparing...', duration: 400 },
      { target: 60, text: 'Loading resources...', duration: 500 },
      { target: 85, text: 'Almost ready...', duration: 400 },
      { target: 100, text: 'Done!', duration: 300 }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < stages.length) {
        const { target, text } = stages[current];
        setStatusText(text);
        
        const increment = (target - (current === 0 ? 0 : stages[current - 1].target)) / 20;
        const subInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= target) {
              clearInterval(subInterval);
              return target;
            }
            return Math.min(prev + increment, target);
          });
        }, stages[current].duration / 20);

        current++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#fdf0f0_0%,#f6fbe9_35%,#edf4dc_100%)]">
      <div className="flex flex-col items-center gap-8">
        <img
          src={logo}
          alt="EatWisely"
          className="h-24 w-24 rounded-2xl shadow-xl shadow-[#8fa31e]/20"
        />

        <div className="flex w-72 flex-col items-center gap-3">
          <p className="font-['Manrope'] text-xl font-bold text-[#23411f]">
            {message}
          </p>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#dce6c1]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8fa31e] to-[#b62828] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-[#4e5e20]/70">{statusText}</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#b62828] via-[#8fa31e] to-[#b62828] bg-[length:200%_100%] animate-[slide_2s_linear_infinite]" />
      </div>

      <style>{`
        @keyframes slide {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  );
}

export function InlineLoader({ message }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 10));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl bg-[#f7faef] px-4 py-3 text-sm text-[#4e5e20]">
      <div className="flex-1 overflow-hidden rounded-full bg-[#dce6c1]">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-[#8fa31e] to-[#8fa31e]/70 transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      {message && <span className="whitespace-nowrap">{message}</span>}
    </div>
  );
}

export default PageLoader;
