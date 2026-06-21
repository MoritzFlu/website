import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Network from '../NetworkSim/Network';
import publicationDict from '../../data/Publications';
import projectsDict from '../../data/Projects';

const links = [
  { label: 'Email', href: 'mailto:moritz.fluechter@uni-tuebingen.de' },
  { label: 'University', href: 'https://kn.inf.uni-tuebingen.de/' },
  { label: 'Google Scholar', href: 'https://scholar.google.com/' },
  { label: 'GitHub', href: 'https://github.com/' },
];

const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Simulator', href: '#simulator' },
  { label: 'Publications', href: '#publications' },
  { label: 'Projects', href: '#projects' },
];

const talks = [
  {
    title: 'Kernel-Programmierung zur Laufzeit mit eBPF',
    where: 'Tuebix',
    year: '2026',
  },
  {
    title: 'Reading kernel code without C-ing',
    where: 'Tuebix',
    year: '2025',
  },
  {
    title: 'BIER-TE extensions for larger multicast domains',
    where: 'Research seminar',
    year: '2024',
  },
];

const teaching = [
  {
    title: 'Computer Networks',
    term: 'Winter term',
    role: 'Teaching assistant',
  },
  {
    title: 'Communication Networks Lab',
    term: 'Summer term',
    role: 'Lab supervision',
  },
];

function getYear(date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getFullYear()) ? '' : parsed.getFullYear();
}

function normaliseProjects(projects) {
  return Object.values(projects).map((project) => ({
    name: project.title,
    href: project.link && project.link !== 'TODO' ? project.link : '/sim',
    tag: project.link && project.link !== 'TODO' ? 'project' : 'demo',
    desc: project.desctiption || project.description || '',
  }));
}

function HomePage() {
  const publications = useMemo(
    () => Object.values(publicationDict).sort((a, b) => new Date(b.date) - new Date(a.date)),
    []
  );
  const filters = useMemo(
    () => ['all', ...Array.from(new Set(publications.map((pub) => pub.type)))],
    [publications]
  );
  const [activeFilter, setActiveFilter] = useState('all');
  const filteredPublications = publications.filter(
    (pub) => activeFilter === 'all' || pub.type === activeFilter
  );
  const projects = normaliseProjects(projectsDict);

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="brand-mark" to="/" aria-label="Moritz Flüchter homepage">
          <span className="brand-dot" />
          <span className="brand-full">moritz flüchter</span>
          <span className="brand-short">m flüchter</span>
        </Link>
        <nav className="top-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          <Link to="/sim">Live demo</Link>
        </nav>
        <Link className="mobile-sim-link" to="/sim" aria-label="Open simulator">
          /sim
        </Link>
      </header>

      <section className="hero-section" id="about">
        <div className="eyebrow">Chair of Communication Networks · University of Tübingen</div>
        <h1>Moritz Flüchter</h1>
        <p className="hero-role">PhD student & research assistant - programmable networks</p>
        <p className="hero-copy">
          I work on bringing determinism and flexibility to communication networks: Time-Sensitive
          Networking, BIER multicast, and P4 data-plane programming, with a recent focus on
          satellite networking and eBPF on Linux.
        </p>
        <div className="hero-actions">
          {links.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
              {link.label} ↗
            </a>
          ))}
        </div>
      </section>

      <section className="content-section simulator-section" id="simulator">
        <div className="section-heading">
          <span>Network simulator</span>
          <i />
        </div>
        <div className="simulator-card">
          <div className="live-badge" aria-label="Live simulator status">
            <b />
            live
          </div>
          <div className="network-preview" aria-label="Live network simulator preview">
            <Network
              deferStart
              asnCount={2}
              layout={{
                asnRadius: 380,
                subnetRadius: 130,
                subnetSpreadAngle: 0.9,
              }}
              limits={{
                minRoutersPerAsn: 2,
                maxRoutersPerAsn: 2,
                minSwitchesPerSubnet: 2,
                maxSwitchesPerSubnet: 3,
                minServersPerSubnet: 1,
                maxServersPerSubnet: 2,
                minClientsPerSubnet: 1,
                maxClientsPerSubnet: 2,
              }}
            />
          </div>
          <div className="simulator-copy">
            <div>
              <h2>This Network Simulator runs in your browser.</h2>
              <p>
                A fun project to understand simulator architeture and how different protocols are actually implemented.
                The basic simulator, STP, ARP, IPv4 and ICMP were implemented by hand. RIP, BGP, TCP/UDP, DNS and HTTP were added with support from LLMs.
              </p>
            </div>
            <Link className="primary-button" to="/sim">
              Open simulator
            </Link>
          </div>
        </div>
      </section>

      <section className="content-section publications-section" id="publications">
        <div className="section-heading publications-heading">
          <span>Publications</span>
          <i />
          <div className="publication-filters" aria-label="Publication filters">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={filter === activeFilter ? 'active' : ''}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="publication-list">
          {filteredPublications.map((publication) => (
            <a
              className="publication-row"
              href={publication.link}
              target="_blank"
              rel="noreferrer"
              key={publication.title}
            >
              <span className="publication-year">{getYear(publication.date)}</span>
              <span className="publication-main">
                <strong>{publication.title}</strong>
                <small>{publication.authors}</small>
                <em>{publication.venue}</em>
              </span>
              <span className="publication-type">{publication.type}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="content-section projects-section" id="projects">
        <div className="section-heading">
          <span>Projects</span>
          <i />
        </div>
        <div className="project-grid">
          {projects.map((project) => {
            const external = project.href.startsWith('http');
            const projectContent = (
              <>
                <span className="project-title">
                  <strong>{project.name}</strong>
                  <b>{project.tag}</b>
                </span>
                <span>{project.desc}</span>
                <em>{external ? 'open ↗' : 'open'}</em>
              </>
            );

            return external ? (
              <a key={project.name} className="project-card" href={project.href} target="_blank" rel="noreferrer">
                {projectContent}
              </a>
            ) : (
              <Link key={project.name} className="project-card" to={project.href}>
                {projectContent}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="content-section split-section">
        <div>
          <div className="section-heading">
            <span>Talks</span>
            <i />
          </div>
          {talks.map((talk) => (
            <article className="compact-row" key={talk.title}>
              <strong>{talk.title}</strong>
              <span>
                {talk.year} · {talk.where}
              </span>
            </article>
          ))}
        </div>
        <div>
          <div className="section-heading">
            <span>Teaching</span>
            <i />
          </div>
          {teaching.map((course) => (
            <article className="compact-row" key={course.title}>
              <strong>{course.title}</strong>
              <span>
                {course.term} · {course.role}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span>© 2026 Moritz Flüchter · Tübingen</span>
        <a href="mailto:moritz.fluechter@uni-tuebingen.de">moritz.fluechter@uni-tuebingen.de</a>
      </footer>
    </main>
  );
}

export default HomePage;
