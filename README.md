# Allergen Information Infrastructure 
An open, lightweight infrastructure for building local restaurant allergen-information directories.

AllergyLocate.org is the first implementation of the system, currently focused on restaurant allergen information in the tri-state area (Northeast United States)

The goal is not just to maintain one directory, but to provide a model that other teams can adapt and deploy for their own communities.

**Live site:** https://allergylocate.org

## Architecture:

Allergen Information Infrastructure:

Local submission via Frontend --> Backend API (validation, scoring, storage) --> Team Leaderboard (point system, rankings) --> Human Review (evidence quotes, link verification) --> Local Database --> Public Directory (Frontend)

The system includes data collection, automated processing, human review, and public distribution.

## Components
- Database: stores restaurants, submissions, review status, and team information (+ an aesthetically engaging leaderboard)
- Apps Script backend: API layer for scoring, validation, storage, and retrieval
- Team Tool: private interface for reviewing and approving submissions
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

- 94+ restaurant records
- automated submission scoring
- review states
- private team moderation tool
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
