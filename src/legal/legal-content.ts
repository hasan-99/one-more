import type { Locale } from '@/i18n';

export type LegalKind = 'privacy' | 'terms' | 'support' | 'deletion' | 'licenses';
export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

// `{email}` is replaced by the configured support mailbox (see contact.ts); `{developer}` by the publisher name.
export const legalContent: Record<LegalKind, Record<Locale, LegalDoc>> = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      intro:
        'ONE MORE helps football players in Cyprus find games, join teams and take on other teams. This policy explains what we collect, why, who receives it and how you control it. Publisher: {developer}.',
      sections: [
        {
          heading: 'What we collect',
          paragraphs: [
            'Account: your email address and password. The password is stored only as a salted hash by our authentication provider; we cannot read it.',
            'Profile you give us: display name, a private phone number (visible only to you), city and area, preferred position, skill level, strong foot, shirt number, preferred game formats and available days, language and notification choices.',
            'Activity you create: games you organise or ask to join, waitlist entries, team memberships and invitations, team challenges, chat messages in games you play in, reports you send, players you block, and in-app notifications.',
            'Technical data: our providers log your IP address and request details for security and to run the service. Your sign-in session is kept in secure storage on your device (in the browser on the web).',
            'We do not collect your precise location, contacts, camera, microphone, health data or advertising identifier. We use no analytics, advertising or tracking SDKs and do not track you across other apps or websites.',
          ],
        },
        {
          heading: 'Why we use it',
          paragraphs: [
            'To create and secure your account, show your player profile in games and teams, let organisers approve players, run game chat and waitlists, send you notifications about your games, teams and challenges (in the app and, if enabled, by email), keep the service safe (rate limits, reports, moderation) and answer your requests.',
            'Legal bases (GDPR): performing our agreement with you (account, games, teams, chat), our legitimate interest in security and preventing abuse, and your consent for optional email notifications, which you can switch off in Settings.',
          ],
        },
        {
          heading: 'Who receives it',
          paragraphs: [
            'Other players see only what is needed to play together: your display name, position, skill level, shirt number, team and your messages in a game chat. Your email and phone number are never shown to other players.',
            'Service providers acting for us: Supabase (database, authentication, serverless functions), Resend (sending notification and account emails), Expo / EAS (hosting the web app and delivering app updates; update requests include your IP address and app version). They may process data outside the EU/EEA under standard contractual clauses.',
            'We do not sell your data and do not share it for advertising.',
          ],
        },
        {
          heading: 'How long we keep it',
          paragraphs: [
            'We keep your data while your account exists. When you delete your account it is erased immediately from our database, including your profile, games you organised, join requests, chat messages, notifications and sign-in. Provider backups, if any, are overwritten on the provider’s normal schedule. We keep nothing for longer unless the law requires it.',
          ],
        },
        {
          heading: 'Your rights and how to delete your data',
          paragraphs: [
            'You can access and correct your profile in the app (Profile), export or ask about your data by email, restrict or object to processing, withdraw consent for emails (Settings) and delete your account in the app (Settings → Delete my account). You can also ask for deletion on our public page: /delete-account.',
            'Write to {email} for any privacy request; we answer within 30 days. You may complain to the Office of the Commissioner for Personal Data Protection of Cyprus (dataprotection.gov.cy).',
          ],
        },
        {
          heading: 'Security',
          paragraphs: [
            'All traffic uses HTTPS. Data is protected by row-level security so each user can reach only their own private data, passwords are hashed, access to the production database is limited to named maintainers, and abusive behaviour is rate limited.',
          ],
        },
        {
          heading: 'Children',
          paragraphs: [
            'ONE MORE is for people aged 16 and over. We do not knowingly collect data from younger children; contact us and we will delete it.',
          ],
        },
        {
          heading: 'Changes and contact',
          paragraphs: [
            'We will update this page and its date when our practices change, and tell you in the app for important changes. Contact: {developer}, {email}.',
          ],
        },
      ],
    },
    el: {
      title: 'Πολιτική Απορρήτου',
      intro:
        'Το ONE MORE βοηθά ποδοσφαιριστές στην Κύπρο να βρουν αγώνες, να μπουν σε ομάδες και να προκαλέσουν άλλες ομάδες. Εδώ εξηγούμε τι συλλέγουμε, γιατί, ποιος το λαμβάνει και πώς το ελέγχεις. Εκδότης: {developer}.',
      sections: [
        {
          heading: 'Τι συλλέγουμε',
          paragraphs: [
            'Λογαριασμός: το email και ο κωδικός σου. Ο κωδικός αποθηκεύεται μόνο ως κρυπτογραφημένο hash από τον πάροχο ταυτοποίησης· δεν μπορούμε να τον διαβάσουμε.',
            'Προφίλ που μας δίνεις: όνομα εμφάνισης, ιδιωτικό τηλέφωνο (ορατό μόνο σε εσένα), πόλη και περιοχή, θέση, επίπεδο, δυνατό πόδι, αριθμός φανέλας, προτιμώμενες μορφές αγώνα και διαθέσιμες μέρες, γλώσσα και επιλογές ειδοποιήσεων.',
            'Δραστηριότητα που δημιουργείς: αγώνες που διοργανώνεις ή ζητάς να παίξεις, λίστες αναμονής, συμμετοχή σε ομάδες και προσκλήσεις, προκλήσεις ομάδων, μηνύματα στη συνομιλία αγώνων όπου συμμετέχεις, αναφορές που στέλνεις, παίκτες που αποκλείεις και ειδοποιήσεις εντός εφαρμογής.',
            'Τεχνικά δεδομένα: οι πάροχοί μας καταγράφουν τη διεύθυνση IP και στοιχεία αιτημάτων για ασφάλεια και λειτουργία. Η συνεδρία σου φυλάσσεται σε ασφαλή αποθήκευση στη συσκευή (στον περιηγητή στο web).',
            'Δεν συλλέγουμε ακριβή τοποθεσία, επαφές, κάμερα, μικρόφωνο, δεδομένα υγείας ή αναγνωριστικό διαφημίσεων. Δεν χρησιμοποιούμε analytics, διαφημίσεις ή εργαλεία παρακολούθησης και δεν σε παρακολουθούμε σε άλλες εφαρμογές ή ιστοσελίδες.',
          ],
        },
        {
          heading: 'Γιατί τα χρησιμοποιούμε',
          paragraphs: [
            'Για να δημιουργήσουμε και να ασφαλίσουμε τον λογαριασμό σου, να εμφανίζουμε το προφίλ σου σε αγώνες και ομάδες, να εγκρίνουν οι διοργανωτές παίκτες, να λειτουργεί η συνομιλία και οι λίστες αναμονής, να σου στέλνουμε ειδοποιήσεις (στην εφαρμογή και, αν το ενεργοποιήσεις, με email), να διατηρούμε την υπηρεσία ασφαλή (όρια χρήσης, αναφορές, εποπτεία) και να απαντάμε στα αιτήματά σου.',
            'Νομικές βάσεις (GDPR): εκτέλεση της συμφωνίας μας (λογαριασμός, αγώνες, ομάδες, συνομιλία), έννομο συμφέρον για ασφάλεια και πρόληψη κατάχρησης, και συγκατάθεσή σου για προαιρετικά email, που απενεργοποιείς στις Ρυθμίσεις.',
          ],
        },
        {
          heading: 'Ποιος τα λαμβάνει',
          paragraphs: [
            'Οι άλλοι παίκτες βλέπουν μόνο όσα χρειάζονται για να παίξετε μαζί: όνομα εμφάνισης, θέση, επίπεδο, αριθμό φανέλας, ομάδα και τα μηνύματά σου στη συνομιλία αγώνα. Το email και το τηλέφωνό σου δεν εμφανίζονται ποτέ σε άλλους παίκτες.',
            'Πάροχοι που ενεργούν για λογαριασμό μας: Supabase (βάση δεδομένων, ταυτοποίηση, serverless λειτουργίες), Resend (αποστολή email ειδοποιήσεων και λογαριασμού), Expo / EAS (φιλοξενία web και παράδοση ενημερώσεων εφαρμογής· τα αιτήματα ενημέρωσης περιλαμβάνουν IP και έκδοση εφαρμογής). Μπορεί να επεξεργάζονται δεδομένα εκτός ΕΕ/ΕΟΧ με τυποποιημένες συμβατικές ρήτρες.',
            'Δεν πουλάμε τα δεδομένα σου και δεν τα μοιραζόμαστε για διαφημίσεις.',
          ],
        },
        {
          heading: 'Πόσο καιρό τα φυλάσσουμε',
          paragraphs: [
            'Τα φυλάσσουμε όσο υπάρχει ο λογαριασμός σου. Όταν τον διαγράψεις, διαγράφονται άμεσα από τη βάση μας το προφίλ, οι αγώνες που διοργάνωσες, τα αιτήματα συμμετοχής, τα μηνύματα, οι ειδοποιήσεις και η σύνδεσή σου. Τα αντίγραφα ασφαλείας του παρόχου, αν υπάρχουν, αντικαθίστανται με τον κανονικό κύκλο του. Δεν κρατάμε τίποτα περισσότερο, εκτός αν το απαιτεί ο νόμος.',
          ],
        },
        {
          heading: 'Τα δικαιώματά σου και πώς διαγράφεις τα δεδομένα σου',
          paragraphs: [
            'Μπορείς να δεις και να διορθώσεις το προφίλ σου στην εφαρμογή (Προφίλ), να ζητήσεις πρόσβαση ή αντίγραφο των δεδομένων σου με email, να περιορίσεις ή να αντιταχθείς στην επεξεργασία, να αποσύρεις τη συγκατάθεση για email (Ρυθμίσεις) και να διαγράψεις τον λογαριασμό σου στην εφαρμογή (Ρυθμίσεις → Διαγραφή λογαριασμού). Μπορείς επίσης να ζητήσεις διαγραφή στη δημόσια σελίδα: /delete-account.',
            'Γράψε στο {email} για κάθε αίτημα απορρήτου· απαντάμε εντός 30 ημερών. Μπορείς να υποβάλεις καταγγελία στο Γραφείο Επιτρόπου Προστασίας Δεδομένων Προσωπικού Χαρακτήρα Κύπρου (dataprotection.gov.cy).',
          ],
        },
        {
          heading: 'Ασφάλεια',
          paragraphs: [
            'Όλη η κίνηση χρησιμοποιεί HTTPS. Τα δεδομένα προστατεύονται με ασφάλεια επιπέδου γραμμής ώστε κάθε χρήστης να φτάνει μόνο στα δικά του ιδιωτικά δεδομένα, οι κωδικοί αποθηκεύονται ως hash, η πρόσβαση στην παραγωγική βάση περιορίζεται σε ονομαστούς διαχειριστές και η καταχρηστική συμπεριφορά περιορίζεται με όρια χρήσης.',
          ],
        },
        {
          heading: 'Ανήλικοι',
          paragraphs: [
            'Το ONE MORE απευθύνεται σε άτομα 16 ετών και άνω. Δεν συλλέγουμε εν γνώσει μας δεδομένα μικρότερων παιδιών· επικοινώνησε μαζί μας και θα τα διαγράψουμε.',
          ],
        },
        {
          heading: 'Αλλαγές και επικοινωνία',
          paragraphs: [
            'Θα ενημερώνουμε αυτή τη σελίδα και την ημερομηνία της όταν αλλάζουν οι πρακτικές μας και θα σε ειδοποιούμε στην εφαρμογή για σημαντικές αλλαγές. Επικοινωνία: {developer}, {email}.',
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Use',
      intro:
        'These terms govern your use of ONE MORE, published by {developer}. By creating an account you agree to them and to the Privacy Policy.',
      sections: [
        {
          heading: 'Who can use ONE MORE',
          paragraphs: [
            'You must be 16 or older, give accurate information and keep your sign-in details private. You are responsible for activity under your account.',
          ],
        },
        {
          heading: 'What the service does',
          paragraphs: [
            'ONE MORE connects players to organise and join football games, teams and team challenges. We do not book pitches, collect payments or employ organisers. Any price shown is set by the organiser and is paid between players outside the app. Joining a game needs the organiser’s approval.',
          ],
        },
        {
          heading: 'Community rules',
          paragraphs: [
            'Be respectful. Do not harass, threaten, discriminate, spam, impersonate others, post illegal, sexual, violent or hateful content, share other people’s private information, or misuse the service (including automated or excessive requests).',
            'Chats and profiles are user-generated content. You can report any message and block any player. We review reports, may remove content, and may warn, suspend or delete accounts that break these rules. Organisers can remove messages in their games.',
          ],
        },
        {
          heading: 'Playing safely',
          paragraphs: [
            'Football carries a risk of injury. You take part at your own risk, should be fit to play and should meet people in safe, public places. ONE MORE is not responsible for what happens at games or between players, to the extent the law allows.',
          ],
        },
        {
          heading: 'Your content',
          paragraphs: [
            'You keep ownership of what you post. You give us the right to store and display it in the service so it can work (to the players in your game or team). Do not post content you do not have the right to share.',
          ],
        },
        {
          heading: 'Availability and changes',
          paragraphs: [
            'We work to keep the service running but do not guarantee it is always available or error-free. We may change or stop features and will update these terms when needed. Continuing to use the app after a change means you accept it.',
          ],
        },
        {
          heading: 'Ending your use',
          paragraphs: [
            'You can delete your account at any time in Settings. We may suspend or remove accounts that break these terms or the law.',
          ],
        },
        {
          heading: 'Liability and law',
          paragraphs: [
            'The service is provided “as is”. Nothing here limits rights you have under consumer law or liability that cannot be excluded. These terms are governed by the laws of the Republic of Cyprus and the courts of Cyprus, without limiting your mandatory consumer rights.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: ['{developer}, {email}. See the Support page for abuse reports and help.'],
        },
      ],
    },
    el: {
      title: 'Όροι Χρήσης',
      intro:
        'Οι όροι αυτοί διέπουν τη χρήση του ONE MORE από τον εκδότη {developer}. Με τη δημιουργία λογαριασμού τους αποδέχεσαι, καθώς και την Πολιτική Απορρήτου.',
      sections: [
        {
          heading: 'Ποιος μπορεί να χρησιμοποιεί το ONE MORE',
          paragraphs: [
            'Πρέπει να είσαι 16 ετών ή μεγαλύτερος, να δίνεις ακριβή στοιχεία και να κρατάς ιδιωτικά τα στοιχεία σύνδεσής σου. Είσαι υπεύθυνος για τη δραστηριότητα του λογαριασμού σου.',
          ],
        },
        {
          heading: 'Τι κάνει η υπηρεσία',
          paragraphs: [
            'Το ONE MORE συνδέει παίκτες για να οργανώνουν και να συμμετέχουν σε αγώνες ποδοσφαίρου, ομάδες και προκλήσεις ομάδων. Δεν κλείνουμε γήπεδα, δεν εισπράττουμε πληρωμές και δεν απασχολούμε διοργανωτές. Κάθε τιμή που εμφανίζεται ορίζεται από τον διοργανωτή και πληρώνεται μεταξύ παικτών εκτός εφαρμογής. Η συμμετοχή σε αγώνα απαιτεί έγκριση του διοργανωτή.',
          ],
        },
        {
          heading: 'Κανόνες κοινότητας',
          paragraphs: [
            'Να είσαι ευγενικός. Μην παρενοχλείς, απειλείς, κάνεις διακρίσεις, στέλνεις spam, υποδύεσαι άλλους, δημοσιεύεις παράνομο, σεξουαλικό, βίαιο ή μισαλλόδοξο περιεχόμενο, μοιράζεσαι ιδιωτικά στοιχεία άλλων ή καταχράσαι την υπηρεσία (και με αυτοματοποιημένα ή υπερβολικά αιτήματα).',
            'Οι συνομιλίες και τα προφίλ είναι περιεχόμενο χρηστών. Μπορείς να αναφέρεις κάθε μήνυμα και να αποκλείσεις κάθε παίκτη. Εξετάζουμε τις αναφορές, μπορεί να αφαιρούμε περιεχόμενο και να προειδοποιούμε, αναστέλλουμε ή διαγράφουμε λογαριασμούς που παραβιάζουν τους κανόνες. Οι διοργανωτές μπορούν να αφαιρούν μηνύματα στους αγώνες τους.',
          ],
        },
        {
          heading: 'Ασφαλής συμμετοχή',
          paragraphs: [
            'Το ποδόσφαιρο ενέχει κίνδυνο τραυματισμού. Συμμετέχεις με δική σου ευθύνη, πρέπει να είσαι σε φόρμα να παίξεις και να συναντάς άλλους σε ασφαλή, δημόσια μέρη. Το ONE MORE δεν ευθύνεται για ό,τι συμβαίνει στους αγώνες ή μεταξύ παικτών, στο μέτρο που επιτρέπει ο νόμος.',
          ],
        },
        {
          heading: 'Το περιεχόμενό σου',
          paragraphs: [
            'Διατηρείς την κυριότητα όσων δημοσιεύεις. Μας δίνεις το δικαίωμα να τα αποθηκεύουμε και να τα εμφανίζουμε στην υπηρεσία ώστε να λειτουργεί (στους παίκτες του αγώνα ή της ομάδας σου). Μη δημοσιεύεις περιεχόμενο που δεν έχεις δικαίωμα να μοιραστείς.',
          ],
        },
        {
          heading: 'Διαθεσιμότητα και αλλαγές',
          paragraphs: [
            'Προσπαθούμε να λειτουργεί η υπηρεσία αλλά δεν εγγυόμαστε ότι θα είναι πάντα διαθέσιμη ή χωρίς σφάλματα. Μπορεί να αλλάξουμε ή να σταματήσουμε λειτουργίες και θα ενημερώνουμε τους όρους όταν χρειάζεται. Η συνέχιση της χρήσης μετά από αλλαγή σημαίνει αποδοχή.',
          ],
        },
        {
          heading: 'Λήξη χρήσης',
          paragraphs: [
            'Μπορείς να διαγράψεις τον λογαριασμό σου οποτεδήποτε στις Ρυθμίσεις. Μπορεί να αναστείλουμε ή να αφαιρέσουμε λογαριασμούς που παραβιάζουν τους όρους ή τον νόμο.',
          ],
        },
        {
          heading: 'Ευθύνη και εφαρμοστέο δίκαιο',
          paragraphs: [
            'Η υπηρεσία παρέχεται «ως έχει». Τίποτα εδώ δεν περιορίζει δικαιώματά σου από το δίκαιο των καταναλωτών ή ευθύνη που δεν μπορεί να αποκλειστεί. Οι όροι διέπονται από το δίκαιο της Κυπριακής Δημοκρατίας και τα δικαστήρια της Κύπρου, χωρίς να θίγονται τα υποχρεωτικά δικαιώματά σου ως καταναλωτή.',
          ],
        },
        {
          heading: 'Επικοινωνία',
          paragraphs: [
            '{developer}, {email}. Δες τη σελίδα Υποστήριξης για αναφορές κατάχρησης και βοήθεια.',
          ],
        },
      ],
    },
  },
  support: {
    en: {
      title: 'Support',
      intro:
        'Need help with ONE MORE? Write to {email} and we will reply as soon as we can, normally within 3 working days.',
      sections: [
        {
          heading: 'Report a bug or ask for help',
          paragraphs: [
            'Email {email} with what you were doing, what you expected and what happened. Add your device model and app version if you can.',
          ],
        },
        {
          heading: 'Report abuse or objectionable content',
          paragraphs: [
            'In a game chat, tap “Report message” under any message, or “Block player” to stop seeing their messages (manage blocked players in Settings). For anything else, or if you feel unsafe, email {email}. We review reports and act on illegal or abusive content and accounts.',
          ],
        },
        {
          heading: 'Privacy requests and account deletion',
          paragraphs: [
            'Delete your account any time in the app: Settings → Delete my account. If you cannot open the app, see /delete-account. For access, correction or other data requests email {email}.',
          ],
        },
        {
          heading: 'Payments and refunds',
          paragraphs: [
            'ONE MORE has no in-app purchases, subscriptions or payments, so there is nothing to refund through the app. Game fees are agreed and paid between players.',
          ],
        },
        {
          heading: 'Legal',
          paragraphs: [
            'Privacy Policy: /privacy. Terms of Use: /terms. Open-source licences: /licenses.',
          ],
        },
      ],
    },
    el: {
      title: 'Υποστήριξη',
      intro:
        'Χρειάζεσαι βοήθεια με το ONE MORE; Γράψε στο {email} και θα απαντήσουμε το συντομότερο, συνήθως εντός 3 εργάσιμων ημερών.',
      sections: [
        {
          heading: 'Αναφορά σφάλματος ή αίτημα βοήθειας',
          paragraphs: [
            'Στείλε email στο {email} με το τι έκανες, τι περίμενες και τι συνέβη. Πρόσθεσε το μοντέλο συσκευής και την έκδοση της εφαρμογής αν μπορείς.',
          ],
        },
        {
          heading: 'Αναφορά κατάχρησης ή απαράδεκτου περιεχομένου',
          paragraphs: [
            'Στη συνομιλία αγώνα, πάτησε «Αναφορά μηνύματος» κάτω από κάθε μήνυμα ή «Αποκλεισμός παίκτη» για να μη βλέπεις τα μηνύματά του (διαχειρίσου τους αποκλεισμούς στις Ρυθμίσεις). Για οτιδήποτε άλλο, ή αν νιώθεις ανασφάλεια, στείλε email στο {email}. Εξετάζουμε τις αναφορές και ενεργούμε για παράνομο ή καταχρηστικό περιεχόμενο και λογαριασμούς.',
          ],
        },
        {
          heading: 'Αιτήματα απορρήτου και διαγραφή λογαριασμού',
          paragraphs: [
            'Διέγραψε τον λογαριασμό σου οποτεδήποτε στην εφαρμογή: Ρυθμίσεις → Διαγραφή λογαριασμού. Αν δεν μπορείς να ανοίξεις την εφαρμογή, δες /delete-account. Για πρόσβαση, διόρθωση ή άλλα αιτήματα δεδομένων στείλε email στο {email}.',
          ],
        },
        {
          heading: 'Πληρωμές και επιστροφές χρημάτων',
          paragraphs: [
            'Το ONE MORE δεν έχει αγορές εντός εφαρμογής, συνδρομές ή πληρωμές, άρα δεν υπάρχει κάτι προς επιστροφή μέσω της εφαρμογής. Τα κόστη αγώνων συμφωνούνται και πληρώνονται μεταξύ παικτών.',
          ],
        },
        {
          heading: 'Νομικά',
          paragraphs: [
            'Πολιτική Απορρήτου: /privacy. Όροι Χρήσης: /terms. Άδειες ανοιχτού κώδικα: /licenses.',
          ],
        },
      ],
    },
  },
  deletion: {
    en: {
      title: 'Delete your ONE MORE account',
      intro:
        'You can delete your account and personal data yourself in the app, or ask us to do it if you cannot open the app. No login is needed to read this page.',
      sections: [
        {
          heading: 'In the app (immediate)',
          paragraphs: [
            'Open ONE MORE, sign in, go to Settings and tap “Delete my account”, then confirm. Your account is deleted right away.',
          ],
        },
        {
          heading: 'Without the app',
          paragraphs: [
            'Email {email} from the address of your account with the subject “Delete my account”. We verify that the request comes from that address, delete the account and confirm by email, within 30 days (normally within 7).',
          ],
        },
        {
          heading: 'What is deleted',
          paragraphs: [
            'Your sign-in (email and password hash), profile (name, phone, city, area, position, skill, shirt number, availability), preferences, games you organised, your join requests and waitlist entries, chat messages and reports you sent, blocks, notifications and team memberships. Teams you captain pass to another member, or are disbanded if you are the only member; challenges you posted are removed.',
          ],
        },
        {
          heading: 'What may remain',
          paragraphs: [
            'Games you joined remain for the other players without your profile. Provider backups, if any, are overwritten on the provider’s normal schedule. We retain nothing else unless the law requires it, in which case we will tell you what and why.',
          ],
        },
        { heading: 'More', paragraphs: ['Privacy Policy: /privacy. Support: /support.'] },
      ],
    },
    el: {
      title: 'Διαγραφή λογαριασμού ONE MORE',
      intro:
        'Μπορείς να διαγράψεις μόνος σου τον λογαριασμό και τα προσωπικά δεδομένα σου στην εφαρμογή ή να ζητήσεις να το κάνουμε εμείς αν δεν μπορείς να την ανοίξεις. Η σελίδα δεν απαιτεί σύνδεση.',
      sections: [
        {
          heading: 'Στην εφαρμογή (άμεσα)',
          paragraphs: [
            'Άνοιξε το ONE MORE, συνδέσου, πήγαινε στις Ρυθμίσεις και πάτησε «Διαγραφή λογαριασμού», μετά επιβεβαίωσε. Ο λογαριασμός διαγράφεται αμέσως.',
          ],
        },
        {
          heading: 'Χωρίς την εφαρμογή',
          paragraphs: [
            'Στείλε email στο {email} από τη διεύθυνση του λογαριασμού σου με θέμα «Διαγραφή λογαριασμού». Επαληθεύουμε ότι το αίτημα προέρχεται από αυτή τη διεύθυνση, διαγράφουμε τον λογαριασμό και επιβεβαιώνουμε με email, εντός 30 ημερών (συνήθως εντός 7).',
          ],
        },
        {
          heading: 'Τι διαγράφεται',
          paragraphs: [
            'Η σύνδεσή σου (email και hash κωδικού), το προφίλ (όνομα, τηλέφωνο, πόλη, περιοχή, θέση, επίπεδο, αριθμός φανέλας, διαθεσιμότητα), οι προτιμήσεις, οι αγώνες που διοργάνωσες, τα αιτήματα συμμετοχής και οι λίστες αναμονής, τα μηνύματα και οι αναφορές που έστειλες, οι αποκλεισμοί, οι ειδοποιήσεις και η συμμετοχή σε ομάδες. Οι ομάδες που διοικείς περνούν σε άλλο μέλος ή διαλύονται αν είσαι το μοναδικό μέλος· οι προκλήσεις που δημοσίευσες αφαιρούνται.',
          ],
        },
        {
          heading: 'Τι μπορεί να παραμείνει',
          paragraphs: [
            'Οι αγώνες στους οποίους συμμετείχες παραμένουν για τους άλλους παίκτες χωρίς το προφίλ σου. Τα αντίγραφα ασφαλείας του παρόχου, αν υπάρχουν, αντικαθίστανται με τον κανονικό κύκλο τους. Δεν κρατάμε τίποτα άλλο εκτός αν το απαιτεί ο νόμος, οπότε θα σου πούμε τι και γιατί.',
          ],
        },
        {
          heading: 'Περισσότερα',
          paragraphs: ['Πολιτική Απορρήτου: /privacy. Υποστήριξη: /support.'],
        },
      ],
    },
  },
  licenses: {
    en: {
      title: 'Open-source licences',
      intro:
        'ONE MORE is built with open-source software and fonts. Their licences allow commercial use and require us to credit them.',
      sections: [
        {
          heading: 'Fonts',
          paragraphs: [
            'Barlow and Barlow Condensed: Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow). SIL Open Font License 1.1.',
            'Inter: Copyright 2016 The Inter Project Authors (github.com/rsms/inter). SIL Open Font License 1.1.',
          ],
        },
        {
          heading: 'Libraries',
          paragraphs: [
            'React, React Native, React Native Web, Expo SDK and Expo modules, Expo Router, React Native SVG, React Native WebView, React Native Gesture Handler, React Native Reanimated, React Native Safe Area Context, React Native Screens, AsyncStorage and Supabase JS: MIT licence.',
            'All runtime dependencies use permissive licences (MIT, ISC, BSD, Apache-2.0, MPL-2.0 or equivalent). The full list with exact versions and licence texts is in the project file THIRD_PARTY_LICENSES.md.',
          ],
        },
      ],
    },
    el: {
      title: 'Άδειες ανοιχτού κώδικα',
      intro:
        'Το ONE MORE χτίστηκε με λογισμικό και γραμματοσειρές ανοιχτού κώδικα. Οι άδειές τους επιτρέπουν εμπορική χρήση και απαιτούν αναφορά.',
      sections: [
        {
          heading: 'Γραμματοσειρές',
          paragraphs: [
            'Barlow και Barlow Condensed: Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow). SIL Open Font License 1.1.',
            'Inter: Copyright 2016 The Inter Project Authors (github.com/rsms/inter). SIL Open Font License 1.1.',
          ],
        },
        {
          heading: 'Βιβλιοθήκες',
          paragraphs: [
            'React, React Native, React Native Web, Expo SDK και modules, Expo Router, React Native SVG, React Native WebView, React Native Gesture Handler, React Native Reanimated, React Native Safe Area Context, React Native Screens, AsyncStorage και Supabase JS: άδεια MIT.',
            'Όλες οι εξαρτήσεις εκτέλεσης έχουν επιεική άδεια (MIT, ISC, BSD, Apache-2.0, MPL-2.0 ή ισοδύναμη). Ο πλήρης κατάλογος με εκδόσεις και κείμενα αδειών βρίσκεται στο αρχείο έργου THIRD_PARTY_LICENSES.md.',
          ],
        },
      ],
    },
  },
};
