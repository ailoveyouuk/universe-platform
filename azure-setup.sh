#!/bin/bash
# Renewables Connect — Azure Infrastructure Setup
# Run this from Terminal after: az login

# ── Variables ──────────────────────────────────────────────────────────────
SUBSCRIPTION="e8c9b476-4af4-4bc1-aa05-00b0ee669cb8"
RG="rg-renewables-connect"
LOCATION="uksouth"

ACR_NAME="rcplatformregistry"          # Container Registry (globally unique)
CONTAINER_ENV="rc-container-env"       # Container Apps environment
APP_PLAN="rc-app-plan"                 # App Service plan (shared by all Next.js apps)
INSIGHTS="rc-app-insights"             # Application Insights
KEYVAULT="rc-platform-kv"             # Key Vault (globally unique)

# App Service names (become *.azurewebsites.net subdomains — must be globally unique)
APP_LEARNER="rc-learner-app"
APP_INSTITUTION="rc-institution-app"
APP_EMPLOYER="rc-employer-app"
APP_ADMIN="rc-admin-app"

# ── Setup ───────────────────────────────────────────────────────────────────
echo "Setting subscription..."
az account set --subscription "$SUBSCRIPTION"

echo "Installing CLI extensions..."
az extension add --name containerapp --upgrade --yes 2>/dev/null || true
az extension add --name application-insights --upgrade --yes 2>/dev/null || true

echo "Registering resource providers (may take a minute)..."
az provider register --namespace microsoft.operationalinsights --wait
az provider register --namespace microsoft.insights --wait
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.ContainerRegistry --wait

# ── Application Insights ────────────────────────────────────────────────────
echo "Creating Application Insights..."
az monitor app-insights component create \
  --app "$INSIGHTS" \
  --location "$LOCATION" \
  --resource-group "$RG" \
  --kind web \
  --output none

# ── Azure Container Registry ────────────────────────────────────────────────
echo "Creating Container Registry..."
az acr create \
  --resource-group "$RG" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --location "$LOCATION" \
  --output none

# ── Container Apps Environment ──────────────────────────────────────────────
echo "Creating Container Apps environment..."
az containerapp env create \
  --name "$CONTAINER_ENV" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --output none

# ── App Service Plan (Linux, B1) ────────────────────────────────────────────
echo "Creating App Service plan..."
az appservice plan create \
  --name "$APP_PLAN" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku B1 \
  --is-linux \
  --output none

# ── Next.js App Services ─────────────────────────────────────────────────────
echo "Creating App Service: Learner platform (rc-v2-app)..."
az webapp create \
  --resource-group "$RG" \
  --plan "$APP_PLAN" \
  --name "$APP_LEARNER" \
  --runtime "NODE:20-lts" \
  --output none

echo "Creating App Service: Institution dashboard..."
az webapp create \
  --resource-group "$RG" \
  --plan "$APP_PLAN" \
  --name "$APP_INSTITUTION" \
  --runtime "NODE:20-lts" \
  --output none

echo "Creating App Service: Employer dashboard..."
az webapp create \
  --resource-group "$RG" \
  --plan "$APP_PLAN" \
  --name "$APP_EMPLOYER" \
  --runtime "NODE:20-lts" \
  --output none

echo "Creating App Service: Admin dashboard..."
az webapp create \
  --resource-group "$RG" \
  --plan "$APP_PLAN" \
  --name "$APP_ADMIN" \
  --runtime "NODE:20-lts" \
  --output none

# ── Key Vault ────────────────────────────────────────────────────────────────
echo "Creating Key Vault..."
az keyvault create \
  --name "$KEYVAULT" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --output none

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "✅ All resources created successfully!"
echo ""
echo "Resources in $RG:"
echo "  Container Registry : $ACR_NAME.azurecr.io"
echo "  Container Apps env : $CONTAINER_ENV"
echo "  App Services       : $APP_LEARNER, $APP_INSTITUTION, $APP_EMPLOYER, $APP_ADMIN"
echo "  App Service URLs   :"
echo "    https://$APP_LEARNER.azurewebsites.net"
echo "    https://$APP_INSTITUTION.azurewebsites.net"
echo "    https://$APP_EMPLOYER.azurewebsites.net"
echo "    https://$APP_ADMIN.azurewebsites.net"
echo "  Key Vault          : $KEYVAULT"
echo "  App Insights       : $INSIGHTS"
echo ""
echo "Next step: run the database connection string setup."
