-- Seed major city groups and selectable urban areas across Cyprus. Existing Nicosia data is preserved.
-- Place-name reference: CYSTAT, Statistical Codes of Municipalities, Communities and Quarters of Cyprus (2026).
-- https://www.cystat.gov.cy/el/Announcement?id=74185
insert into public.cities (slug, name_en, name_el, country_code)
values
  ('limassol', 'Limassol', 'Λεμεσός', 'CY'),
  ('larnaca', 'Larnaca', 'Λάρνακα', 'CY'),
  ('paphos', 'Paphos', 'Πάφος', 'CY'),
  ('famagusta', 'Famagusta', 'Αμμόχωστος', 'CY'),
  ('kyrenia', 'Kyrenia', 'Κερύνεια', 'CY')
on conflict (slug) do update
set name_en = excluded.name_en,
    name_el = excluded.name_el,
    country_code = excluded.country_code;

insert into public.areas (city_id, slug, name_en, name_el)
select city.id, area.slug, area.name_en, area.name_el
from (values
  ('limassol', 'limassol', 'Limassol', 'Λεμεσός'),
  ('limassol', 'agios-athanasios', 'Agios Athanasios', 'Άγιος Αθανάσιος'),
  ('limassol', 'germasogeia', 'Germasogeia', 'Γερμασόγεια'),
  ('limassol', 'mesa-geitonia', 'Mesa Geitonia', 'Μέσα Γειτονιά'),
  ('limassol', 'kato-polemidia', 'Kato Polemidia', 'Κάτω Πολεμίδια'),
  ('limassol', 'ypsonas', 'Ypsonas', 'Ύψωνας'),
  ('limassol', 'episkopi', 'Episkopi', 'Επισκοπή'),
  ('limassol', 'kolossi', 'Kolossi', 'Κολόσσι'),
  ('limassol', 'parekklisia', 'Parekklisia', 'Παρεκκλησιά'),
  ('larnaca', 'larnaca', 'Larnaca', 'Λάρνακα'),
  ('larnaca', 'aradippou', 'Aradippou', 'Αραδίππου'),
  ('larnaca', 'livadia', 'Livadia', 'Λιβάδια'),
  ('larnaca', 'dromolaxia-meneou', 'Dromolaxia–Meneou', 'Δρομολαξιά–Μενεού'),
  ('larnaca', 'oroklini', 'Oroklini', 'Ορόκλινη'),
  ('larnaca', 'athienou', 'Athienou', 'Αθηένου'),
  ('larnaca', 'kiti', 'Kiti', 'Κίτι'),
  ('larnaca', 'pyla', 'Pyla', 'Πύλα'),
  ('larnaca', 'troulli', 'Troulli', 'Τρούλλοι'),
  ('paphos', 'paphos', 'Paphos', 'Πάφος'),
  ('paphos', 'geroskipou', 'Geroskipou', 'Γεροσκήπου'),
  ('paphos', 'chloraka', 'Chloraka', 'Χλώρακα'),
  ('paphos', 'emba', 'Emba', 'Έμπα'),
  ('paphos', 'tala', 'Tala', 'Τάλα'),
  ('paphos', 'peyia', 'Peyia', 'Πέγεια'),
  ('paphos', 'kissonerga', 'Kissonerga', 'Κισσόνεργα'),
  ('paphos', 'konia', 'Konia', 'Κονιά'),
  ('paphos', 'tsada', 'Tsada', 'Τσάδα'),
  ('paphos', 'polis-chrysochous', 'Polis Chrysochous', 'Πόλις Χρυσοχούς'),
  ('famagusta', 'famagusta', 'Famagusta', 'Αμμόχωστος'),
  ('famagusta', 'paralimni', 'Paralimni', 'Παραλίμνι'),
  ('famagusta', 'ayia-napa', 'Ayia Napa', 'Αγία Νάπα'),
  ('famagusta', 'deryneia', 'Deryneia', 'Δερύνεια'),
  ('famagusta', 'sotira', 'Sotira', 'Σωτήρα'),
  ('famagusta', 'avgorou', 'Avgorou', 'Αυγόρου'),
  ('famagusta', 'frenaros', 'Frenaros', 'Φρέναρος'),
  ('famagusta', 'liopetri', 'Liopetri', 'Λιοπέτρι'),
  ('kyrenia', 'kyrenia', 'Kyrenia', 'Κερύνεια'),
  ('kyrenia', 'lapithos', 'Lapithos', 'Λάπηθος'),
  ('kyrenia', 'karavas', 'Karavas', 'Καραβάς'),
  ('kyrenia', 'bellapais', 'Bellapais', 'Μπέλλαπαϊς')
) as area(city_slug, slug, name_en, name_el)
join public.cities as city on city.slug = area.city_slug
on conflict (city_id, slug) do update
set name_en = excluded.name_en,
    name_el = excluded.name_el;
