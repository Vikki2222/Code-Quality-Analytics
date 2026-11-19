import { useEffect, useRef, useState } from 'react';
import { loginWithGitHub } from '../../api';
import { initLanding } from './landingScene';
import './landing.css';

const STEPS = [
  ['Review', 'You pick a pull request. An AI reviewer reads the diff and reports what it finds, with a severity and a category.'],
  ['Fingerprint', "Each finding gets a fingerprint from what it means and where it is, so rewording it doesn't make it look new."],
  ['Match', "The fingerprint is checked against everything seen before in that repository. A match joins the issue's history."],
  ['Follow', "If a later pull request touches the file and the issue is gone, it's marked resolved. If it returns, you'll know."],
];

const NAV = [
  ['#memory', 'Watch an issue come back'],
  ['#how', 'How a finding becomes a memory'],
  ['#what', 'What you get'],
  ['#creator', 'Creator'],
];

function Mark() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M10 7L3 14l7 7M18 7l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="14" r="2.4" fill="var(--mint)" />
    </svg>
  );
}

/**
 * Logged-out landing page. The markup lives here; the three canvases
 * (backdrop, hero fingerprint, issue timeline) and the scroll behaviour are
 * driven by landingScene.js, which also fills the timeline's readout panel.
 */
export default function LandingPage({ loginError }) {
  const rootRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => initLanding(rootRef.current), []);

  // Small-screen menu: Escape closes it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="lp" ref={rootRef}>
      <canvas id="bg" aria-hidden="true" />

      <header className="top">
        <div className="wrap">
          <div className="bar">
            <a className="brand" href="#top" aria-label="Chronicles, back to top">
              <Mark />
              Chronicles
            </a>
            <nav aria-label="Primary">
              {NAV.map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </nav>
            <button className="nav-cta" type="button" onClick={loginWithGitHub}>
              Connect GitHub
            </button>
            <button
              className="menu-btn"
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="lp-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
          {menuOpen && (
            <nav className="menu" id="lp-menu" aria-label="Sections">
              {NAV.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </header>

      <div className="stage" id="top">
        <canvas id="whorl" aria-hidden="true" />
        <div className="scrim" aria-hidden="true" />
        <a className="scroll-cue" href="#memory">
          Scroll
          <i aria-hidden="true" />
        </a>
        <div className="wrap">
          <section className="hero">
            <div className="eyebrow">AI code review with memory</div>
            <h1>
              <span className="w">This</span> <span className="w">bug</span> <span className="w">has</span>{' '}
              <span className="w">been</span> <span className="w">here</span>{' '}
              <span className="w">
                <em>before.</em>
              </span>
            </h1>
            <div className="lede-row">
              <div className="lede-col">
                <p className="lede">
                  Most AI reviewers read each pull request as if it were the first. Chronicles keeps every finding, so
                  when the same problem returns you see{' '}
                  <strong>each time it happened, who fixed it, and when it came back.</strong>
                </p>
                {loginError && (
                  <p role="alert" className="login-error">
                    {loginError}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="strip" id="memory" aria-labelledby="strip-title">
        <div className="wrap">
          <div className="strip-head">
            <span className="strip-lead">
              <h2 className="strip-title" id="strip-title">
                Follow one issue across 220 pull requests
              </h2>
              <span className="tag">Example data</span>
              <span className="hint mono">Hover a dot, or pick an issue below</span>
            </span>
            <span className="legend">
              <span>
                <i style={{ background: 'var(--mint)' }} />
                seen again
              </span>
              <span>
                <i style={{ background: 'var(--return)' }} />
                came back after a fix
              </span>
              <span>
                <i style={{ background: 'var(--muted)' }} />
                seen once
              </span>
            </span>
          </div>
          <canvas
            id="strip"
            role="img"
            aria-label="Timeline of 220 pull requests. Findings sit in six lanes by category, and arcs join each repeat of the same issue."
          />
          {/* One button per issue, built by landingScene.js: the keyboard and touch way to choose. */}
          <div className="picker" id="picker" role="group" aria-label="Choose an issue to follow" />
          {/* Filled in by landingScene.js as the selected issue changes. */}
          <div className="readout" aria-live="off">
            <svg className="print" id="print" viewBox="0 0 32 32" fill="none" aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <div className="r-meta mono">
                <span id="r-id" />
                <span className="sev" id="r-sev" />
                <span id="r-cat" />
              </div>
              <div className="r-title" id="r-title" />
              <div className="r-file mono" id="r-file" />
              <ul className="trail mono" id="r-trail" />
            </div>
            <div className="seen">
              <div>
                <b id="r-count" />
                <span>times seen</span>
              </div>
              <div className="step">
                <button type="button" id="prev" aria-label="Previous issue">
                  &larr;
                </button>
                <button type="button" id="next" aria-label="Next issue">
                  &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="band" id="how">
          <h2>
            How a finding becomes a <em>memory</em>
          </h2>
          <ol className="steps">
            {STEPS.map(([title, body], i) => (
              <li key={title}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="band" id="what">
          <h2>
            What you can see that a single review <em>can&apos;t</em> show
          </h2>
          <div className="gets">
            <div>
              <span className="tag">Example</span>
              <div className="k ret">4&times;</div>
              <h3>Recurring issues</h3>
              <p>The problems that keep returning, ranked by how often, each with its full timeline across pull requests.</p>
            </div>
            <div>
              <span className="tag">Example</span>
              <div className="k flag">17</div>
              <h3>Hotspots</h3>
              <p>
                The files that collect the most findings, so refactoring time goes where it pays off. Here, the worst
                file has 17.
              </p>
            </div>
            <div>
              <span className="tag">Example</span>
              <div className="k mint">82</div>
              <h3>Health score</h3>
              <p>
                One number per repository out of 100, recorded after every review, so you can tell whether things are
                improving.
              </p>
            </div>
          </div>
        </section>

        <section className="close" id="start">
          <h2>
            Start your repository&apos;s <em>chronicle.</em>
          </h2>
          <div className="cta-col">
            <button className="cta" type="button" onClick={loginWithGitHub}>
              Connect GitHub
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <span className="fine">
              GitHub will ask you to approve access to your profile, email address and repositories. Chronicles uses it
              to read your pull requests.
            </span>
          </div>
        </section>

        <section className="maker" id="creator" aria-labelledby="maker-name">
          <div className="eyebrow">Creator</div>
          <div className="maker-row">
            <div className="avatar" aria-hidden="true">
              VP
            </div>
            <div className="maker-body">
              <h2 className="maker-name" id="maker-name">
                Vignesh P
              </h2>
              <p>
                Chronicles is designed and built by Vignesh P, from the review pipeline and the fingerprinting that links
                repeat findings to this interface.
              </p>
              <ul className="stack mono" aria-label="Built with">
                {['React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'].map((tech) => (
                  <li key={tech}>{tech}</li>
                ))}
              </ul>
            </div>
            <a className="ghost" href="https://github.com/Vikki2222" target="_blank" rel="noreferrer">
              GitHub profile <span aria-hidden="true">&#8599;</span>
            </a>
          </div>
        </section>

        <footer className="mono">
          <span>&copy; 2026 Vignesh P &middot; Chronicles</span>
          <span>The timeline above uses example data.</span>
        </footer>
      </div>
    </div>
  );
}
