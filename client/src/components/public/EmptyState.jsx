export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-[#dce6c1] bg-[#fbfcf7] px-6 py-16 text-center shadow-sm">
      <h3 className="text-2xl font-bold text-[#23411f]">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-gray-600">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
