export function Bar({ wdl }: { wdl: [number, number, number] }) {
  const [w, d, l] = wdl;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div className="bg-indigo-500" style={{ width: `${w}%` }} />
      <div className="bg-slate-600" style={{ width: `${d}%` }} />
      <div className="bg-blue-500/70" style={{ width: `${l}%` }} />
    </div>
  );
}
