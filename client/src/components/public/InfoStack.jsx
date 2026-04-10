import { surfaceCardClass, sectionEyebrowClass } from '../../utils/publicPage';

export function InfoStack({ items = [] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={surfaceCardClass + ' p-5'}>
          <p className={sectionEyebrowClass}>{item.label}</p>
          <h3 className="mt-3 text-lg font-bold text-[#23411f]">{item.title}</h3>
          <p className="mt-2 text-sm leading-7 text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export default InfoStack;
