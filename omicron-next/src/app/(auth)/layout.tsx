import { Logo } from "@/components/dashboard/logo";

/** Layout centrado para las pantallas de autenticación. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-omicron-radial px-4 py-12">
      {/* Halos decorativos */}
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-omicron-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-omicron-purple/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}
