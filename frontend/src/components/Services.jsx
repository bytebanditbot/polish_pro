export default function Services({ services, onBook }) {
  return (
    <div className="cards">
      {services.map((s) => (
        <article className="card" key={s.id}>
          <h3>{s.name}</h3>
          <p>{s.description}</p>
          <p className="meta">
            <strong>{s.price_eur} €</strong> · {Math.round((s.duration_min / 60) * 10) / 10} h
          </p>
          <button className="btn" onClick={() => onBook(s.id)}>Book this</button>
        </article>
      ))}
    </div>
  )
}
