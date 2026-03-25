#!/bin/bash
set -e

echo ">>> Deploying LeazrApp to VPS..."
git add -A && git commit -m "Deploy $(date '+%Y-%m-%d %H:%M')" && git push origin main
ssh -i ~/.ssh/id_itcmdm root@76.13.0.189 "cd /opt/LeazrApp && bash deploy/deploy.sh"

echo ">>> Deployed. App available at https://app.leazr.co"
