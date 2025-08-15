#!/bin/bash

# Comprehensive TypeScript fixes

# Fix bulk-clarifications.ts - Replace hasTeamAccess calls
sed -i 's/if (!await hasTeamAccess(req\.user\.id/if (!await teamService.hasTeamAccess(req.user!.id/g' src/routes/bulk-clarifications.ts

# Fix all req.user issues by adding ! assertion
sed -i 's/req\.user\.id/req.user!.id/g' src/routes/bulk-clarifications.ts
sed -i 's/req\.user\.role/req.user!.role/g' src/routes/bulk-clarifications.ts

# Fix type casting for query parameters
sed -i 's/parseInt(String(page))/parseInt(String(page || "1"))/g' src/routes/bulk-clarifications.ts
sed -i 's/parseInt(String(limit))/parseInt(String(limit || "20"))/g' src/routes/bulk-clarifications.ts

# Fix arithmetic operations
sed -i 's/const offset = ((page as number) - 1) \* (limit as number);/const pageNum = parseInt(String(page || "1")); const limitNum = parseInt(String(limit || "20")); const offset = (pageNum - 1) * limitNum;/g' src/routes/bulk-clarifications.ts

# Fix bilateral-clarifications.ts type issues
sed -i 's/parseInt(String(page))/parseInt(String(page || "1"))/g' src/routes/bilateral-clarifications.ts
sed -i 's/parseInt(String(limit))/parseInt(String(limit || "20"))/g' src/routes/bilateral-clarifications.ts

# Fix req.user issues in bilateral-clarifications.ts
sed -i 's/req\.user\.id/req.user!.id/g' src/routes/bilateral-clarifications.ts
sed -i 's/req\.user\.role/req.user!.role/g' src/routes/bilateral-clarifications.ts

# Fix null assignment issues
sed -i 's/updatedCount = result\.rowCount;/updatedCount = result.rowCount || 0;/g' src/routes/bulk-clarifications.ts

# Fix array push issues
sed -i 's/createdItems\.push(itemResult\.rows\[0\]);/createdItems.push(itemResult.rows[0] as any);/g' src/routes/bulk-clarifications.ts

# Fix params.push with proper typing
sed -i 's/params\.push(String(status))/if (status) params.push(String(status));/g' src/routes/bulk-clarifications.ts

echo "Comprehensive fixes applied!"
