import Link from "next/link";
import { BadgeDollarSign, Bookmark, Clock3, Download, SearchCheck, ShieldCheck, Sparkles, Users } from "lucide-react";
import { InstallAppButton } from "@/components/install-app-button";

const examples = [
  "cheapest DeWalt impact driver delivered this week",
  "55 inch Samsung TV under $400 local pickup",
  "AirPods Pro 2 fastest reputable seller"
];

export default function HomePage() {
  return (
    <main>
      <section className="hero shell">
        <div className="eyebrow"><Sparkles size={15} /> Shopper-first comparison</div>
        <h1>Search once. <span className="gradient-text">Buy smarter.</span></h1>
        <p>
          RightPrice compares the real purchase decision — price, shipping, arrival time, seller trust,
          returns, local pickup and cashback — then ranks the options by what matters to you.
        </p>
        <form className="search-box" action="/search">
          <input name="q" aria-label="What are you looking for?" placeholder="What are you looking for? Try: cheapest Milwaukee drill by Friday" required minLength={2} />
          <button className="primary-button" type="submit">Find my best price</button>
        </form>
        <div className="quick-examples" aria-label="Example searches">
          {examples.map((example) => <Link className="chip" href={`/search?q=${encodeURIComponent(example)}`} key={example}>{example}</Link>)}
        </div>
        <div className="hero-actions"><InstallAppButton /><Link className="secondary-button" href="/lists"><Bookmark size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} /> Saved items</Link></div>
      </section>

      <section className="section shell">
        <div className="grid-3">
          <article className="feature-card">
            <div className="icon-box"><SearchCheck size={21} /></div>
            <h3>True-cost comparison</h3>
            <p>Compare item price plus shipping and fees, then show cashback separately so savings are understandable.</p>
          </article>
          <article className="feature-card">
            <div className="icon-box"><Clock3 size={21} /></div>
            <h3>Price vs. speed</h3>
            <p>Choose cheapest, fastest, local pickup, most trusted or balanced value without repeating the search.</p>
          </article>
          <article className="feature-card">
            <div className="icon-box"><ShieldCheck size={21} /></div>
            <h3>Shopper-first ranking</h3>
            <p>Affiliate compensation is deliberately excluded from the ranking algorithm. Your criteria decide what wins.</p>
          </article>
          <article className="feature-card">
            <div className="icon-box"><BadgeDollarSign size={21} /></div>
            <h3>Cashback-ready</h3>
            <p>RightPrice can share confirmed affiliate revenue with shoppers when each merchant program permits it.</p>
          </article>
          <article className="feature-card">
            <div className="icon-box"><Users size={21} /></div>
            <h3>Refer & earn</h3>
            <p>Direct referral attribution is built in, with rewards tied to legitimate qualifying transactions rather than signups.</p>
          </article>
          <article className="feature-card">
            <div className="icon-box"><Sparkles size={21} /></div>
            <h3>Modular commerce engine</h3>
            <p>Retailers plug into one normalized connector contract so new sources can be added without rewriting RightPrice.</p>
          </article>
          <article className="feature-card">
            <div className="icon-box"><Download size={21} /></div>
            <h3>Installable & offline-aware</h3>
            <p>Install RightPrice as a PWA and keep saved comparison snapshots available even when your connection drops.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
