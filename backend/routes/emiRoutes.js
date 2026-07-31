const express = require('express');
const router = express.Router();
const emiController = require('../controllers/emiController');
const { protect, softProtect, authorizeRoles } = require('../middlewares/authMiddleware');

// Get active EMI plans (using softProtect so guests can view available plans on detail page)
router.get('/plans', softProtect, emiController.getEmiPlans);

// Admin-only endpoints for EMI plans
router.post('/plans', protect, authorizeRoles('admin'), emiController.createEmiPlan);
router.put('/plans/:id', protect, authorizeRoles('admin'), emiController.updateEmiPlan);
router.delete('/plans/:id', protect, authorizeRoles('admin'), emiController.deleteEmiPlan);

// Calculate EMI schedule details for cart amount (using softProtect so guests/buyers can see calculations)
router.post('/calculate', softProtect, emiController.calculateEmi);

// Get my EMI schedules (Buyer)
router.get('/my-schedules', protect, emiController.getMyEmiSchedules);

// Get all EMI schedules (Admin)
router.get('/admin-schedules', protect, authorizeRoles('admin'), emiController.getAdminEmiSchedules);

// Get specific schedule details
router.get('/schedule/:id', protect, emiController.getEmiScheduleById);

// Pay specific installment
router.post('/schedule/:scheduleId/pay/:installmentNum', protect, emiController.payInstallment);

module.exports = router;
