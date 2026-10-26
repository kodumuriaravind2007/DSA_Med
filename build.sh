#!/usr/bin/env bash
# Exit on error
set -o errexit

python -m pip install --upgrade pip setuptools wheel
pip install --prefer-binary -r requirements.txt
