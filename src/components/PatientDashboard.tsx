"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type Section =
  | "overview" | "plans" | "enquiries" | "shortlist"
  | "appointments" | "records" | "quotes" | "journey"
  | "travel" | "docs" | "messages" | "profile";

const NAV: { section: Section; icon: string; label: string; group?: string }[] = [
  { section: "overview", icon: "🏠", label: "Overview" },
  { section: "plans", icon: "📄", label: "My plans & estimates" },
  { section: "enquiries", icon: "📨", label: "My enquiries / cases" },
  { section: "shortlist", icon: "⭐", label: "Shortlist" },
  { section: "appointments", icon: "📅", label: "Appointments", group: "Care" },
  { section: "records", icon: "🗂️", label: "Medical records" },
  { section: "quotes", icon: "🧾", label: "Quotes & payments" },
  { section: "journey", icon: "🧭", label: "Care timeline" },
  { section: "travel", icon: "✈️", label: "Travel & stay", group: "Travel" },
  { section: "docs", icon: "📎", label: "Documents & visa" },
  { section: "messages", icon: "💬", label: "Messages", group: "Account" },
  { section: "profile", icon: "⚙️", label: "Profile & settings" },
];

function Tag({ variant, children }: { variant: "green" | "amber" | "grey"; children: React.ReactNode }) {
  const cls =
    variant === "green"
      ? "bg-leaf-tint text-leaf"
      : variant === "amber"
        ? "bg-saffron-tint text-saffron"
        : "bg-surface-muted text-ink-soft";
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function RecRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-1 py-3 last:border-0">
      {children}
    </div>
  );
}

function OverviewSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Welcome back, Rahul</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Your cardiac treatment plan is in progress.</p>
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="card p-4"><b className="text-2xl font-bold text-brand-deep">1</b><span className="mt-0.5 block text-[13px] text-ink-soft">Active case</span></div>
        <div className="card p-4"><b className="text-2xl font-bold text-brand-deep">2</b><span className="mt-0.5 block text-[13px] text-ink-soft">Quotes received</span></div>
        <div className="card p-4"><b className="text-2xl font-bold text-brand-deep">3</b><span className="mt-0.5 block text-[13px] text-ink-soft">Reports uploaded</span></div>
        <div className="card p-4"><b className="text-2xl font-bold text-brand-deep">Jul 14</b><span className="mt-0.5 block text-[13px] text-ink-soft">Next appointment</span></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3.5 text-[17px] font-bold">Your journey</h3>
          <ul className="dash-timeline">
            <li className="done"><b>Plan &amp; estimate generated</b><span>Angioplasty · $4,900–$7,200</span></li>
            <li className="done"><b>Reports uploaded &amp; reviewed</b><span>3 files · opinion received</span></li>
            <li className="cur"><b>Quotes shared</b><span>2 hospitals responded — compare now</span></li>
            <li><b>Appointment &amp; travel</b><span>Book after you choose a hospital</span></li>
            <li><b>Treatment &amp; recovery</b><span>With on-ground support</span></li>
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="mb-3.5 text-[17px] font-bold">Action needed</h3>
          <RecRow><span>Compare 2 hospital quotes</span><Tag variant="amber">Review</Tag></RecRow>
          <RecRow><span>Upload passport for visa letter</span><Tag variant="grey">Pending</Tag></RecRow>
          <RecRow><span>Confirm preferred travel dates</span><Tag variant="grey">Pending</Tag></RecRow>
          <RecRow><span>Message from Dr. coordinator</span><Tag variant="green">New</Tag></RecRow>
        </div>
      </div>
    </>
  );
}

function PlansSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">My plans &amp; estimates</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Every estimate you&apos;ve generated is saved here.</p>
      <div className="card p-5">
        <RecRow>
          <div><b className="font-semibold">Cardiac · Angioplasty (PTCA)</b><div className="mt-0.5 text-[13px] text-ink-soft">Generated 12 Jun · $4,900–$7,200</div></div>
          <button className="btn btn-secondary text-sm">View</button>
        </RecRow>
        <RecRow>
          <div><b className="font-semibold">Cardiac · Angiography</b><div className="mt-0.5 text-[13px] text-ink-soft">Generated 8 Jun · $300–$600</div></div>
          <button className="btn btn-secondary text-sm">View</button>
        </RecRow>
      </div>
    </>
  );
}

function EnquiriesSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">My enquiries / cases</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Track the status of each case from enquiry to recovery.</p>
      <div className="card p-5">
        <RecRow>
          <div><b className="font-semibold">#SHF-2041 · Angioplasty</b><div className="mt-0.5 text-[13px] text-ink-soft">Meridian Heart Institute, Delhi</div></div>
          <Tag variant="amber">Quotes shared</Tag>
        </RecRow>
        <RecRow>
          <div><b className="font-semibold">#SHF-1990 · Second opinion</b><div className="mt-0.5 text-[13px] text-ink-soft">Asha Superspecialty, Bengaluru</div></div>
          <Tag variant="green">Opinion received</Tag>
        </RecRow>
      </div>
    </>
  );
}

function ShortlistSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Shortlist</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Hospitals, doctors and packages you saved to compare.</p>
      <div className="card p-5">
        <RecRow><span>🏥 Meridian Heart Institute, Delhi</span><button className="btn btn-secondary text-sm">Compare</button></RecRow>
        <RecRow><span>🏥 Asha Superspecialty, Bengaluru</span><button className="btn btn-secondary text-sm">Compare</button></RecRow>
        <RecRow><span>👨‍⚕️ Dr. Arun Verma · Interventional cardiologist</span><button className="btn btn-secondary text-sm">View</button></RecRow>
      </div>
    </>
  );
}

function AppointmentsSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Appointments</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Video consultations and in-person visits.</p>
      <div className="card p-5">
        <RecRow>
          <div><b className="font-semibold">Video consult · Dr. Arun Verma</b><div className="mt-0.5 text-[13px] text-ink-soft">14 Jul, 4:30 PM (your time)</div></div>
          <Tag variant="green">Confirmed</Tag>
        </RecRow>
        <RecRow>
          <div><b className="font-semibold">Pre-op review</b><div className="mt-0.5 text-[13px] text-ink-soft">To be scheduled after arrival</div></div>
          <Tag variant="grey">Pending</Tag>
        </RecRow>
      </div>
    </>
  );
}

function RecordsSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Medical records</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Your encrypted vault — upload once, share securely with any hospital.</p>
      <div className="card p-5">
        <RecRow><span>📄 Angiography_report.pdf</span><Tag variant="green">Shared</Tag></RecRow>
        <RecRow><span>📄 Blood_work_May.pdf</span><Tag variant="green">Shared</Tag></RecRow>
        <RecRow><span>🖼️ ECG_scan.jpg</span><Tag variant="grey">Private</Tag></RecRow>
        <button className="btn btn-primary mt-3.5 text-sm">⬆ Upload a report</button>
      </div>
    </>
  );
}

function QuotesSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Quotes &amp; payments</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Compare formal quotes and track any payments.</p>
      <div className="card p-5">
        <RecRow>
          <div><b className="font-semibold">Meridian Heart Institute</b><div className="mt-0.5 text-[13px] text-ink-soft">Angioplasty · all-in</div></div>
          <b className="font-bold">$5,400</b>
        </RecRow>
        <RecRow>
          <div><b className="font-semibold">Asha Superspecialty</b><div className="mt-0.5 text-[13px] text-ink-soft">Angioplasty · all-in</div></div>
          <b className="font-bold">$4,950</b>
        </RecRow>
        <RecRow><span>Payments</span><Tag variant="grey">None yet</Tag></RecRow>
      </div>
    </>
  );
}

function JourneySection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Care timeline</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">The full arc of your treatment, in one place.</p>
      <div className="card p-5">
        <ul className="dash-timeline">
          <li className="done"><b>Enquiry started</b><span>8 Jun</span></li>
          <li className="done"><b>Reports reviewed</b><span>10 Jun · opinion received</span></li>
          <li className="cur"><b>Choosing hospital</b><span>Comparing 2 quotes</span></li>
          <li><b>Visa &amp; travel</b><span>Not started</span></li>
          <li><b>Treatment</b><span>Not started</span></li>
          <li><b>Recovery &amp; follow-up</b><span>Not started</span></li>
        </ul>
      </div>
    </>
  );
}

function TravelSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Travel &amp; stay</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Flights, accommodation, airport pickup and attendants.</p>
      <div className="card p-5">
        <RecRow><span>✈️ Flights</span><Tag variant="grey">Add dates</Tag></RecRow>
        <RecRow><span>🏨 Accommodation near hospital</span><Tag variant="grey">Suggest options</Tag></RecRow>
        <RecRow><span>🚕 Airport pickup</span><Tag variant="grey">Arrange</Tag></RecRow>
        <RecRow><span>👥 Attendants travelling</span><span className="text-ink-soft">1</span></RecRow>
      </div>
    </>
  );
}

function DocsSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Documents &amp; visa</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Everything you need for medical travel.</p>
      <div className="card p-5">
        <RecRow><span>📄 Visa invitation letter</span><Tag variant="amber">Upload passport first</Tag></RecRow>
        <RecRow><span>📄 Treatment plan (hospital)</span><Tag variant="green">Ready</Tag></RecRow>
        <RecRow><span>📄 Cost estimate letter</span><Tag variant="green">Ready</Tag></RecRow>
      </div>
    </>
  );
}

function MessagesSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Messages</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">One thread with your dedicated coordinator.</p>
      <div className="card p-5">
        <div className="mb-2.5 max-w-[80%] rounded-xl2 bg-surface-muted px-3.5 py-3 text-sm">
          Hi Rahul, both hospitals have shared quotes. Shall I set up a video call with Dr. Verma this week?
          <div className="mt-1 text-xs text-ink-soft">Coordinator · 9:14 AM</div>
        </div>
        <div className="mb-4 ml-auto max-w-[80%] rounded-xl2 bg-brand-tint px-3.5 py-3 text-sm">
          Yes please, Thursday works.
          <div className="mt-1 text-xs text-ink-soft">You · 9:20 AM</div>
        </div>
        <div className="flex gap-2">
          <input
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
            placeholder="Type a message..."
          />
          <button className="btn btn-primary text-sm">Send</button>
        </div>
      </div>
    </>
  );
}

function ProfileSection() {
  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight">Profile &amp; settings</h1>
      <p className="mb-5 mt-1 text-[13.5px] text-ink-soft">Your details, language and notification preferences.</p>
      <div className="card p-5">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Full name</label>
            <input className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint" defaultValue="Rahul Gupta" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-ink">Mobile</label>
            <input className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint" defaultValue="+234 801 234 5678" />
          </div>
        </div>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-bold text-ink">Preferred language</label>
          <select className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint">
            <option>English</option>
            <option>Arabic</option>
            <option>French</option>
            <option>Swahili</option>
            <option>Bengali</option>
          </select>
        </div>
        <button className="btn btn-primary text-sm">Save changes</button>
      </div>
    </>
  );
}

const SECTION_VIEWS: Record<Section, () => React.ReactNode> = {
  overview: OverviewSection,
  plans: PlansSection,
  enquiries: EnquiriesSection,
  shortlist: ShortlistSection,
  appointments: AppointmentsSection,
  records: RecordsSection,
  quotes: QuotesSection,
  journey: JourneySection,
  travel: TravelSection,
  docs: DocsSection,
  messages: MessagesSection,
  profile: ProfileSection,
};

export function PatientDashboard() {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrimRef = useRef<HTMLDivElement>(null);

  const go = useCallback((s: Section) => {
    setSection(s);
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 860) setDrawerOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const View = SECTION_VIEWS[section];

  const sidebar = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => (
        <div key={item.section}>
          {item.group && (
            <div className="mb-1 mt-4 px-3 text-[11.5px] font-bold uppercase tracking-widest text-ink-soft">
              {item.group}
            </div>
          )}
          <button
            type="button"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14.5px] font-medium transition ${
              section === item.section
                ? "bg-brand-tint font-semibold text-brand-deep"
                : "text-ink-soft hover:bg-surface-muted hover:text-ink"
            }`}
            onClick={() => go(item.section)}
          >
            <span className="w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="dash-layout">
      {/* Scrim */}
      {drawerOpen && (
        <div
          ref={scrimRef}
          className="fixed inset-0 z-30 bg-ink/40 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <aside
        className={`dash-sidebar ${drawerOpen ? "dash-sidebar-open" : ""}`}
      >
        <div className="mb-3.5 flex items-center gap-3 border-b border-line px-2.5 pb-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-brand font-bold text-white">RG</div>
          <div>
            <b className="block text-[15px] font-bold">Rahul G.</b>
            <span className="text-[12.5px] text-ink-soft">Case #SHF-2041</span>
          </div>
        </div>
        {sidebar}
      </aside>

      {/* Main */}
      <main className="dash-main">
        <button
          type="button"
          className="btn btn-secondary mb-4 text-sm lg:hidden"
          onClick={() => setDrawerOpen(true)}
        >
          ☰ Menu
        </button>
        <View />
      </main>
    </div>
  );
}
