import GlassCard from '../../components/GlassCard';

const HelloPage = ({ title, source }) => (
  <GlassCard className="p-6 sm:p-8 mt-0 sm:mt-6 mx-6">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">HRM Module</p>
    <h2 className="mt-3 text-2xl font-semibold text-[var(--color-text)]">{title}</h2>
    <p className="mt-3 text-[var(--color-text-muted)]">Hello from {source}</p>
  </GlassCard>
);

export default HelloPage;