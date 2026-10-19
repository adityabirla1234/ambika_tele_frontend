import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { usePing } from "../api/ping";
import "../styles/home.css";

const STEPS = [
  { title: "Register your purchase", text: "Enter your bill details and your phone's IMEI or the appliance serial number. It takes about two minutes." },
  { title: "We check your bill", text: "Our team reviews your claim. Your status page updates by itself, so you can keep it open or come back later." },
  { title: "Scratch and collect", text: "Once your claim is approved, scratch your card and visit Ambika Telecom to collect your reward." },
];

export function CustomerHome() {
  const ping = usePing();

  return (
    <>
      <section className="home-hero">
        <svg className="home-arcs" viewBox="0 0 600 600" fill="none" stroke="currentColor" strokeWidth="14" aria-hidden="true" focusable="false">
          {[70, 140, 210, 280].map((r) => <circle key={r} cx="300" cy="300" r={r} />)}
        </svg>

        <div className="home-inner">
          <div>
            <h1>Bought a phone or appliance from us? Claim your reward.</h1>
            <p className="home-lead">
              Register your purchase, see the reward range you qualify for, then collect it at the shop once your claim is
              approved. For purchases between ₹10,000 and ₹1,00,000.
            </p>
            <Link to="/claim" className="home-cta">Register my purchase</Link>
            <p className="home-secondary">
              Already registered? <Link to="/status">Check my claim status</Link>
            </p>
          </div>

          <div className="home-stage" aria-hidden="true">
            <div className="home-card">
              <div className="home-card-under">₹</div>
              <div className="home-foil home-foil-left" />
              <div className="home-foil home-foil-right" />
              <div className="home-card-text">
                <span className="home-card-chip">Ambika</span>
                <span className="home-card-foot">Scratch here</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!ping.isSuccess && (
        <div className="home-inner">
          <div className="home-status" role="status" aria-live="polite">
            {ping.isPending && <p>Connecting to the server. The first visit can take up to a minute.</p>}
            {ping.isError && (
              <p>
                {ping.error instanceof ApiRequestError ? ping.error.message : "Something went wrong."}{" "}
                <button className="linkbutton" onClick={() => ping.refetch()}>Try again</button>
              </p>
            )}
          </div>
        </div>
      )}

      <section className="home-inner home-steps" aria-labelledby="how-it-works">
        <h2 id="how-it-works">How it works</h2>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="home-stepnum" aria-hidden="true">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
