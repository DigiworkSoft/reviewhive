# Future Requirements

## 1. Google Review Verification (Match Posted Reviews)

- Poll Google Business Profile API every 15-30 min to fetch new reviews
- Match fetched reviews against generated texts using:
  - N-gram overlap (40-60% phrase match threshold)
  - Timing correlation (review appeared within 5-10 min of copy event)
  - Keyword fingerprinting (embed unique natural phrases in generated text)
- Update dashboard status: "Copied" → "Confirmed" when matched
- Handle cases where users modify/reduce generated text before posting
- Requires: Google Business Profile API access, OAuth with business owner account

## 2. AI-Drafted Reply with Owner Approval

- Fetch new Google reviews via API
- Use AI to draft a personalized reply based on review content
- Show drafted reply in admin dashboard for business owner to review
- Owner approves/edits with one click, then reply is posted via API
- Uses `reviews.updateReply` endpoint with owner's OAuth token
- Human-in-the-loop keeps this compliant with Google's policies
- Requires: Google Business Profile API access, OAuth with business owner account
