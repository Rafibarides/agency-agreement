#!/bin/bash
set -e

cd /Users/RBaridesWellbound/Desktop/Wellbound/Code/agency-agreement

REPO="Rafibarides/agency-agreement"

echo "🚀 Setting up Industry-Standard Scrum Board for $REPO"
echo "=================================================="

# ============================================
# STEP 1: CREATE LABELS WITH COLORS
# ============================================
echo ""
echo "📌 Creating Labels..."

# Category labels (by type)
gh label create "type:feature" --color 0E8A16 --description "New feature or enhancement" --force --repo $REPO
gh label create "type:chore" --color FBCA04 --description "Maintenance or housekeeping task" --force --repo $REPO
gh label create "type:spike" --color C5DEF5 --description "Research or investigation task" --force --repo $REPO
gh label create "type:bug" --color D73A4A --description "Something isn't working" --force --repo $REPO

# Area labels (by domain)
gh label create "area:frontend" --color 1D76DB --description "Frontend/UI work" --force --repo $REPO
gh label create "area:backend" --color B60205 --description "Backend/API work" --force --repo $REPO
gh label create "area:ui" --color 5319E7 --description "UI/UX design work" --force --repo $REPO
gh label create "area:api" --color 0052CC --description "API integration" --force --repo $REPO
gh label create "area:data" --color FEF2C0 --description "Data model or schema" --force --repo $REPO
gh label create "area:security" --color D93F0B --description "Security related" --force --repo $REPO
gh label create "area:admin" --color BFDADC --description "Admin functionality" --force --repo $REPO
gh label create "area:pdf" --color 006B75 --description "PDF generation" --force --repo $REPO
gh label create "area:form" --color 7057FF --description "Form functionality" --force --repo $REPO
gh label create "area:signature" --color E99695 --description "Signature capture" --force --repo $REPO
gh label create "area:dashboard" --color 0366D6 --description "Dashboard features" --force --repo $REPO

# Priority labels
gh label create "priority:critical" --color B60205 --description "Must be done ASAP" --force --repo $REPO
gh label create "priority:high" --color D93F0B --description "High priority" --force --repo $REPO
gh label create "priority:medium" --color FBCA04 --description "Medium priority" --force --repo $REPO
gh label create "priority:low" --color 0E8A16 --description "Low priority / nice to have" --force --repo $REPO

# Size/effort labels (T-shirt sizing)
gh label create "size:XS" --color C2E0C6 --description "Extra small (< 2 hours)" --force --repo $REPO
gh label create "size:S" --color 86EFAC --description "Small (2-4 hours)" --force --repo $REPO
gh label create "size:M" --color FEF08A --description "Medium (4-8 hours)" --force --repo $REPO
gh label create "size:L" --color FCA5A5 --description "Large (1-2 days)" --force --repo $REPO
gh label create "size:XL" --color F87171 --description "Extra large (2+ days)" --force --repo $REPO

# Status labels (for visual board tracking)
gh label create "status:blocked" --color B60205 --description "Blocked by dependency" --force --repo $REPO
gh label create "status:needs-review" --color FBCA04 --description "Needs code review" --force --repo $REPO
gh label create "status:ready" --color 0E8A16 --description "Ready to start" --force --repo $REPO

# Tech-specific labels
gh label create "tech:google-sheets" --color 34A853 --description "Google Sheets integration" --force --repo $REPO
gh label create "tech:apps-script" --color 4285F4 --description "Google Apps Script" --force --repo $REPO
gh label create "tech:react" --color 61DAFB --description "React specific" --force --repo $REPO

# Documentation
gh label create "docs" --color 0075CA --description "Documentation" --force --repo $REPO
gh label create "good-first-issue" --color 7057FF --description "Good for newcomers" --force --repo $REPO

echo "✅ Labels created!"

# ============================================
# STEP 2: CREATE MILESTONES (EPICS)
# ============================================
echo ""
echo "🎯 Creating Milestones (Epics)..."

