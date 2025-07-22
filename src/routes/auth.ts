import { Router } from 'express';

const router = Router();

// Placeholder auth routes - these will be migrated to the new architecture
router.post('/login', (req, res) => {
  res.status(501).json({ message: 'Auth routes are being migrated to new architecture' });
});

router.post('/register', (req, res) => {
  res.status(501).json({ message: 'Auth routes are being migrated to new architecture' });
});

export default router;
