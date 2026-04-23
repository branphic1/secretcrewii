export default function CategoryPicker({ categories, value, onChange, placeholder = '카테고리', allowAll = false }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-md px-3 py-2 text-sm outline-none"
      style={{
        border: '1px solid #E7E5E0',
        background: '#FFFDF8',
        color: '#1C1917',
        minWidth: '10rem',
      }}
    >
      {allowAll && <option value="">전체</option>}
      {!value && !allowAll && <option value="" disabled>{placeholder}</option>}
      {categories.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