gh api repos/$REPO/milestones -f title="Epic 0: Project setup + foundations" -f description="Initialize project, tooling, config, and base styling" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 1: Global layout + navigation" -f description="Build global shell, nav, and glass component primitives" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 2: Data model + Google Sheets contract" -f description="Define schema, API approach, and implement CRUD" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 3: Form build (UX + validation)" -f description="Build form with all blocks, validation, and persistence" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 4: Hold for signature + APF flow" -f description="PIN modals, hold flow, APF list, and prefill" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 5: Signature capture" -f description="Signature pad, UI, and final submission" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 6: Admin auth + admin table" -f description="Admin login, searchable table, and record detail" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 7: PDF generation" -f description="PDF template, generation, and printing" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 8: Dashboard" -f description="Dashboard metrics and filters" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 9: QA and hardening" -f description="Validation, accessibility, logging, deployment" -f state="open" 2>/dev/null || echo "  Milestone exists"
gh api repos/$REPO/milestones -f title="Epic 10: Documentation + handoff" -f description="README, QA checklist, release notes" -f state="open" 2>/dev/null || echo "  Milestone exists"

echo "✅ Milestones created!"

# ============================================
# STEP 3: CREATE GITHUB PROJECT BOARD
# ============================================
echo ""
echo "📋 Creating GitHub Project Board..."

# Create the project (returns project number)
PROJECT_RESPONSE=$(gh project create --owner Rafibarides --title "Agency Agreement - Sprint Board" --format json 2>/dev/null || echo "exists")

if [ "$PROJECT_RESPONSE" != "exists" ]; then
    PROJECT_NUMBER=$(echo $PROJECT_RESPONSE | grep -o '"number":[0-9]*' | grep -o '[0-9]*')
    echo "  Created project #$PROJECT_NUMBER"
else
    echo "  Project may already exist - check https://github.com/users/Rafibarides/projects"
fi

echo "✅ Project board created!"

# ============================================
# STEP 4: CREATE ALL ISSUES
# ============================================
echo ""
echo "📝 Creating Issues..."

# Helper function to create issue and add to project
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local milestone="$4"
    local size="$5"
    
    echo "  Creating: $title"
    gh issue create \
        --title "$title" \
        --body "$body" \
        --label "$labels" \
        --label "$size" \
        --milestone "$milestone" \
        --repo $REPO
}

# Epic 0: Project setup + foundations
create_issue "T0.1 Repo + tooling bootstrap (React + Vite, JS)" \
"## Description
Initialize Vite React (JavaScript) app, clean default template, add folder structure.

