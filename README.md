# AI Replaceability Check

The hosted front end for the Readynez campaign 'How replaceable are you?'.

Visitors answer 13 questions in about 3 minutes and get an AI Replaceability Score from
0 to 100, where higher means AI could more easily do their current work. The score is
shown on screen straight away. The answers are saved to a Google Sheet so Readynez can
mail the result from Dynamics 365 Marketing.

Bands are 0 to 39 Low, 40 to 64 Moderate, 65 to 100 High.

## Installing it (this is the whole job)

Upload `index.html` to any web server and open it. That is it.

There is nothing else to do. No build step, no framework, no PHP, no database, no
server-side code, no configuration file, no npm install. It is one self-contained HTML
file that runs entirely in the visitor's browser.

It works from any folder and any domain. Serve it at the site root, in a subfolder, or
under any path you like. Nothing in the file assumes where it lives.

Two things worth doing:

- **Serve it over HTTPS.** You are collecting email addresses, so this is not optional in
  practice, and most browsers will warn on a plain HTTP form.
- **Rename it if you want a tidy URL.** Dropping it at `/ai-replaceability-check/index.html`
  gives you `readynez.com/ai-replaceability-check/`.

The only outbound calls the page makes are to Google Fonts for two typefaces, and to the
Google Apps Script endpoint when someone submits. No analytics, no cookies, no trackers,
no third-party scripts.

## Where the answers go

On submit the page posts JSON to a Google Apps Script web app, which appends a row to the
'Web responses' tab of a Google Sheet.

The endpoint URL is on line 173 of `index.html`:

```
var ENDPOINT = 'https://script.google.com/macros/s/.../exec';
```

You do not need to change it for the page to work from a new domain. The endpoint accepts
requests from any origin, so moving the file to a different server changes nothing. This
has been tested from three different domains.

You would only change that line if Readynez wants the responses landing in its own Google
account rather than the current one. In that case, copy `readynez-replaceability-form.gs`
into a new Apps Script project on the Readynez account, deploy it as a web app with
'Execute as: Me' and 'Who has access: Anyone', and paste the new `/exec` URL over line 173.

## The page does not send email

This is deliberate. The script used to email each person their score through MailApp,
which caps at about 100 emails a day on a consumer Google account. That is far too few for
a campaign going to a list of this size, and over the cap the sends fail silently.

So the page now only stores the answer. Readynez exports the 'Web responses' tab and sends
the result from Dynamics 365 Marketing, which sends from readynez.com and authenticates
properly.

Three columns exist to make that import easy. They hold the finished sentences the result
page shows, so the D365 template can merge a field rather than reimplement the scoring:

| Column | What it holds |
| --- | --- |
| `Drivers` | 'What pushed your score up: ...' |
| `Learning path` | The recommended course heading |
| `Learning path detail` | The sentence under that heading |

Alongside `Score`, `Band`, `Role` and the four sub-scores, that is everything a
personalised email needs.

Someone has to actually run that export. The result screen tells the visitor a copy is
coming, so agree a cadence and stick to it.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole front end, including the scoring model. This is the only file you upload |
| `readynez-replaceability-form.gs` | The Apps Script, for reference. It already runs in Google, you do not upload this |

## Pre-filled role links

Add `?role=` to skip question 1 and pre-select the role, so a targeted mailing does not ask
people something you already know.

| Link | Role |
| --- | --- |
| `?role=dev` | Software development |
| `?role=cloud` | Cloud and infrastructure |
| `?role=security` | Cyber security |
| `?role=support` | IT support and operations |
| `?role=data` | Data and AI |
| `?role=management` | IT management or leadership |

Question 4 also changes with the role, so a security professional is asked about alert
triage and log analysis rather than about writing tests.

## Tracking

`?utm_source=` or `?src=` lands in the 'Source' column of the sheet, and `?utm_campaign=`
or `?utm_medium=` lands in 'Campaign'. With no parameter the page records the referring
domain, or 'direct' if there is none.

Combine them freely, for example
`?role=security&utm_source=newsletter&utm_campaign=ai-check-launch`.

## If you edit the scoring

The scoring model exists twice, once in `computeScore` in `index.html` and once in
`computeScore` in the Apps Script. They must stay identical, or the number on screen will
not match the number in the sheet. Change both together.

The same goes for the question wording and the answer options. The Apps Script reads
Google Form responses by question title, so the titles are keys, not decoration.

## Capacity

The page is 32 KB of static HTML, so any web server handles it. Traffic is not a
constraint at newsletter scale.

The Apps Script endpoint allows 30 concurrent executions. Each submission holds a slot for
a fraction of a second now that no email is sent, so a large simultaneous burst is fine.
If a submission ever does fail, the visitor still sees their score and gets a retry link.

## The Google Form version

A plain Google Form version of the same survey still exists and writes to the same sheet.
It still emails on submit and so is still subject to the 100 a day cap, which is fine at
the low volume it gets. Keep it as a fallback.
