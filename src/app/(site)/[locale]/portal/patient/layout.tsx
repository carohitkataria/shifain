import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./patient-app.css";

/** The patient app's two faces, as in the approved design: Inter for text, Plus Jakarta Sans for headings. */
const body = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], display: "swap", variable: "--pa-body" });
const display = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--pa-display" });

export default function PatientAppLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pa ${body.variable} ${display.variable}`}>{children}</div>;
}
