import { joinClasses, sectionEyebrowClass } from '../../utils/publicPage';

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left'
}) {
  return (
    <div
      className={joinClasses(
        'mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'text-center md:flex-col md:items-center'
      )}
    >
      <div className={joinClasses('max-w-3xl', align === 'center' && 'mx-auto')}>
        <p className={sectionEyebrowClass}>{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default SectionHeading;
