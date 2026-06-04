export default function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#F7F7F2] dark:bg-themed" />
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15, 32, 39, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 32, 39, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(29, 158, 117, 0.04) 0%, transparent 40%, rgba(15, 32, 39, 0.03) 100%)',
        }}
      />
    </div>
  );
}
