const express = require('express');
const router = express.Router();
const {createLocation, getAllLocations, getLocationById, updateLocation, deleteLocation} = require('../controllers/locationController');
const { verifyToken, ensureStaff } = require('../middlewares/jwtAuth');

// POST /api/locations
router.post('/', verifyToken,ensureStaff, createLocation);

// GET /api/locations
router.get('/', getAllLocations);

// GET /api/locations/:id
router.get('/:id', getLocationById);

// PUT /api/locations/:id
router.patch('/:id', verifyToken,ensureStaff, updateLocation);

// DELETE /api/locations/:id
router.delete('/:id', verifyToken,ensureStaff, deleteLocation);

module.exports = router;
