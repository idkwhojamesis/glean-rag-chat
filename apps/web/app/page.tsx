import styles from './page.module.css';

const bootstrapChecks = [
  'pnpm workspace scaffolded for web, MCP, and shared core packages.',
  'TypeScript, ESLint, Vitest, and Playwright are wired at the repo root.',
  'Phase 2 will add shared contracts, validation, and workflow logic.'
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Phase 1 Bootstrap</p>
        <h1 className={styles.title}>Glean RAG Chat</h1>
        <p className={styles.body}>
          This placeholder app confirms the monorepo is wired and ready for the
          first implementation pass. The real indexing and chat flows land in the
          next phases.
        </p>
        <ul className={styles.list}>
          {bootstrapChecks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
