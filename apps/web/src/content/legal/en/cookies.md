---
page: cookies
title: Cookies and browser storage
description: Which cookies and browser storage entries beda.lol leaves, why, how long they last, and how to change your choice about statistics.
updated: '2026-09-29'
draft: true
---

## In short

The site needs a few entries in your browser so that sign-in, the quiz and the tracker work. They cannot be turned off. Google Analytics sets its cookies only with your consent. You can change your choice at the bottom of this page at any time. How we handle data in general is described in the [privacy policy](/en/konfidencialnost).

## Necessary

The site does not work without these, so we do not ask for consent to them.

| Name | Where | Why | How long |
| --- | --- | --- | --- |
| `sb-…-auth-token` | cookie | your session after sign-in (Supabase) | until you sign out, at most 400 days |
| `sb-…-auth-token-code-verifier` | cookie | a check while you sign in with GitHub, Google, X or a link | a few minutes, during sign-in |
| `beda-consent` | localStorage | your choice about statistics | until you clear the site's data |
| `beda-region` | sessionStorage | whether your region is asked about statistics | until the tab is closed |
| `beda-quiz-v1`, `beda-quiz-reveal-v1` | sessionStorage | ship inspection quiz progress and the result reveal | until the tab is closed |
| `yacht-beda-v1` | localStorage | the nails ticked in the tracker | until you clear the site's data |

The sign-in page runs a Cloudflare Turnstile check. It opens in a Cloudflare frame, and what it keeps there is up to Cloudflare.

## Statistics

Only with your consent.

| Name | Where | Why | How long |
| --- | --- | --- | --- |
| `_ga` | cookie | Google Analytics tells one visitor from another | 2 years |
| `_ga_…` | cookie | Google Analytics keeps track of the current visit | 2 years |

Statistics are counted by Google Analytics 4 in Consent Mode. Until you consent, or if you refuse, it sets no cookies and gets only anonymous signals: which page was opened, when, and from what browser. There are no ads on the site, and Google's advertising features are off.

If you refuse after consenting, the site deletes the `_ga` cookies itself.

## How the site decides whether to ask

When you first open the site, your browser asks our server once per tab whether you are in the European Union.

- The server looks at your IP address and checks the country with the ipregistry.co service.
- The page gets only a yes or a no; the address itself never reaches it.
- The server keeps the address and the region it found in memory until it restarts. The address goes into the log only when the region could not be found.

From the EU, and whenever the check does not answer, you are asked about statistics. In other regions statistics are on straight away, and you can turn them off here.

## How to change your choice

Your current choice is below. You can also delete the site's cookies and data in your browser settings: the site will then ask again, and your sign-in and an unfinished quiz will be reset.

Questions: [contact address].
