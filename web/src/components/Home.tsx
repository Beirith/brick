import Link from 'next/link';

const features = [
  { icon: '◧', title: 'Fractional ownership', text: 'Buy shares of real properties with mBRL. Own as little as one share, or build a larger stake over time.' },
  { icon: '↗', title: 'Rental income', text: 'Owners deposit rental income, and it is distributed to every investor in proportion to their shares.' },
  { icon: '☰', title: 'Owner governance', text: 'Property decisions go to a vote weighted by shares. An AI agent can propose and analyze, but never votes or moves funds.' },
];

const steps = [
  { title: 'Connect your wallet', text: 'Connect a browser wallet such as MetaMask on the HSK Testnet. No real funds are ever used.' },
  { title: 'Explore and buy shares', text: 'Browse the marketplace, choose a property, and buy the number of shares that fit your budget.' },
  { title: 'Earn income and vote', text: 'Claim your share of rental income as it is generated, and vote on decisions alongside other owners.' },
];

export function Home() {
  return <>
    <section className="hero">
      <div>
        <span className="eyebrow">REAL ESTATE, SHARED</span>
        <h1>Own a piece of real estate.<br /><span>Starting with one share.</span></h1>
        <p>Brick turns properties into tradable shares. Buy in, earn a proportional slice of rental income, and help decide what happens to the property next.</p>
        <div className="row">
          <Link className="button" href="/marketplace">Go to marketplace</Link>
          <Link className="button button-secondary" href="/properties/new">Add a property</Link>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="hero-block one" /><div className="hero-block two" /><div className="hero-block three" /><span>Build your portfolio.<br />One brick at a time.</span></div>
    </section>

    <section className="section-space">
      <div className="section-heading"><div><span className="eyebrow">WHY BRICK</span><h2>Own, earn, decide</h2></div></div>
      <div className="landing-features">
        {features.map(feature => <article className="panel feature-card" key={feature.title}>
          <span className="feature-icon" aria-hidden="true">{feature.icon}</span>
          <h3>{feature.title}</h3>
          <p className="muted">{feature.text}</p>
        </article>)}
      </div>
    </section>

    <section className="section-space">
      <div className="section-heading"><div><span className="eyebrow">HOW IT WORKS</span><h2>Three steps to your first share</h2></div></div>
      <div className="landing-steps">
        {steps.map((step, index) => <div className="landing-step" key={step.title}>
          <span className="step-number">{index + 1}</span>
          <h3>{step.title}</h3>
          <p className="muted">{step.text}</p>
        </div>)}
      </div>
    </section>

    <section className="landing-cta section-space">
      <span className="eyebrow">READY WHEN YOU ARE</span>
      <h2>Explore properties on the marketplace</h2>
      <p>See what is currently available and start building your portfolio.</p>
      <Link className="button" href="/marketplace">Go to marketplace</Link>
    </section>

    <small className="muted landing-footnote">Demo experience on the HSK Testnet. mBRL is a fictional currency with no real value; only free test HSK is used for network fees.</small>
  </>;
}
