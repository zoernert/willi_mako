import { GetServerSideProps } from 'next';
import { getLatestFAQs } from '../../lib/faq-api';
import { generateAtomEntry } from '../../lib/seo-utils';

export default function AtomFeed() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const latestFAQs = await getLatestFAQs(20);
    const latestUpdate = latestFAQs.length > 0 ? latestFAQs[0].updated_at : new Date().toISOString();
    
    const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Willi-Mako FAQ Updates - Energiewirtschaft Wissen</title>
  <subtitle>Neueste FAQ-Beiträge zur Marktkommunikation in der Energiewirtschaft</subtitle>
  <link href="https://stromhaltig.de/wissen" />
  <link href="https://stromhaltig.de/atom.xml" rel="self" type="application/atom+xml" />
  <id>https://stromhaltig.de/wissen</id>
  <updated>${new Date(latestUpdate).toISOString()}</updated>
  <generator uri="https://stromhaltig.de" version="1.0">Willi-Mako FAQ System</generator>
  <rights>© STROMDAO GmbH. Creative Commons Attribution-ShareAlike 4.0</rights>
  <author>
    <name>Willi-Mako Expertensystem</name>
    <email>info@stromhaltig.de</email>
    <uri>https://stromhaltig.de</uri>
  </author>
  <category term="Energiewirtschaft" />
  <category term="FAQ" />
  <category term="Marktkommunikation" />
  ${latestFAQs.map(faq => generateAtomEntry(faq)).join('\n')}
</feed>`;

    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.write(atom);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    console.error('Error generating Atom feed:', error);
    
    res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
    res.statusCode = 500;
    res.write(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed Error</title>
  <subtitle>Error generating Atom feed</subtitle>
</feed>`);
    res.end();

    return {
      props: {},
    };
  }
};
