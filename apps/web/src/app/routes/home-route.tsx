// TJ-ARCH-MOB-001 compliant
// c10 public routes: the composition layer hands the static session (km-auth)
// to the presentation screens as props, so the screens stay free of app wiring.
import { HomeScreen } from "../../presentation/home/home-screen";
import { useSession } from "./use-session";

export function HomeRoute() {
  const { user } = useSession();
  return <HomeScreen user={user} />;
}
