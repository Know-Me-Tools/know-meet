// TJ-ARCH-MOB-001 compliant
// Stub sign-in route. Only the default build registers it (default-router.tsx).
import { useNavigate } from "@tanstack/react-router";
import { AuthScreen } from "../../presentation/auth/auth-screen";
import { useSession } from "./use-session";

export function AuthRoute() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  return (
    <AuthScreen
      user={user}
      onSignOut={() => {
        signOut();
        void navigate({ to: "/auth", hash: "sign-in", replace: true });
      }}
    />
  );
}
