<#
.SYNOPSIS
    Deploy completo do My Driver na AWS.
.DESCRIPTION
    1. Build do frontend Angular (production)
    2. Build da API para Lambda
    3. Instala dependencias de producao no bundle Lambda
    4. Deploy da infraestrutura via SAM
    5. Sync dos arquivos do frontend para S3
    6. Invalidacao do cache do CloudFront
.PARAMETER StackName
    Nome do stack CloudFormation (default: my-driver)
.PARAMETER Region
    Regiao AWS (default: us-east-1)
.PARAMETER SkipBuild
    Pula os passos de build (usa artefatos existentes)
.EXAMPLE
    .\scripts\deploy.ps1
    .\scripts\deploy.ps1 -StackName my-driver-staging -Region sa-east-1
#>
param(
    [string]$StackName = "my-driver",
    [string]$Region = "us-east-1",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Assert-Command($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERRO: '$cmd' nao encontrado. Instale antes de continuar." -ForegroundColor Red
        exit 1
    }
}

# --- Pre-checks ---
Write-Step "Verificando pre-requisitos"
Assert-Command "node"
Assert-Command "npx"
Assert-Command "aws"
Assert-Command "sam"

# --- Build ---
if (-not $SkipBuild) {
    Write-Step "Build do frontend (web-app)"
    npx nx build web-app --configuration production
    if ($LASTEXITCODE -ne 0) { Write-Host "ERRO: Build do web-app falhou" -ForegroundColor Red; exit 1 }

    Write-Step "Build da API (Lambda)"
    $env:BUILD_TARGET = "lambda"
    npx nx build api --skip-nx-cache
    if ($LASTEXITCODE -ne 0) { Write-Host "ERRO: Build da API falhou" -ForegroundColor Red; exit 1 }
    Remove-Item Env:BUILD_TARGET

    Write-Step "Instalando dependencias de producao no bundle Lambda"
    Push-Location dist/apps/api-lambda
    npm install --omit=dev --ignore-scripts
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Write-Host "ERRO: npm install falhou" -ForegroundColor Red; exit 1 }
}

# --- Deploy infraestrutura ---
Write-Step "Deploy da infraestrutura (SAM)"
sam deploy `
    --template-file infra/template.yml `
    --stack-name $StackName `
    --region $Region `
    --capabilities CAPABILITY_IAM `
    --resolve-s3 `
    --no-confirm-changeset `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) { Write-Host "ERRO: sam deploy falhou" -ForegroundColor Red; exit 1 }

# --- Obter outputs do stack ---
Write-Step "Obtendo outputs do stack"
$outputs = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output json | ConvertFrom-Json

$webBucket = ($outputs | Where-Object { $_.OutputKey -eq "WebAppBucketName" }).OutputValue
$cfDistId  = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontDistributionId" }).OutputValue
$cfUrl     = ($outputs | Where-Object { $_.OutputKey -eq "CloudFrontUrl" }).OutputValue

if (-not $webBucket) {
    Write-Host "ERRO: Nao foi possivel obter o nome do bucket S3" -ForegroundColor Red
    exit 1
}

# --- Sync frontend ---
Write-Step "Sync dos arquivos do frontend para S3 ($webBucket)"
aws s3 sync dist/apps/web-app/browser "s3://$webBucket" `
    --delete `
    --region $Region

if ($LASTEXITCODE -ne 0) { Write-Host "ERRO: S3 sync falhou" -ForegroundColor Red; exit 1 }

# --- Invalidar cache CloudFront ---
Write-Step "Invalidando cache do CloudFront ($cfDistId)"
aws cloudfront create-invalidation `
    --distribution-id $cfDistId `
    --paths "/*" `
    --region $Region | Out-Null

# --- Resultado ---
Write-Host "`n" -NoNewline
Write-Host "============================================" -ForegroundColor Green
Write-Host " Deploy concluido com sucesso!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host " URL: $cfUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host " Stack:        $StackName"
Write-Host " Regiao:       $Region"
Write-Host " Web Bucket:   $webBucket"
Write-Host " CloudFront:   $cfDistId"
Write-Host ""
