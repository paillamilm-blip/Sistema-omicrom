import { redirect } from "next/navigation";

export default function HomePage() {
  // La raíz redirige al dashboard principal del usuario.
  redirect("/dashboard");
}
