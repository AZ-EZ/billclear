# BillClear

BillClear is a static Cloudflare Pages app for caregivers and active-treatment patients who need to decode medical bills, EOBs, and denial letters.

The launch artifact is intentionally narrow: paste medical paperwork text, get a plain-English decode, challengeable findings, a phone script, and a dispute letter draft. Files and cases stay in the user's browser through `localStorage`.

## Local Preview

```sh
npm run dev
```

Then open `http://127.0.0.1:8788`.

## Deploy

```sh
npm run deploy
```

This uses Cloudflare Pages Direct Upload via Wrangler.

## Notes

- The app is educational, not medical or legal advice.
- The first version avoids client-side AI/API keys and does not upload medical documents.
- The marketing and monetization plan lives at `docs/monetization-and-marketing-plan.md` and is also summarized at `/marketing-plan.html`.

## Source References

- Cloudflare Pages Direct Upload and Wrangler deploy docs: https://developers.cloudflare.com/pages/get-started/direct-upload/
- CMS No Surprises Act rights: https://www.cms.gov/medical-bill-rights/know-your-rights
- CMS Physician Fee Schedule overview: https://www.cms.gov/medicare/physician-fee-schedule/search/overview
- U.S. Department of Labor ERISA claims procedure guidance: https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/publications/group-health-and-disability-plans-benefit-claims-procedure-regulation
