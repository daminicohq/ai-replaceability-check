# AI Replaceability Check

The hosted front end for the Readynez campaign 'How replaceable are you?'.

It is one self-contained HTML file. No build step, no framework, no third-party
scripts and no cookies. You can open it locally or serve it from any static host.

## What it does

You answer 13 questions in about 3 minutes. The page asks one question per screen
and branches on your role, so question 4 lists the tasks that actually belong to
your job. It then scores you from 0 to 100, where a higher number means AI could
more easily do your current work, and shows the result straight away.

Bands are 0 to 39 Low, 40 to 64 Moderate, 65 to 100 High.

## How a submission travels

1. The page scores your answers in the browser and shows the result after a short
   pause, so the reveal never waits on the network.
2. In parallel it posts JSON to a Google Apps Script web app. It sends the body as
   `text/plain` on purpose. That keeps it a simple request, so the browser skips the
   CORS preflight that Apps Script cannot answer.
3. The script scores the answers again on the server, appends a row to the
   'Web responses' tab of the response sheet, emails you the result, and logs the
   send to the 'Scores' tab.
4. The page then shows either 'on its way' or a retry link.

A hidden honeypot field is included. If anything fills it, the script accepts the
request and discards it.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole front end, including the scoring model |
| `readynez-replaceability-form.gs` | The Apps Script, kept here for reference |

The `.gs` file is a copy for reading. The live copy is the Apps Script project, and
that is the one to edit.

## Pre-filled role links

Add `?role=` to skip question 1 and pre-select the role. Use these when you already
know who you are mailing.

| Link | Role |
| --- | --- |
| `?role=dev` | Software development |
| `?role=cloud` | Cloud and infrastructure |
| `?role=security` | Cyber security |
| `?role=support` | IT support and operations |
| `?role=data` | Data and AI |
| `?role=management` | IT management or leadership |

## Tracking

`?utm_source=` or `?src=` lands in the 'Source' column of the sheet, and
`?utm_campaign=` or `?utm_medium=` lands in 'Campaign'. With no parameter the page
records the referring domain, or 'direct' if there is none. You can combine a role
and a source, for example `?role=security&utm_source=newsletter`.

## If you edit the scoring

The scoring model exists twice, once in `computeScore` in `index.html` and once in
`computeScore` in the Apps Script. They must stay identical, otherwise the number on
screen will not match the number in the email and the sheet. Change both together.

The same goes for the question wording and the answer options. The script reads
Google Form responses by question title, so the titles are keys.

## Known limit

The script sends through MailApp on a consumer Gmail account, which allows roughly
100 emails a day. A send that fails is written to the 'Scores' tab as 'FAILED', and
`resendFailed()` re-sends those for the Google Form path. If the campaign is going to
draw more than 100 responses a day, move the script and the form to a Google Workspace
account before you send the invitations.

## The Google Form version

A plain Google Form version of the same survey still exists and still works. It writes
to the same sheet and sends the same email, so you can keep it as a fallback.
