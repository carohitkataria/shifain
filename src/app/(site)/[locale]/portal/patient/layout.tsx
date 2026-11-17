import "./patient-app.css";

/**
 * The patient app's two faces, as in the approved design: Inter for text,
 * Plus Jakarta Sans for headings. Both are loaded by the site layout from our
 * own domain; the app only names them (patient-app.css, .pa).
 */
export default function PatientAppLayout({ children }: { children: React.ReactNode }) {
  return <div className="pa">{children}</div>;
}
