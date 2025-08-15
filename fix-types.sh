#!/bin/bash

# Fix type casting issues in bilateral-clarifications.ts
sed -i 's/parseInt(page)/parseInt(String(page))/g' src/routes/bilateral-clarifications.ts
sed -i 's/parseInt(limit)/parseInt(String(limit))/g' src/routes/bilateral-clarifications.ts
sed -i 's/total \/ limit/(total as number) \/ (limit as number)/g' src/routes/bilateral-clarifications.ts
sed -i 's/(page - 1) \* limit/((page as number) - 1) \* (limit as number)/g' src/routes/bilateral-clarifications.ts
sed -i 's/queryParams\.push(status)/queryParams.push(String(status))/g' src/routes/bilateral-clarifications.ts
sed -i 's/queryParams\.push(priority)/queryParams.push(String(priority))/g' src/routes/bilateral-clarifications.ts
sed -i 's/queryParams\.push(limit, offset)/queryParams.push(String(limit), String(offset))/g' src/routes/bilateral-clarifications.ts

# Fix file upload type
sed -i 's/for (const file of req\.files)/for (const file of (req.files as any\[\]))/g' src/routes/bilateral-clarifications.ts

# Fix bulk-clarifications.ts
sed -i 's/parseInt(page)/parseInt(String(page))/g' src/routes/bulk-clarifications.ts
sed -i 's/parseInt(limit)/parseInt(String(limit))/g' src/routes/bulk-clarifications.ts
sed -i 's/(page - 1) \* limit/((page as number) - 1) \* (limit as number)/g' src/routes/bulk-clarifications.ts
sed -i 's/Math\.ceil.*\/ limit)/Math.ceil((result.rows\[0\]?.total_count || 0) \/ (limit as number))/g' src/routes/bulk-clarifications.ts
sed -i 's/params\.push(status)/params.push(String(status))/g' src/routes/bulk-clarifications.ts
sed -i 's/params\.push(limit, offset)/params.push(String(limit), String(offset))/g' src/routes/bulk-clarifications.ts

# Fix req.user issues
sed -i 's/req\.user\./req.user!\./g' src/routes/team-email-config.ts
sed -i 's/req\.user\./req.user!\./g' src/routes/bulk-clarifications.ts

# Fix type issues in team-email-config.ts
sed -i 's/encryptedPassword = ImapEmailService\.encryptPassword(imapPassword);/encryptedPassword = ImapEmailService.encryptPassword(imapPassword) || null;/g' src/routes/team-email-config.ts

# Fix updateBulkClarificationStatus
sed -i 's/router\.updateBulkClarificationStatus/updateBulkClarificationStatus/g' src/routes/bulk-clarifications.ts
sed -i 's/await this\.updateBulkClarificationStatus/await updateBulkClarificationStatus/g' src/routes/bulk-clarifications.ts

echo "Type fixes applied!"
