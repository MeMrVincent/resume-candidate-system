# 一键重建 v2 数据库并导入（在 electron 目录运行 .\reimport.ps1）
# One-click rebuild of the v2 database and import (run .\reimport.ps1 in the electron directory)
# v2 データベースを一括で再構築してインポートする（electron ディレクトリで .\reimport.ps1 を実行）
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Remove-Item ..\data\recruitment.db, ..\data\recruitment.db-wal, ..\data\recruitment.db-shm -ErrorAction SilentlyContinue
npm test
node src/import_runner.js E:\resume-system\resume-parsing-system\complete-v3 --strict
node src/report_import_warnings.js
