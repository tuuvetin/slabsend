#!/bin/sh
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd /Users/samuel/slabsend
exec node node_modules/.bin/next dev
