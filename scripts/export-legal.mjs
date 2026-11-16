// Writes static copies of the legal pages (Markdown + a hostable HTML delete-account page) from the
// single source of truth in src/legal/legal-content.ts. Run: node --experimental-strip-types scripts/export-legal.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

import { legalContent } from '../src/legal/legal-content.ts';

const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '[CONFIRM: support email]';
const developer = process.env.EXPO_PUBLIC_DEVELOPER_NAME || '[CONFIRM: developer or company name]';
const fill = (text) => text.replaceAll('{email}', email).replaceAll('{developer}', developer);
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function markdown(doc, locale) {
  const lines = [
    `# ${doc.title}`,
    '',
    `_Language: ${locale}. Last updated: ${new Date().toISOString().slice(0, 10)}._`,
    '',
    fill(doc.intro),
    '',
  ];
  for (const section of doc.sections) {
    lines.push(`## ${section.heading}`, '');
    for (const paragraph of section.paragraphs) lines.push(fill(paragraph), '');
  }
  return lines.join('\n');
}

function html(doc, locale) {
  const body = doc.sections
    .map(
      (s) =>
        `<h2>${escape(s.heading)}</h2>\n${s.paragraphs.map((p) => `<p>${escape(fill(p))}</p>`).join('\n')}`,
    )
    .join('\n');
  return `<!doctype html>\n<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(doc.title)} — ONE MORE</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px;color:#101510}h1{font-size:28px}h2{margin-top:28px;font-size:20px}</style></head><body><h1>${escape(doc.title)}</h1><p>${escape(fill(doc.intro))}</p>\n${body}\n</body></html>\n`;
}

mkdirSync('legal', { recursive: true });
for (const locale of ['en', 'el']) {
  const suffix = locale === 'en' ? '' : `.${locale}`;
  writeFileSync(`legal/privacy-policy${suffix}.md`, markdown(legalContent.privacy[locale], locale));
  writeFileSync(`legal/terms-of-service${suffix}.md`, markdown(legalContent.terms[locale], locale));
  writeFileSync(`legal/delete-account${suffix}.html`, html(legalContent.deletion[locale], locale));
}
console.log('legal files written');