## Acceptance Criteria
- [ ] App runs locally with \`npm run dev\`
- [ ] Routes stubbed: \`/\`, \`/admin/login\`, \`/admin\`, \`/apf\`
- [ ] \`app/public/logo.png\` renders in header

## Technical Notes
- Use Vite with React template (JavaScript)
- Set up folder structure: \`Components/\`, \`Pages/\`, \`utils/\`" \
"type:chore,area:frontend,status:ready" \
"Epic 0: Project setup + foundations" \
"size:S"

create_issue "T0.2 Environment + config strategy" \
"## Description
Add \`.env\` pattern for Google API keys, sheet IDs, and pin/password configs (dev only).

## Acceptance Criteria
- [ ] No secrets committed to repo
- [ ] App reads config from env vars
- [ ] Safe local fallbacks for development
- [ ] \`.env.example\` template provided

## Technical Notes
- Use Vite's \`import.meta.env\` pattern
- Document all required env vars" \
"type:chore,area:frontend" \
"Epic 0: Project setup + foundations" \
"size:S"

create_issue "T0.3 UI system: colors.js single source of truth" \
"## Description
Create \`src/utils/colors.js\` and refactor styles to import from it only.

## Acceptance Criteria
- [ ] Palette matches design spec
- [ ] No hardcoded hex colors remain in codebase
- [ ] Colors exported as named constants

## Technical Notes
- Consider CSS custom properties for runtime theming
- Include dark purple theme colors" \
"type:feature,area:ui" \
"Epic 0: Project setup + foundations" \
"size:XS"

create_issue "T0.4 Icons + base styling" \
"## Description
Install and wire Font Awesome React icons; establish base typography and dark theme defaults.

## Acceptance Criteria
- [ ] FA icons usable throughout app
- [ ] Text defaults to white
- [ ] Dark purple theme applied globally

## Technical Notes
- Use \`@fortawesome/react-fontawesome\`
- Set up base CSS in \`index.css\`" \
"type:chore,area:ui" \
"Epic 0: Project setup + foundations" \
"size:XS"

# Epic 1: Global layout + navigation
create_issue "T1.1 Global layout shell + top glass nav" \
"## Description
Build fixed top nav with logo left and APF button right using glass morphism.

## Acceptance Criteria
- [ ] Nav persists across all routes
- [ ] Logo loads correctly
- [ ] APF button visible on all pages
- [ ] Glass morphism effect applied

## Technical Notes
- Use \`backdrop-filter: blur()\` for glass effect
- Fixed positioning with proper z-index" \
"type:feature,area:frontend,area:ui" \
"Epic 1: Global layout + navigation" \
"size:M"

create_issue "T1.2 Glass component primitives" \
"## Description
Create reusable GlassCard, GlassInput, GlassSelect, GlassCheckbox, GlassButton, Modal.

## Acceptance Criteria
- [ ] Consistent spacing/blur across components
- [ ] Accessible inputs (proper labels, focus states)
- [ ] Components are composable and reusable

## Technical Notes
- Create in \`Components/\` directory
- Use CSS modules or styled-components
- Ensure keyboard navigation works" \
"type:feature,area:ui" \
"Epic 1: Global layout + navigation" \
"size:M"

# Epic 2: Data model + Google Sheets contract
create_issue "T2.1 Define Google Sheets column schema + mapping" \
"## Description
Define canonical sheet column schema and frontend mapping.

## Acceptance Criteria
- [ ] Columns documented in README
- [ ] Frontend state matches sheet columns 1:1
- [ ] Clear naming conventions

## Technical Notes
- Include all form fields, signatures, metadata
- Document which fields are required vs optional" \
"type:feature,area:data,area:backend" \
"Epic 2: Data model + Google Sheets contract" \
"size:M"

create_issue "T2.2 Google API approach + backend decision" \
"## Description
Decide and document secure read/write approach. Recommended: Google Apps Script Web App.

## Acceptance Criteria
- [ ] Architecture documented
- [ ] No Google credentials exposed in browser
- [ ] Security model defined

## Technical Notes
- Apps Script can act as proxy to Sheets
- Consider doGet/doPost web app deployment
- Define auth flow for admin endpoints" \
"type:spike,area:backend,area:security" \
"Epic 2: Data model + Google Sheets contract" \
"size:M"

create_issue "T2.3 Implement Google Apps Script API (Sheets CRUD-lite)" \
"## Description
Build endpoints: upsertHold, finalizeSignatures, listHold, listSigned, search, record.

## Acceptance Criteria
- [ ] Sheet updates correctly via API
- [ ] CORS handled properly
- [ ] Admin auth enforced on protected endpoints
- [ ] Error responses are meaningful

## Technical Notes
- Deploy as web app with 'Anyone' access
- Use ContentService for JSON responses
- Implement proper error handling" \
"type:feature,area:backend,tech:apps-script,tech:google-sheets" \
"Epic 2: Data model + Google Sheets contract" \
"size:L"

create_issue "T2.4 Frontend API client + error handling" \
"## Description
Create \`src/api/sheetsApi.js\` wrapper with validation and error UX.

## Acceptance Criteria
- [ ] All API calls centralized in one module
- [ ] Friendly error messages for users
- [ ] Retry logic for transient failures
- [ ] Loading states handled

## Technical Notes
- Use fetch with async/await
- Create custom error types
- Add request/response logging in dev mode" \
"type:feature,area:frontend,area:api" \
"Epic 2: Data model + Google Sheets contract" \
"size:M"

# Epic 3: Form build (UX + validation)
create_issue "T3.1 Form state manager + draft persistence" \
"## Description
Central form state aligned to sheet columns with localStorage draft persistence.

## Acceptance Criteria
- [ ] Form survives page refresh
- [ ] Draft can be cleared manually
- [ ] State matches sheet column schema

## Technical Notes
- Use React state with useReducer or context
- Debounce localStorage writes
- Add timestamp to drafts" \
"type:feature,area:form,area:frontend" \
"Epic 3: Form build (UX + validation)" \
"size:M"

create_issue "T3.2 Identity block" \
"## Description
Build Name, Title, Worker ID, Training Worker ID logic with animation.

## Acceptance Criteria
- [ ] Required field validation
- [ ] Training ID mirrors Worker ID when checkbox unchecked
- [ ] Smooth reveal animations

## Technical Notes
- Use controlled inputs
- Add visual validation feedback
- Consider debouncing validation" \
"type:feature,area:form" \
"Epic 3: Form build (UX + validation)" \
"size:M"

create_issue "T3.3 Property acknowledgement block" \
"## Description
Checkboxes with conditional device name input.

## Acceptance Criteria
- [ ] Boolean columns mapped correctly to checkboxes
- [ ] Device text column appears conditionally
- [ ] Reveal animation on show/hide

## Technical Notes
- Use GlassCheckbox component
- Animate height with CSS transitions" \
"type:feature,area:form" \
"Epic 3: Form build (UX + validation)" \
"size:M"

create_issue "T3.4 Device metadata block" \
"## Description
Optional Serial Number and Esper ID fields.

## Acceptance Criteria
- [ ] UI clearly shows fields are optional
- [ ] Plain text storage in sheet
- [ ] Validation for format (if any)

## Technical Notes
- Use GlassInput component
- Add helper text for optional fields" \
"type:feature,area:form" \
"Epic 3: Form build (UX + validation)" \
"size:S"

create_issue "T3.5 Exchange flow (conditional)" \
"## Description
Conditional exchange checkbox with returning device name + serial.

## Acceptance Criteria
- [ ] Data stored in \`return_*\` columns
- [ ] Clear visual separation from new device section
- [ ] Conditional visibility based on exchange flag

## Technical Notes
- Prefix return fields clearly
- Add transition animation" \
"type:feature,area:form" \
"Epic 3: Form build (UX + validation)" \
"size:M"

create_issue "T3.6 Agreement confirmation gate" \
"## Description
Three required agreement checkboxes gating progress.

## Acceptance Criteria
- [ ] Cannot proceed without all checked
- [ ] Subtle error UX (not aggressive)
- [ ] Clear visual indication of requirement

## Technical Notes
- Disable submit button until complete
- Consider shake animation on attempted submit" \
"type:feature,area:form" \
"Epic 3: Form build (UX + validation)" \
"size:M"

# Epic 4: Hold for signature + APF flow
create_issue "T4.1 PIN modal component (4-digit)" \
"## Description
Reusable PIN modal for Hold and APF access (PIN: 1234).

## Acceptance Criteria
- [ ] Keyboard-friendly (numpad, enter to submit)
- [ ] Basic lockout after N failed attempts
- [ ] Clear visual feedback on entry

## Technical Notes
- Focus trap inside modal
- Auto-focus first digit
- Clear on close" \
"type:feature,area:frontend,area:security" \
"Epic 4: Hold for signature + APF flow" \
"size:S"

create_issue "T4.2 Hold for Signature button behavior" \
"## Description
PIN-gated hold flow that upserts HOLD record without signatures.

## Acceptance Criteria
- [ ] Sets status=HOLD in sheet
- [ ] Success feedback shown to user
- [ ] No signatures required for HOLD
- [ ] Generates record_key

## Technical Notes
- Call upsertHold API endpoint
- Store record_key for later update" \
"type:feature,area:frontend,area:backend" \
"Epic 4: Hold for signature + APF flow" \
"size:M"

create_issue "T4.3 Duplicate prevention: HOLD upsert rules" \
"## Description
Server-side matching on name + worker_id for HOLD overwrite.

## Acceptance Criteria
- [ ] Stable record_key across updates
- [ ] No duplicate rows created
- [ ] Matching logic documented

## Technical Notes
- Check existing rows before insert
- Use composite key for matching
- Update timestamp on upsert" \
"type:feature,area:backend,area:data" \
"Epic 4: Hold for signature + APF flow" \
"size:L"

create_issue "T4.4 APF page: list HOLD records" \
"## Description
PIN-gated list of HOLD records with search.

## Acceptance Criteria
- [ ] Search by any parameter
- [ ] Row click loads form with data
- [ ] PIN required to access page

## Technical Notes
- Call listHold API endpoint
- Implement client-side filtering
- Use GlassCard for list items" \
"type:feature,area:frontend" \
"Epic 4: Hold for signature + APF flow" \
"size:M"

create_issue "T4.5 Prefill form from HOLD record + edit flow" \
"## Description
Populate form from HOLD record and preserve record_key.

## Acceptance Criteria
- [ ] All fields prefilled correctly
- [ ] Submission updates same row (not new)
- [ ] record_key preserved in state

## Technical Notes
- Pass record data via route state or context
- Clear draft when loading HOLD record" \
"type:feature,area:frontend" \
"Epic 4: Hold for signature + APF flow" \
"size:M"

# Epic 5: Signature capture
create_issue "T5.1 Signature pad component (SVG only)" \
"## Description
Build vector signature pad exporting SVG path strings only.

## Acceptance Criteria
- [ ] Clear button works
- [ ] No image blobs generated
- [ ] SVG path string exportable
- [ ] Touch and mouse support

## Technical Notes
- Use canvas or SVG for drawing
- Export as path d attribute
- Consider react-signature-canvas or similar" \
"type:feature,area:signature,area:frontend" \
"Epic 5: Signature capture" \
"size:L"

create_issue "T5.2 Signature section UI" \
"## Description
Employee + Supervisor signature blocks with editable dates.

## Acceptance Criteria
- [ ] Submit disabled until both signatures complete
- [ ] Dates stored in sheet
- [ ] Clear visual distinction between signers

## Technical Notes
- Default dates to today
- Use date input with calendar" \
"type:feature,area:signature,area:form" \
"Epic 5: Signature capture" \
"size:M"

create_issue "T5.3 Final submission updates HOLD → SIGNED" \
"## Description
Finalize signatures and update existing HOLD row.

## Acceptance Criteria
- [ ] No new row created (updates existing)
- [ ] Status changes to SIGNED
- [ ] updated_at timestamp set

## Technical Notes
- Call finalizeSignatures API
- Validate all required fields before submit
- Clear draft on success" \
"type:feature,area:frontend,area:backend" \
"Epic 5: Signature capture" \
"size:M"

# Epic 6: Admin auth + admin table
create_issue "T6.1 Admin login page" \
"## Description
Admin login with universal credentials and session handling.

## Acceptance Criteria
- [ ] Protected routes redirect to login
- [ ] Logout clears session completely
- [ ] Session persists across refresh

## Technical Notes
- Use localStorage or sessionStorage
- Consider timeout for security
- Add loading state during auth" \
"type:feature,area:admin,area:security" \
"Epic 6: Admin auth + admin table" \
"size:M"

create_issue "T6.2 Admin page: searchable spreadsheet-style list" \
"## Description
Table of SIGNED (optionally HOLD) records with search, sort, pagination.

## Acceptance Criteria
- [ ] Search any column
- [ ] View/PDF action per row
- [ ] Sortable columns
- [ ] Pagination or infinite scroll

## Technical Notes
- Consider react-table or similar
- Implement debounced search
- Show loading skeleton" \
"type:feature,area:admin" \
"Epic 6: Admin auth + admin table" \
"size:L"

create_issue "T6.3 Record detail fetch for PDF view" \
"## Description
Admin record detail fetch for PDF generation.

## Acceptance Criteria
- [ ] Correct data fetched
- [ ] Handles missing optional fields gracefully
- [ ] Loading and error states

## Technical Notes
- Fetch by record_key
- Validate data completeness before PDF" \
"type:feature,area:admin" \
"Epic 6: Admin auth + admin table" \
"size:M"

# Epic 7: PDF generation
create_issue "T7.1 PDF template design (letter format)" \
"## Description
Design print-ready PDF with logo, sections, vector signatures, footer address.

## Acceptance Criteria
- [ ] Works cross-browser
- [ ] No rasterized signatures
- [ ] Letter format (8.5x11)
- [ ] Professional layout

## Technical Notes
- Use CSS print styles or jsPDF
- Test in Chrome, Safari, Firefox
- Include company branding" \
"type:feature,area:pdf" \
"Epic 7: PDF generation" \
"size:L"

create_issue "T7.2 Admin Generate PDF + Print" \
"## Description
Row action to generate PDF and print.

## Acceptance Criteria
- [ ] Browser print dialog opens
- [ ] Filename includes name + date
- [ ] One-click generation

## Technical Notes
- Use window.print() or PDF library
- Set document title for filename
- Add print button to row actions" \
"type:feature,area:pdf,area:admin" \
"Epic 7: PDF generation" \
"size:M"

create_issue "T7.3 Data formatting rules in PDF" \
"## Description
Conditional rendering of optional fields and checkbox display.

## Acceptance Criteria
- [ ] No empty sections shown
- [ ] Labels match dropdown options
- [ ] Checkboxes displayed appropriately

## Technical Notes
- Filter null/empty values
- Map internal values to display labels
- Use consistent date formatting" \
"type:feature,area:pdf" \
"Epic 7: PDF generation" \
"size:M"

# Epic 8: Dashboard
create_issue "T8.1 Dashboard metrics" \
"## Description
Dashboard with signed agreement count and Esper ID quick view.

## Acceptance Criteria
- [ ] Accurate metrics
- [ ] Handles empty state gracefully
- [ ] Fast loading

## Technical Notes
- Fetch aggregated data from API
- Add refresh button
- Show last updated time" \
"type:feature,area:dashboard" \
"Epic 8: Dashboard" \
"size:M"

create_issue "T8.2 Dashboard filters" \
"## Description
Filters by date range, title, device, exchange flag.

## Acceptance Criteria
- [ ] Filters sync across views
- [ ] Clear all filters option
- [ ] URL reflects filter state

## Technical Notes
- Use URL params for shareable links
- Debounce filter changes
- Remember last filter state" \
"type:feature,area:dashboard" \
"Epic 8: Dashboard" \
"size:M"

# Epic 9: QA and hardening
create_issue "T9.1 Form validation + edge cases" \
"## Description
Validate numeric IDs, training logic, agreements, signatures.

## Acceptance Criteria
- [ ] Clear error messages
- [ ] No invalid data written to sheet
- [ ] Edge cases handled (empty, special chars)

## Technical Notes
- Add validation to all inputs
- Test boundary conditions
- Sanitize before API calls" \
"type:feature,area:form" \
"Epic 9: QA and hardening" \
"size:L"

create_issue "T9.2 Accessibility pass" \
"## Description
ARIA labels, focus traps, keyboard nav, contrast checks.

## Acceptance Criteria
- [ ] Mouse-free usability
- [ ] Modal focus trap works
- [ ] Screen reader compatible
- [ ] Meets WCAG AA contrast

## Technical Notes
- Use semantic HTML
- Add aria-labels to icons
- Test with VoiceOver/NVDA" \
"type:chore" \
"Epic 9: QA and hardening" \
"size:M"

create_issue "T9.3 Logging + monitoring hooks" \
"## Description
Minimal client logging and Apps Script server logs.

## Acceptance Criteria
- [ ] Failures are debuggable
- [ ] No excess PII in logs
- [ ] Console logs removed in prod

## Technical Notes
- Use console.error for errors only
- Add try/catch with logging
- Consider error boundary in React" \
"type:chore,area:backend" \
"Epic 9: QA and hardening" \
"size:M"

create_issue "T9.4 Deployment + runtime config" \
"## Description
Deploy SPA and Apps Script; document deployment steps.

## Acceptance Criteria
- [ ] Production site is live
- [ ] Admin and API functional
- [ ] Deployment documented

## Technical Notes
- Deploy SPA to Vercel/Netlify/GitHub Pages
- Deploy Apps Script as web app
- Document environment setup" \
"type:chore" \
"Epic 9: QA and hardening" \
"size:M"

# Epic 10: Documentation + handoff
create_issue "T10.1 README: setup + sheet schema + operations" \
"## Description
Document env vars, schema, Apps Script deploy, admin creds + pin.

## Acceptance Criteria
- [ ] New dev runs locally in <15 min
- [ ] All config documented
- [ ] Troubleshooting section

## Technical Notes
- Include example .env
- Add architecture diagram
- Document API endpoints" \
"type:chore,docs" \
"Epic 10: Documentation + handoff" \
"size:M"

create_issue "T10.2 QA checklist + release notes" \
"## Description
Provide test checklist and versioned release notes.

## Acceptance Criteria
- [ ] Covers hold/APF flow
- [ ] Covers duplicate prevention
- [ ] Covers PDF generation
- [ ] Covers admin auth

## Technical Notes
- Create TESTING.md
- Add CHANGELOG.md
- Include manual test steps" \
"type:chore,docs" \
"Epic 10: Documentation + handoff" \
"size:S"

echo ""
echo "✅ All issues created!"

# ============================================
# STEP 5: ADD ISSUES TO PROJECT
# ============================================
echo ""
echo "🔗 To add issues to your project board, visit:"
echo "   https://github.com/Rafibarides/agency-agreement/issues"
echo "   Select all issues → Add to project → Select your project"
echo ""
echo "   Or use: gh project item-add <PROJECT_NUMBER> --owner Rafibarides --url <ISSUE_URL>"

echo ""
echo "=================================================="
echo "🎉 SCRUM BOARD SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "📊 View your board at:"
echo "   Issues:     https://github.com/Rafibarides/agency-agreement/issues"
echo "   Milestones: https://github.com/Rafibarides/agency-agreement/milestones"
echo "   Projects:   https://github.com/users/Rafibarides/projects"
echo ""
echo "💡 Next steps:"
echo "   1. Go to Projects and customize columns (Backlog, Todo, In Progress, Review, Done)"
echo "   2. Drag issues into appropriate columns"
echo "   3. Set sprint dates on milestones"
echo "   4. Add team members as assignees"
echo ""

