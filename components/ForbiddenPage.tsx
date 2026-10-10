export default function ForbiddenPage() {
  return (
    <main className="forbidden-page">
      <section className="forbidden-content">
        <span className="error-code">ERROR 403</span>
        <h1 className="forbidden-title">
          Forbidden<span>.</span>
        </h1>
        <p>You cannot access this route.</p>
        <a className="home-link" href="https://sumitgupta.me/">
          Return to homepage ↗
        </a>
      </section>
    </main>
  );
}
