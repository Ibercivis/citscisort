# Engagement emails

Reminder and congratulations emails sent to registered users by a daily RQ job.
Policy code: `apps/classifications/engagement.py`. Audit log: `EngagementEmail`
model (visible in the admin under *Engagement emails*).

## Policy

Every email we send is decided by one of these triggers, in this priority order:

| Type | Trigger | Dedupe key | Schedule |
|---|---|---|---|
| `milestone` | Person's valid classifications reach 10 / 25 / 50 / 100 / 250 / 500 / 1000 **and** they classified in the last 7 days | `milestone:<n>` | Once per milestone; only the highest reached is sent (someone at 45 gets "25", later "50"). Old milestones are never backfilled. |
| `reengagement_never` | Signed up, never classified | `reengagement:never:<attempt>` | Day 7 after sign-up, then day 45. Two emails, then silence. |
| `reengagement_lapsed` | Classified at least once, then stopped | `reengagement:lapsed:<last-classification-date>:<attempt>` | 14 days after their last classification, then 45. Attempt 2 waits at least 31 days after attempt 1. If they come back and classify, the date in the key changes and a fresh cycle can start. |

Rules that apply to all of them:

- **Eligibility**: active account, verified email address (allauth), and
  `UserProfile.activity_emails_opt_in` on. Default is on: these are messages
  about the person's own activity on the service. The newsletter is a separate,
  explicit opt-in and is not touched by this.
- **Cooldown**: at most one engagement email per person every 7 days. The
  cooldown counts only successfully sent emails. Transactional mail
  (verification, password reset, shares) is outside this system.
- **Per-run cap**: at most `MAX_PER_RUN` (25) per daily run, milestones first,
  then the most recently active people. Everyone else stays due and is picked up
  on later runs. This is what keeps the first activation from mailing a hundred
  people in one go.
- **Unsubscribe**: every email carries a one-click unsubscribe link (signed
  token, no login, never expires) plus the RFC 8058 `List-Unsubscribe` headers
  so mail clients show their own button. The endpoint is
  `GET|POST /api/emails/unsubscribe/<token>/`. The flag is also editable through
  the profile API (`activity_emails_opt_in`) so the frontend account page can
  expose it.
- **Logging**: every send is a row in `EngagementEmail` with type, dedupe key,
  recipient at send time, subject, status (`sent`/`failed`), error text and the
  numbers used to decide (`payload`). Failed sends keep their row, do not count
  as sent and are retried on the next run, overwriting the same row on success.

All thresholds live in `settings.ENGAGEMENT_EMAILS`.

## Operations

```bash
# What would go out today, and who is skipped and why (-v 2 lists every skip)
python manage.py send_engagement_emails --dry-run -v 2

# Send to yourself even while the feature is disabled
python manage.py send_engagement_emails --user you@example.org --force

# Register the daily job in rq-scheduler (idempotent, run on every deploy)
python manage.py schedule_engagement_emails            # 09:00 UTC
python manage.py schedule_engagement_emails --now      # ...and run once right away
```

The job runs every day but **sends nothing until `ENGAGEMENT_EMAILS_ENABLED=True`
in `.env`**. `API_PUBLIC_URL` must be the public base URL of the API so the
unsubscribe links resolve. The rqworker and rqscheduler processes are defined in
`deploy/supervisor/citscisort-rq.conf`.

Templates: `templates/emails/reengagement/` (both re-engagement variants, chosen
by `user_classifications`) and `templates/emails/milestone/`.

## Not yet built (later phases)

- **Disagreement / consensus** ("other people classified this differently"):
  needs abstracts to receive several classifications. The current
  `next_abstract` selection is breadth-first (fewest classifications first), so
  with 12.8k abstracts almost none have a second opinion; the trigger is pointless
  until the selection strategy changes.
- **Debate digest**: weekly summary of unread in-app `Notification`s.
- **Challenge progress**: a joined challenge reaching 90% / completion.
