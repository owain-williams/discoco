export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 via-white to-cyan-100">
      {children}
    </div>
  );
}
