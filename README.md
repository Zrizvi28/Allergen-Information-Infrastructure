# Allergen Information Infrastructure 
An open, lightweight infrastructure for building local restaurant allergen-information directories. AllergyLocate.org is the first implementation of the system, a US-wide index of allergen disclosures, primarily national chains, with a concentrated set of independent restaurants in NYC specifically. The goal is not just to maintain one directory, but to provide a model that other teams can adapt and deploy for their own communities.

**Live site:** https://allergylocate.org

## Architecture:

Allergen Information Infrastructure:

Team Tool (submission form, live score preview) → Backend API / Google Apps Script (calculates Transparency Score, writes record to Google Sheet as "Needs Review") → Google Sheet (Restaurants + Team tabs, cloud-hosted) → Human Review (evidence quotes checked against the real source document, one-click Approve) → Public Directory/Live Site (auto-fetches every "Approved" restaurant from the Backend API on page load)

The system includes data collection, automated processing, human review, and public distribution.

## Components
- Database: stores restaurants, submissions, review status, and team information (+ an aesthetically engaging leaderboard)
- Apps Script backend: API layer for scoring, storage, and retrieval
- Team Tool: private interface for submitting new restaurants, searching existing ones, and checking the leaderboard
- Google Sheet: also where human review and one-click approval happen via a custom menu
- Public frontend: dynamically displays approved records from the backend

The current implementation uses Google Sheets + Apps Script + HTML/CSS/JavaScript, requiring no paid infrastructure. Any team can deploy their own version without excessive time or resources.

## Replicable Model
The architecture is intentionally designed to be easily replicated and spread.

Basic workflow:

Collect → Score → Review → Approve → Publish

Teams can independently define:

their geographic scope
allergen categories
scoring criteria
review requirements
database structure
frontend design
local regulatory considerations

Local teams should be able to maintain trustworthy allergen-information infrastructure without needing expensive software or a dedicated engineering team.

## Current Implementation

AllergyLocate current features include:

- 94 restaurant records
- automated submission scoring
- review states
- private team submission tool (separate from the Sheet-based review/approval step)
- dynamically populated public directory
- restaurant-source verification
- allergen-information transparency scoring

## Policy context
This project supports NJ Senate Bill S3394, which would require restaurants to
publicly disclose allergen information. This database demonstrates that the
infrastructure for allergen transparency already exists.

## Status
Active Project - 2026

Author: Zamin Abbas Rizvi — FARE Teen Advisory Group member, 2026

Disclaimer: AllergyLocate is an independent directory. Information comes from public sources and may be incomplete or outdated. Always verify allergen information directly with the restaurant.
