#!/bin/zsh
# Ebeveyn bu dosyayı çalıştırdığında yalnızca bu oyunu doğrudan main'e gönderir.
set -eu
cd "$(dirname "$0")"
game_root="$PWD"
repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ "$repo_root" != "$game_root" ]]; then
  git init -b main
fi
git config user.name 'goktugkarpat'
git config user.email 'goktugkarpat@users.noreply.github.com'
if [[ "$(git branch --show-current)" != 'main' ]]; then
  print 'Yayımlamak için önce main dalına geçmelisin.'
  exit 1
fi
command -v gh >/dev/null 2>&1 || { print 'GitHub CLI (gh) gerekli. Önce gh aracını kurmalısın.'; exit 1; }
gh auth status >/dev/null 2>&1 || gh auth login --hostname github.com --git-protocol https --web
if [[ "$(gh api user --jq .login)" != 'goktugkarpat' ]]; then
  print 'Gönderim için aktif GitHub hesabı goktugkarpat olmalı.'
  exit 1
fi
git add -A
git update-index --chmod=+x OYNA.command yayinla.command
if ! git diff --cached --quiet; then
  git commit -m 'Flash Feza: dunyayi kesfet'
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  if gh repo view goktugkarpat/flash-feza-geziyor >/dev/null 2>&1; then
    git remote add origin https://github.com/goktugkarpat/flash-feza-geziyor.git
    git push -u origin main
  else
    gh repo create goktugkarpat/flash-feza-geziyor --public --source . --remote origin --push \
      --description 'Feza ile şimşek gibi koşarak on ülkeyi keşfettiğin Türkçe seslendirmeli üç boyutlu oyun (3–5 yaş).'
  fi
else
  if [[ "$(git remote get-url origin)" != 'https://github.com/goktugkarpat/flash-feza-geziyor.git' ]]; then
    print 'origin adresi Flaş Feza deposuyla eşleşmiyor.'
    exit 1
  fi
  git push -u origin main
fi
if ! gh api repos/goktugkarpat/flash-feza-geziyor/pages >/dev/null 2>&1; then
  gh api -X POST repos/goktugkarpat/flash-feza-geziyor/pages -f 'source[branch]=main' -f 'source[path]=/' >/dev/null
fi
print 'Oyun gönderildi: https://goktugkarpat.github.io/flash-feza-geziyor/'
print 'İlk yayın birkaç dakika sürebilir.'
