# Light API Deployment Fix

## Problem
The `light-api` service was not starting properly after deployment with `quick-deploy.sh`. The issue was that the `dotenv` package and other dependencies needed to be reinstalled manually on the production server after each deployment.

## Solution
1. Created a separate `light-api-package.json` file specifically for the light-api service dependencies
2. Modified the `quick-deploy.sh` script to:
   - Copy the `light-api-package.json` file to the deployment directory
   - Install the light-api dependencies separately before starting the PM2 services
   - As a fallback, reinstall the necessary packages (`dotenv`, `express`, `axios`, `morgan`, `body-parser`) if the package.json file is not found

## How It Works
During deployment, the script now checks if `light-api-package.json` exists and uses it to install the dependencies in a separate directory. It then copies the installed modules back to the main `node_modules` directory to ensure the light-api service can find them.

This approach ensures that the light-api service always has its required dependencies properly installed, without needing manual intervention after deployment.

## Testing
After deployment, you can verify that the light-api service is running correctly with:

```bash
ssh root@10.0.0.2 'pm2 status'
```

Or test the API directly:

```bash
ssh root@10.0.0.2 './test-willi-mako-light-api.sh'
```
