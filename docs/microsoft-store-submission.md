# BillClear Microsoft Store Submission Guide

## Short Answer

You do not need a Microsoft phone to sell or distribute BillClear through the Microsoft Store.

BillClear should be submitted as a Progressive Web App (PWA) for Windows. Microsoft currently describes the PWA path as:

1. Create a Microsoft Store developer account.
2. Reserve an app name in Partner Center.
3. Package the hosted PWA with PWABuilder.
4. Upload the generated `.msixbundle` and `.classic.appxbundle`.
5. Complete pricing, age rating, properties, screenshots, and certification.

You may need a phone or camera for identity verification during account setup, but it does not need to be a Microsoft phone.

## What Is Prepared In This Repo

BillClear now includes the core files PWABuilder and Microsoft Store expect for a PWA:

- `dist/manifest.webmanifest`
- `dist/sw.js`
- `dist/offline.html`
- `dist/privacy.html`
- `dist/assets/icons/icon-192.png`
- `dist/assets/icons/icon-512.png`
- `dist/assets/icons/maskable-512.png`
- PWA metadata in `dist/index.html`

The live hosted PWA URL is:

https://billclear-4k9.pages.dev

## Account Setup

1. Go to https://storedeveloper.microsoft.com.
2. Choose the new Microsoft Store developer onboarding flow.
3. Select Individual if publishing under your own name; select Company only if publishing under a registered legal business.
4. Sign in with a Microsoft account.
5. Complete identity verification.
6. Open Partner Center and go to Apps and games.

Microsoft currently says the new onboarding flow has no registration fee for either Individual or Company accounts when started from the Store developer site. Always verify in Partner Center before submitting.

## Reserve The App

1. In Partner Center, go to Apps and games.
2. Select New product.
3. Choose MSIX or PWA app.
4. Try to reserve `BillClear`.
5. If unavailable, try one of:
   - `BillClear Medical Paperwork Decoder`
   - `BillClear Health Bill Helper`
   - `BillClear Paperwork Decoder`
6. Open Product management > Product Identity.
7. Copy these values for PWABuilder:
   - Package ID
   - Publisher ID
   - Publisher display name

## Package With PWABuilder

1. Go to https://www.pwabuilder.com.
2. Enter the live URL: `https://billclear-4k9.pages.dev`.
3. Review the report card.
4. If PWABuilder flags anything, fix the app and redeploy to Cloudflare.
5. Select Package for Stores.
6. Under Windows, choose Generate Package.
7. Paste Package ID, Publisher ID, and Publisher display name from Partner Center.
8. Download the package zip.

The download should include:

- `.msixbundle`
- `.classic.appxbundle`

Upload both in Partner Center when prompted for packages.

## Store Submission Checklist

Pricing and availability:

- Price: Free at launch.
- Monetization: Keep paid review off-platform for the beta only if Microsoft policy allows your flow. If selling inside the Store app later, review Microsoft commerce and policy requirements first.
- Markets: Start with United States unless you have a broader compliance plan.
- Visibility: Public after testing; Private audience for a first certification test if desired.

Properties:

- Category: Health and fitness or Productivity. Prefer Productivity if you want to avoid implying medical care.
- Subcategory: Personal finance or Health management if available.
- Privacy policy: Required if the app collects, accesses, or transmits personal information. BillClear currently says nothing is uploaded, but because users may paste medical paperwork into the app, publish a plain privacy page before Store submission.
- Support contact: Use a working email address.
- Product declarations: Do not declare restricted capabilities unless PWABuilder adds any. Avoid restricted capabilities for a simple PWA.

Age rating:

- Complete the Partner Center questionnaire honestly.
- BillClear is educational and financial/health-adjacent, not medical diagnosis or treatment.
- It should not claim to provide legal, medical, or insurance advice.

Packages:

- Upload the PWABuilder `.msixbundle`.
- Upload the `.classic.appxbundle` if Partner Center requests it or PWABuilder includes it for compatibility.
- Test the package on Windows before submission if possible.

Store listing:

- At least one screenshot is required; Microsoft recommends four or more.
- Use desktop screenshots because this app targets Windows.
- Include the decoder screen, results screen, dispute letter, and launch/plan or saved cases.

Certification notes:

Use this note:

BillClear is a hosted PWA for caregivers and active-treatment patients reviewing redacted medical bills, EOBs, and denial letters. It is an educational paperwork tool, not medical advice, legal advice, insurance advice, or a billing-advocate service. The launch version processes pasted text in the browser and does not upload documents to a server.

## Store Listing Copy

Short description:

Decode one medical bill, EOB, or denial into a next step.

Full description:

BillClear helps caregivers and active-treatment patients slow down confusing medical paperwork before paying, appealing, or calling billing.

Paste redacted text from one EOB, denial letter, or itemized bill. BillClear highlights possible billing issues, translates the strongest next move into plain English, and drafts a phone script, dispute letter, follow-up plan, and community-safe question.

BillClear is built for people managing repeated paperwork during care. It is intentionally narrow: one document, one best challenge, one packet.

Important: BillClear is educational support only. It is not medical advice, legal advice, insurance advice, or a substitute for a certified medical billing advocate, attorney, insurer, provider, or patient advocate.

Feature bullets:

- Decode redacted bill, EOB, or denial text.
- Spot surprise-billing, denial, duplicate-code, deadline, and unusual-charge language.
- Generate an editable dispute letter.
- Generate a phone script for billing or insurance.
- Save cases locally in your browser.
- Copy a community-safe question without names, IDs, addresses, or claim numbers.

Search terms:

- medical bill
- EOB
- denial letter
- caregiver
- insurance appeal
- hospital bill
- itemized bill
- dispute letter

## Required Follow-Up Before Final Submission

1. Replace `beta@billclear.app` with a working support email or domain email.
2. Capture four Windows screenshots after final UI polish.
3. Run the live URL through PWABuilder.
4. Download and test the Windows package.
5. Review Microsoft Store Policies before certification.

## Official References

- Publish a PWA to the Microsoft Store: https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/microsoft-store
- PWA app submission checklist: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/pwa/create-app-submission
- Open a Microsoft Store developer account: https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account
- Microsoft Store policies: https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
- PWABuilder: https://www.pwabuilder.com
