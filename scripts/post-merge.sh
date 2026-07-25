#!/bin/bash
set -e
npm ci
npm run push --workspace=@workspace/db
npm run seed --workspace=@workspace/scripts
