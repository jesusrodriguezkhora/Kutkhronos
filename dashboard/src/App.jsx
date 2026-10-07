import { FrappeProvider } from "frappe-react-sdk";
import Inicio from "./Inicio";

export default function App() {
  return (
    <FrappeProvider enableSocket={false}>
      <Inicio />
    </FrappeProvider>
  );
}