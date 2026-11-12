import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

type EventType =
  | 'match_join_requested'
  | 'match_join_approved'
  | 'match_join_rejected'
  | 'match_waitlist_offer'
  | 'match_waitlist_offer_accepted'
  | 'match_waitlist_offer_declined'
  | 'match_waitlist_offer_expired'
  | 'match_waitlist_offer_cancelled'
  | 'challenge_request_received'
  | 'challenge_request_accepted'
  | 'challenge_request_rejected'
  | 'challenge_match_ready'
  | 'challenge_cancelled'
  | 'match_reminder_24h'
  | 'match_reminder_2h';

const templates: Record<EventType, Record<'en' | 'el', { subject: string; body: string }>> = {
  match_join_requested: {
    en: {
      subject: 'A player requested to join your match',
      body: 'Review the new player request in ONE MORE.',
    },
    el: {
      subject: 'Ένας παίκτης ζήτησε να συμμετάσχει στον αγώνα σου',
      body: 'Δες το νέο αίτημα παίκτη στο ONE MORE.',
    },
  },
  match_join_approved: {
    en: {
      subject: 'Your match request was approved',
      body: 'Your place in the match is confirmed.',
    },
    el: {
      subject: 'Το αίτημά σου για τον αγώνα εγκρίθηκε',
      body: 'Η θέση σου στον αγώνα επιβεβαιώθηκε.',
    },
  },
  match_join_rejected: {
    en: {
      subject: 'Your match request was declined',
      body: 'The organizer reviewed your request.',
    },
    el: {
      subject: 'Το αίτημά σου για τον αγώνα απορρίφθηκε',
      body: 'Ο διοργανωτής εξέτασε το αίτημά σου.',
    },
  },
  match_waitlist_offer: {
    en: {
      subject: 'A place opened in your match',
      body: 'Accept the offer in the app before it expires.',
    },
    el: {
      subject: 'Άνοιξε θέση στον αγώνα σου',
      body: 'Αποδέξου την προσφορά στην εφαρμογή πριν λήξει.',
    },
  },
  match_waitlist_offer_accepted: {
    en: { subject: 'Your waitlist offer was accepted', body: 'Your match place is now confirmed.' },
    el: {
      subject: 'Η προσφορά αναμονής έγινε δεκτή',
      body: 'Η θέση σου στον αγώνα επιβεβαιώθηκε.',
    },
  },
  match_waitlist_offer_declined: {
    en: {
      subject: 'Your waitlist offer was declined',
      body: 'The match organizer updated the waitlist.',
    },
    el: {
      subject: 'Η προσφορά αναμονής απορρίφθηκε',
      body: 'Ο διοργανωτής ενημέρωσε τη λίστα αναμονής.',
    },
  },
  match_waitlist_offer_expired: {
    en: {
      subject: 'Your waitlist offer expired',
      body: 'The acceptance window for the match place has ended.',
    },
    el: {
      subject: 'Η προσφορά αναμονής έληξε',
      body: 'Έληξε το χρονικό περιθώριο αποδοχής της θέσης.',
    },
  },
  match_waitlist_offer_cancelled: {
    en: {
      subject: 'Your waitlist offer was cancelled',
      body: 'The match details changed. Check the app for updates.',
    },
    el: {
      subject: 'Η προσφορά αναμονής ακυρώθηκε',
      body: 'Τα στοιχεία του αγώνα άλλαξαν. Δες την εφαρμογή.',
    },
  },
  challenge_request_received: {
    en: {
      subject: 'A team requested your challenge',
      body: 'Review the opposing team’s challenge request.',
    },
    el: {
      subject: 'Μια ομάδα ζήτησε την πρόκλησή σου',
      body: 'Δες το αίτημα πρόκλησης της αντίπαλης ομάδας.',
    },
  },
  challenge_request_accepted: {
    en: {
      subject: 'Your team challenge was accepted',
      body: 'Agree the kickoff and field with the other captain.',
    },
    el: {
      subject: 'Η πρόκληση της ομάδας σου έγινε δεκτή',
      body: 'Συμφώνησε την ώρα έναρξης και το γήπεδο με τον άλλο αρχηγό.',
    },
  },
  challenge_request_rejected: {
    en: {
      subject: 'Your team challenge was declined',
      body: 'The other captain reviewed your request.',
    },
    el: {
      subject: 'Η πρόκληση της ομάδας σου απορρίφθηκε',
      body: 'Ο άλλος αρχηγός εξέτασε το αίτημά σου.',
    },
  },
  challenge_match_ready: {
    en: {
      subject: 'Your team challenge match is ready',
      body: 'Both captains confirmed the match details.',
    },
    el: {
      subject: 'Ο αγώνας πρόκλησης της ομάδας σου είναι έτοιμος',
      body: 'Και οι δύο αρχηγοί επιβεβαίωσαν τα στοιχεία του αγώνα.',
    },
  },
  challenge_cancelled: {
    en: {
      subject: 'A team challenge was cancelled',
      body: 'The challenge was cancelled by its organizer.',
    },
    el: { subject: 'Μια πρόκληση ομάδας ακυρώθηκε', body: 'Ο διοργανωτής ακύρωσε την πρόκληση.' },
  },
  match_reminder_24h: {
    en: {
      subject: 'Your match is tomorrow',
      body: 'Your match starts in about 24 hours. Check the match details.',
    },
    el: {
      subject: 'Ο αγώνας σου είναι αύριο',
      body: 'Ο αγώνας σου ξεκινά σε περίπου 24 ώρες. Δες τα στοιχεία του.',
    },
  },
  match_reminder_2h: {
    en: {
      subject: 'Your match starts in 2 hours',
      body: 'Check the match details before you head to the field.',
    },
    el: {
      subject: 'Ο αγώνας σου ξεκινά σε 2 ώρες',
      body: 'Δες τα στοιχεία του αγώνα πριν ξεκινήσεις για το γήπεδο.',
    },
  },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKeysJson = Deno.env.get('SUPABASE_SECRET_KEYS');
  const legacyServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  let serviceKey = legacyServiceKey;
  if (!serviceKey && secretKeysJson) {
    try {
      const keys = JSON.parse(secretKeysJson) as Record<string, string>;
      serviceKey = keys.default;
    } catch {
      return json({ error: 'server_configuration_invalid' }, 500);
    }
  }
  if (!supabaseUrl || !serviceKey) return json({ error: 'server_configuration_invalid' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: validWorker, error: workerError } = await admin.rpc(
    'verify_notification_worker_token',
    {
      p_token: token,
    },
  );
  if (workerError || validWorker !== true) return json({ error: 'unauthorized' }, 401);

  let outboxId: string | null = null;
  try {
    const payload = (await request.json()) as { outbox_id?: unknown };
    outboxId = typeof payload.outbox_id === 'string' ? payload.outbox_id : null;
  } catch {
    return json({ error: 'invalid_payload' }, 400);
  }
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  const appBaseUrl = Deno.env.get('APP_BASE_URL');
  if (!resendKey || !from || !appBaseUrl)
    return json({ error: 'mail_provider_not_configured' }, 503);
  let baseUrl: URL;
  try {
    baseUrl = new URL(appBaseUrl);
  } catch {
    return json({ error: 'app_base_url_invalid' }, 500);
  }
  if (!['https:', 'http:'].includes(baseUrl.protocol))
    return json({ error: 'app_base_url_invalid' }, 500);

  const { data: candidates, error: candidateError } = outboxId
    ? { data: [{ id: outboxId }], error: null }
    : await admin
        .from('notification_outbox')
        .select('id')
        .in('email_status', ['pending', 'failed'])
        .lt('email_attempts', 6)
        .lte('email_next_attempt_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(20);
  if (candidateError) return json({ error: 'outbox_lookup_failed' }, 500);
  if (!candidates?.length) return json({ status: 'empty' });

  let sent = 0;
  let suppressed = 0;
  let retried = 0;
  for (const candidate of candidates) {
    const { data: claimed, error: claimError } = await admin.rpc('claim_notification_outbox', {
      p_outbox_id: candidate.id,
    });
    if (claimError) return json({ error: 'claim_failed' }, 500);
    const row = (Array.isArray(claimed) ? claimed[0] : null) as {
      id: string;
      recipient_id: string;
      event_type: string;
      match_id: string | null;
      payload: Record<string, unknown>;
    } | null;
    if (!row) continue;

    const finish = async (status: 'sent' | 'suppressed' | 'failed', errorCode: string | null) => {
      const result = await admin.rpc('finish_notification_email', {
        p_outbox_id: row.id,
        p_status: status,
        p_error_code: errorCode,
      });
      return result.error;
    };
    const fail = async (errorCode: string) => {
      await finish('failed', errorCode);
      retried += 1;
    };

    if (row.event_type === 'match_reminder_24h' || row.event_type === 'match_reminder_2h') {
      const reminderId =
        typeof row.payload.reminder_id === 'string' ? row.payload.reminder_id : null;
      const [{ data: reminder }, { data: match }] = await Promise.all([
        reminderId
          ? admin
              .from('match_reminders')
              .select('status, offset_minutes, scheduled_for')
              .eq('id', reminderId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        row.match_id
          ? admin
              .from('matches')
              .select('event_status, starts_at')
              .eq('id', row.match_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const expectedOffset = row.event_type === 'match_reminder_24h' ? 1440 : 120;
      const reminderStillValid =
        reminder?.status === 'queued' &&
        reminder.offset_minutes === expectedOffset &&
        match?.event_status === 'published' &&
        new Date(match.starts_at).getTime() > Date.now() &&
        new Date(match.starts_at).getTime() - expectedOffset * 60_000 ===
          new Date(reminder.scheduled_for).getTime();
      if (!reminderStillValid) {
        if (await finish('suppressed', null)) return json({ error: 'delivery_record_failed' }, 500);
        suppressed += 1;
        continue;
      }
    }

    const { data: preferences, error: preferenceError } = await admin
      .from('notification_preferences')
      .select('transactional_email_enabled, discovery_email_enabled, chat_email_enabled')
      .eq('user_id', row.recipient_id)
      .maybeSingle();
    if (preferenceError) {
      await fail('preference_lookup_failed');
      continue;
    }
    const category = row.event_type.startsWith('chat_')
      ? 'chat'
      : row.event_type.startsWith('discovery_')
        ? 'discovery'
        : 'transactional';
    const enabled =
      category === 'chat'
        ? preferences?.chat_email_enabled === true
        : category === 'discovery'
          ? preferences?.discovery_email_enabled === true
          : preferences?.transactional_email_enabled === true;
    if (!enabled) {
      if (await finish('suppressed', null)) return json({ error: 'delivery_record_failed' }, 500);
      suppressed += 1;
      continue;
    }

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(
      row.recipient_id,
    );
    const recipientEmail = userResult.user?.email;
    if (userError || !recipientEmail) {
      await fail('recipient_email_unavailable');
      continue;
    }
    const [{ data: profile }, { data: inboxRow }] = await Promise.all([
      admin.from('profiles').select('language').eq('id', row.recipient_id).maybeSingle(),
      admin.from('inbox_notifications').select('href').eq('outbox_id', row.id).maybeSingle(),
    ]);
    const locale = profile?.language === 'el' ? 'el' : 'en';
    const template = templates[row.event_type as EventType];
    if (!template) {
      await fail('unsupported_event_type');
      continue;
    }
    const link = new URL(inboxRow?.href ?? '/notifications', baseUrl).toString();
    const subject = template[locale].subject;
    const body = template[locale].body;
    const html = `<!doctype html><html lang="${locale}"><body style="font-family:Arial,sans-serif;color:#17211b"><main style="max-width:560px;margin:32px auto;padding:24px;border:1px solid #d8e2d4;border-radius:16px"><p style="font-weight:700;color:#477000">ONE MORE</p><h1 style="font-size:22px">${subject}</h1><p>${body}</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#c7ff35;color:#17211b;text-decoration:none;border-radius:10px">${locale === 'el' ? 'Άνοιγμα ONE MORE' : 'Open ONE MORE'}</a></p></main></body></html>`;
    let mailResponse: Response;
    try {
      mailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${resendKey}`,
          'content-type': 'application/json',
          'idempotency-key': `one-more-${row.id}`,
        },
        body: JSON.stringify({
          from,
          to: [recipientEmail],
          subject,
          html,
          text: `${body}\n\n${link}`,
        }),
      });
    } catch {
      await fail('provider_network_error');
      continue;
    }
    if (!mailResponse.ok) {
      const providerError =
        mailResponse.status === 429
          ? 'provider_rate_limited'
          : `provider_http_${mailResponse.status}`;
      await fail(providerError);
      continue;
    }
    if (await finish('sent', null)) return json({ error: 'delivery_record_failed' }, 500);
    sent += 1;
  }
  return json({ status: 'processed', sent, suppressed, retried });
});
