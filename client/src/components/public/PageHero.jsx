import { sectionWrapClass } from '../../utils/publicPage';

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  kicker,
  backgroundImage
}) {
  return (
    <section className={sectionWrapClass}>
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#1b2618_0%,#23411f_46%,#3d5c33_72%,#8fa31e_100%)] px-6 py-10 shadow-[0_25px_80px_rgba(60,79,25,0.18)] sm:px-8 lg:px-10 lg:py-14">
        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,19,12,0.88),rgba(35,65,31,0.78),rgba(143,163,30,0.26))]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(182,40,40,0.22),transparent_22%)]" />
        )}
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#f8c8c8]">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              {description}
            </p>
            {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {kicker ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              {kicker}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default PageHero;
