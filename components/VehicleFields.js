import { VEHICLE_TYPES, FUELS } from "@/lib/config";

export default function VehicleFields({ hidden = false }) {
  const year = new Date().getFullYear();
  return (
    <div className="form-grid" hidden={hidden}>
      <div className="field full">
        <label htmlFor="regNo">Registration number *</label>
        <input id="regNo" name="regNo" placeholder="e.g. DL 3C AB 1234" required={!hidden} style={{ textTransform: "uppercase" }} />
      </div>
      <div className="field">
        <label htmlFor="make">Make *</label>
        <input id="make" name="make" placeholder="Maruti Suzuki, Hyundai…" required={!hidden} />
      </div>
      <div className="field">
        <label htmlFor="model">Model *</label>
        <input id="model" name="model" placeholder="Swift, Creta…" required={!hidden} />
      </div>
      <div className="field">
        <label htmlFor="year">Year *</label>
        <input id="year" name="year" type="number" min="1980" max={year + 1} defaultValue={year - 3} required={!hidden} />
      </div>
      <div className="field">
        <label htmlFor="type">Body type</label>
        <select id="type" name="type" defaultValue="HATCHBACK">
          {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="fuel">Fuel</label>
        <select id="fuel" name="fuel" defaultValue="PETROL">
          {FUELS.map((f) => (
            <option key={f} value={f}>{f[0] + f.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="color">Colour</label>
        <input id="color" name="color" placeholder="White" />
      </div>
      <div className="field full">
        <label htmlFor="odometer">Odometer (km)</label>
        <input id="odometer" name="odometer" type="number" min="0" placeholder="42000" />
        <span className="hint">The body type helps us price your estimate accurately.</span>
      </div>
    </div>
  );
}
