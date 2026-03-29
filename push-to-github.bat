set PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd

echo ========================================
echo   SILKSPOT - Force Full Push
echo ========================================

cd /d "C:\WWW\skygrid-pro"

git init
git branch -M main 2>nul
git remote remove origin 2>nul
git remote add origin https://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@github.com/uzbekspotter/silkspot.git

echo.
echo Files that will be pushed:
git add -A
git diff --cached --name-only

echo.
echo Committing...
git commit -m "force: full source push with supabase auth" --allow-empty

echo.
echo Pushing...
git push origin main --force

echo.
echo ========================================
echo DONE! Now check:
echo https://github.com/uzbekspotter/silkspot/blob/main/src/components/AuthPage.tsx
echo It should contain: signInWithEmail
echo ========================================
pause
