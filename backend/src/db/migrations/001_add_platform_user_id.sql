-- Migration 001: Add platform_user_id to maas_connected_accounts
-- This field stores the platform-specific user/page identifier needed for API calls.
-- LinkedIn: urn:li:member:{id}   — required for creating posts as the author
-- Facebook: {page-id}            — page to post on behalf of
-- Instagram: {ig-user-id}        — Instagram Business Account ID
-- Twitter:   not required        — user context from bearer token

ALTER TABLE maas_connected_accounts ADD COLUMN platform_user_id TEXT;
