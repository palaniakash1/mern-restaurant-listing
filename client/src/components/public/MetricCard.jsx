import { joinClasses, mutedPanelClass } from '../../utils/publicPage';

export function MetricCard({ label, value, detail, tone = 'light' }) {
  return (
    <div
      className={joinClasses(
        tone === 'dark'
          ? 'rounded-[1.5rem] border border-white/10 bg-white/10 text-white backdrop-blur'
          : mutedPanelClass,
        'p-5'
      )}
    >
      <p
        className={joinClasses(
          'text-[11px] font-semibold uppercase tracking-[0.28em]',
          tone === 'dark' ? 'text-white/60' : 'text-[#b62828]'
        )}
      >
        {label}
      </p>
      <p className={joinClasses('mt-3 text-3xl font-bold', tone === 'dark' ? 'text-white' : 'text-[#23411f]')}>
        {value}
      </p>
      {detail ? (
        <p className={joinClasses('mt-2 text-sm leading-6', tone === 'dark' ? 'text-white/70' : 'text-gray-600')}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export default MetricCard;
