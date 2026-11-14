import { describe, expect, it } from 'vitest';

import { en } from '../../i18n/en';
import { buildHomeReferenceHtml } from './home-reference-html';

describe('buildHomeReferenceHtml', () => {
  it('keeps the supplied page layout and animation code while wiring app actions', () => {
    const html = buildHomeReferenceHtml({
      eyebrow: en.eyebrow,
      heroLineOne: en.heroLineOne,
      heroLineTwo: en.heroLineTwo,
      intro: en.intro,
      landingGetStarted: en.landingGetStarted,
      demoExampleGame: en.demoExampleGame,
      demoTitle: en.demoTitle,
      demoSubtitle: en.demoSubtitle,
      demoAvailability: en.demoAvailability,
      demoOnePlaceOpen: en.demoOnePlaceOpen,
      landingFooterLead: en.landingFooterLead,
      landingFooterEmphasis: en.landingFooterEmphasis,
      languageSwitchLabel: en.authSwitchToGreek,
      languageCode: 'EN',
    });

    expect(html).toContain('height:100vh;height:100dvh;min-height:600px');
    expect(html).toContain('animation:om-drawline 2.6s cubic-bezier(.5,0,.2,1) .2s forwards');
    expect(html).toContain('animation:om-breathe 7s ease-in-out 3s infinite');
    expect(html).toContain('@keyframes om-ball');
    expect(html).toContain('animation-name:om-spin;animation-timing-function:linear');
    expect(html).toContain('Example game');
    expect(html).toContain('Nicosia, this week, evening');
    expect(html).toContain('Somewhere tonight, a team is one short.');
    expect(html).toContain('id="home-signin"');
    expect(html).toContain("postMessage('switch-language')");
    expect(html).not.toContain('src="onemore-logo.png"');
  });

  it('renders the provided Greek copy into the same animation layout', () => {
    const html = buildHomeReferenceHtml({
      eyebrow: 'ΠΟΔΟΣΦΑΙΡΟ, ΟΠΩΣ ΣΟΥ ΑΡΕΣΕΙ',
      heroLineOne: 'Ο αγώνας σου',
      heroLineTwo: 'ξεκινά εδώ.',
      intro: 'Βρες έναν τοπικό αγώνα και οργάνωσε την ομάδα σου.',
      landingGetStarted: 'Σύνδεση ή δημιουργία λογαριασμού',
      demoExampleGame: 'Παράδειγμα αγώνα',
      demoTitle: 'Ένας αγώνας κοντά σου',
      demoSubtitle: 'Λευκωσία, αυτή την εβδομάδα, το βράδυ',
      demoAvailability: '2 διαθέσιμες θέσεις',
      demoOnePlaceOpen: '1 διαθέσιμη θέση',
      landingFooterLead: 'Κάπου απόψε, μια ομάδα χρειάζεται έναν ακόμη.',
      landingFooterEmphasis: 'Γίνε ο ένας ακόμη.',
      languageSwitchLabel: 'Αλλαγή γλώσσας σε English',
      languageCode: 'EL',
    });

    expect(html).toContain('Ο αγώνας σου');
    expect(html).toContain('ξεκινά εδώ.');
    expect(html).toContain('aria-label="Αλλαγή γλώσσας σε English"');
    expect(html).toContain('Γίνε ο ένας ακόμη.');
    expect(html).toContain('animation-name:om-ball');
  });
});
