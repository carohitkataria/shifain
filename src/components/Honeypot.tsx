/**
 * A field people never see or reach: off screen, out of the tab order and
 * hidden from screen readers. Only a script filling in every input sets it,
 * and the server then quietly opens nothing.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
