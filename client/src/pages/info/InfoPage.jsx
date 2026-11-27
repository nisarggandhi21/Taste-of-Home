import Seo from '../../components/seo/Seo';
import { Link } from 'react-router-dom';
import { FOOTER_GROUPS, PAGES } from './pages';
import './InfoPage.scss';

// One of the footer pages (About, Help, Privacy, ...). The text lives in ./pages.js.
function InfoPage({ slug }) {
  const page = PAGES[slug];

  return (
    <div className="infoPage">
      <Seo
        title={`${page.title} | Taste of Home`}
        description={page.description}
        path={`/${slug}`}
      />
      <div className="container">
        <nav className="sideNav" aria-label="Information pages">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading}>
              <h2>{group.heading}</h2>
              {group.slugs.map((other) => (
                <Link
                  key={other}
                  to={`/${other}`}
                  className={other === slug ? 'current' : ''}
                  aria-current={other === slug ? 'page' : undefined}
                >
                  {PAGES[other].title}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <article>
          <h1>{page.title}</h1>
          <p className="intro">{page.intro}</p>
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((text) => (
                <p key={text}>{text}</p>
              ))}
              {section.list && (
                <ul>
                  {section.list.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}

export default InfoPage;
