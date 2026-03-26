@echo off
echo Initializing Backend Database...
echo.
cd /d "%~dp0backend"
call npx wrangler d1 execute business-suite-db --local --file=src/db/schema.sql
echo.
echo Applying migrations...
call npx wrangler d1 execute business-suite-db --local --file=src/db/migrations/001_add_platform_user_id.sql 2>nul
call npx wrangler d1 execute business-suite-db --local --file=src/db/migrations/002_add_oauth_pending_pages.sql 2>nul
echo.
echo Database initialized successfully!
pause
